// Image encoding on the Worker, with jSquash's WebAssembly builds of the Squoosh codecs
// (@jsquash/png, @jsquash/jpeg = MozJPEG, @jsquash/resize; Apache-2.0). next/og only draws PNGs,
// and Workers have no canvas, so this is how share images become small JPEGs.
//
// Workers can't compile WebAssembly from bytes at run time, so each codec's .wasm file is imported
// as a precompiled module (`?module`) and handed to the codec's init(). The bundler (Turbopack,
// then OpenNext and wrangler) ships those modules with the Worker.
import decodeJpeg, { init as initJpegDecode } from "@jsquash/jpeg/decode";
import encodeJpeg, { init as initJpegEncode } from "@jsquash/jpeg/encode";
import decodePng, { init as initPngDecode } from "@jsquash/png/decode";
import resize, { initResize } from "@jsquash/resize";
import jpegDecWasm from "@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm?module";
import jpegEncWasm from "@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm?module";
import pngDecWasm from "@jsquash/png/codec/pkg/squoosh_png_bg.wasm?module";
import resizeWasm from "@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm?module";
import { fitWithin } from "@/lib/photo-size";

/** JPEG quality for everything the app encodes on the server (PRD 6.6: compressed copies). */
export const JPEG_QUALITY = 80;

// Workers (and Node) have no ImageData; the codecs only need its three fields.
if (typeof globalThis.ImageData === "undefined") {
  class ImageDataPolyfill {
    readonly colorSpace = "srgb";
    constructor(
      public data: Uint8ClampedArray,
      public width: number,
      public height: number,
    ) {}
  }
  (globalThis as { ImageData?: unknown }).ImageData = ImageDataPolyfill;
}

// The jpeg inits accept a precompiled module as their first argument; their types omit it.
type InitWithModule = (module: WebAssembly.Module) => Promise<unknown>;

let ready: Promise<unknown> | undefined;
function init() {
  ready ??= Promise.all([
    (initJpegDecode as InitWithModule)(jpegDecWasm),
    (initJpegEncode as InitWithModule)(jpegEncWasm),
    initPngDecode(pngDecWasm),
    initResize(resizeWasm),
  ]).catch((error) => {
    ready = undefined;
    throw error;
  });
  return ready;
}

/** A PNG (as next/og draws it) re-encoded as a JPEG. */
export async function pngToJpeg(png: ArrayBuffer, quality = JPEG_QUALITY): Promise<ArrayBuffer> {
  await init();
  return encodeJpeg(await decodePng(png), { quality });
}

/** A JPEG scaled down (never up) so its longer edge is at most maxEdge, re-encoded. */
export async function resizeJpeg(
  jpeg: ArrayBuffer,
  maxEdge: number,
  quality = JPEG_QUALITY,
): Promise<{ jpeg: ArrayBuffer; width: number; height: number }> {
  await init();
  const image = await decodeJpeg(jpeg);
  const size = fitWithin(image.width, image.height, maxEdge);
  const scaled =
    size.width === image.width && size.height === image.height
      ? image
      : await resize(image, { ...size, method: "lanczos3", fitMethod: "stretch", premultiply: false, linearRGB: true });
  return { jpeg: await encodeJpeg(scaled, { quality }), ...size };
}
