// Scales width × height down (never up) so the longer edge is at most maxEdge.
export function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** The Share Page's photo: 1600–2000px on the long side (PRD 6.6), made from the display photo. */
export const SHARE_PHOTO_EDGE = 1800;
