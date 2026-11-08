// Where an entry's photos live in R2. Shared by the web app and the scoring Worker.
// - display: up to 2560px on the long side, uploaded with the entry
// - thumb: up to 480px, uploaded with the entry
// - share: up to 1800px, for the Share Page; made on the Worker the first time it's needed
export const PHOTO_VARIANTS = ["display", "thumb", "share"] as const;
export type PhotoVariant = (typeof PHOTO_VARIANTS)[number];

export function photoKey(userId: string, entryId: string, variant: PhotoVariant): string {
  return `entries/${userId}/${entryId}/${variant}.jpg`;
}

/** Every R2 key an entry's photos may use, for deleting the entry. */
export function entryPhotoKeys(userId: string, entryId: string): string[] {
  return PHOTO_VARIANTS.map((variant) => photoKey(userId, entryId, variant));
}
