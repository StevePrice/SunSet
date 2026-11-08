import decodeJpeg, { init } from "@jsquash/jpeg/decode";
// Workers can't fetch wasm at runtime; Wrangler bundles it as a compiled module.
import JPEG_DECODER from "../../../node_modules/@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm";
import { downscale, type Rgba } from "@sunset/scoring";

let ready: Promise<unknown> | null = null;
// One isolate serves concurrent messages within a 128 MB limit, and a full-size decode takes
// ~20–35 MB, so decodes run one at a time.
let queue: Promise<unknown> = Promise.resolve();

/** Decodes a JPEG and returns it downscaled for analysis; the full-size pixels are dropped. */
export function decodeForAnalysis(jpeg: ArrayBuffer): Promise<Rgba> {
  const run = queue.then(async () => {
    ready ??= init(JPEG_DECODER);
    await ready;
    const image = await decodeJpeg(jpeg);
    return downscale({ data: image.data, width: image.width, height: image.height });
  });
  queue = run.catch(() => undefined);
  return run;
}
