// Runs in the browser. Turns a picked photo into the two JPEGs the app stores, and reads the
// date and location from its metadata so the user can confirm or remove them before saving.
// Re-encoding through a canvas drops all metadata, so the original GPS data is never uploaded.
import exifr from "exifr";
import type { Location } from "@/lib/entry-input";
import { fitWithin } from "@/lib/photo-size";

export const DISPLAY_EDGE = 2560;
export const THUMB_EDGE = 480;

export type PreparedPhoto = {
  photo: Blob;
  thumb: Blob;
  width: number;
  height: number;
  previewUrl: string;
  takenAt: Date | null;
  location: Location | null;
};

export class UnsupportedPhotoError extends Error {}

async function readMetadata(file: File): Promise<{ takenAt: Date | null; location: Location | null }> {
  try {
    const [tags, gps] = await Promise.all([
      exifr.parse(file, ["DateTimeOriginal"]).catch(() => null),
      exifr.gps(file).catch(() => null),
    ]);
    const takenAt = tags?.DateTimeOriginal instanceof Date ? tags.DateTimeOriginal : null;
    const location =
      gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)
        ? { latitude: gps.latitude, longitude: gps.longitude }
        : null;
    return { takenAt, location };
  } catch {
    return { takenAt: null, location: null };
  }
}

function encode(bitmap: ImageBitmap, maxEdge: number, quality: number) {
  const size = fitWithin(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new UnsupportedPhotoError("This browser can't process photos.");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  return new Promise<{ blob: Blob; width: number; height: number }>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve({ blob, ...size }) : reject(new UnsupportedPhotoError("Couldn't process this photo."))),
      "image/jpeg",
      quality,
    ),
  );
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  let bitmap: ImageBitmap;
  try {
    // Applies the photo's orientation, so portrait shots stay upright.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new UnsupportedPhotoError(
      "This browser can't open that photo format. Try a JPEG, or pick the photo from your phone.",
    );
  }
  try {
    const [display, thumb, metadata] = await Promise.all([
      encode(bitmap, DISPLAY_EDGE, 0.85),
      encode(bitmap, THUMB_EDGE, 0.8),
      readMetadata(file),
    ]);
    return {
      photo: display.blob,
      thumb: thumb.blob,
      width: display.width,
      height: display.height,
      previewUrl: URL.createObjectURL(display.blob),
      ...metadata,
    };
  } finally {
    bitmap.close();
  }
}
