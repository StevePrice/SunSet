// The copyright line every screen and email ends with (PRD 7, "Copyright footer"). The year is the
// current one, so it doesn't go stale; on prerendered pages it's the year of the last deploy.
export function copyrightLine(year = new Date().getFullYear()): string {
  return `© ${year} Sunset Soul. All rights reserved.`;
}
