import type { Location } from "@/lib/entry-input";

export function formatTakenAt(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(date);
}

// Coordinates to about 100 m, which is plenty to recognise a place.
export function formatLocation(location: Location): string {
  const lat = `${Math.abs(location.latitude).toFixed(3)}° ${location.latitude >= 0 ? "N" : "S"}`;
  const lng = `${Math.abs(location.longitude).toFixed(3)}° ${location.longitude >= 0 ? "E" : "W"}`;
  return `${lat}, ${lng}`;
}
