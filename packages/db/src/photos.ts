// Where an entry's photos live in R2. Shared by the web app and the scoring Worker.
export type PhotoVariant = "display" | "thumb";

export function photoKey(userId: string, entryId: string, variant: PhotoVariant): string {
  return `entries/${userId}/${entryId}/${variant}.jpg`;
}
