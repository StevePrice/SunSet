import { customType } from "drizzle-orm/pg-core";

export type LngLat = { x: number; y: number };

// A WGS 84 point (SRID 4326). Drizzle's built-in `geometry` column drops the SRID.
export const point4326 = customType<{ data: LngLat; driverData: string }>({
  dataType: () => "geometry(Point,4326)",
  toDriver: ({ x, y }) => `SRID=4326;POINT(${x} ${y})`,
  fromDriver: (hex) => parsePointEwkb(hex),
});

// Postgres returns geometry as hex-encoded (E)WKB: byte order, type (with an SRID flag), the
// optional SRID, then x and y as doubles.
export function parsePointEwkb(hex: string): LngLat {
  const bytes = new Uint8Array(hex.match(/../g)!.map((b) => parseInt(b, 16)));
  const view = new DataView(bytes.buffer);
  const littleEndian = view.getUint8(0) === 1;
  const type = view.getUint32(1, littleEndian);
  if ((type & 0xff) !== 1) throw new Error("Expected a PostGIS point.");
  const offset = type & 0x20000000 ? 9 : 5;
  return { x: view.getFloat64(offset, littleEndian), y: view.getFloat64(offset + 8, littleEndian) };
}
