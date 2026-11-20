// Loads GeoNames towns into `places`, then fills in place names and time zones for existing
// entries (Phase 4e part 6). Run once per database, and again whenever you want fresher data:
//   scripts/staging-db.sh node scripts/load-places.mjs        (staging)
//   DATABASE_URL=postgres://... node scripts/load-places.mjs  (anywhere else)
//
// Data: GeoNames (https://www.geonames.org), CC BY 4.0. The app credits it on the You screen.
// cities1000 = every populated place with 1,000+ people (about 150,000), without neighbourhoods
// (PPLX), historical or abandoned places. Needs `unzip` on the PATH.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";

const BASE = "https://download.geonames.org/export/dump/";
const SKIP_FEATURES = new Set(["PPLX", "PPLH", "PPLQ", "PPLW", "PPLCH"]);
// Keep in step with placeLabel in apps/web/src/lib/places.ts.
const REGION_COUNTRIES = new Set(["US", "CA", "AU", "GB"]);
const MAX_PLACE_DISTANCE_METERS = 50_000;

function label({ name, region, country_code, country }) {
  const second = REGION_COUNTRIES.has(country_code) ? (region ?? country) : (country ?? region);
  return second && second !== name ? `${name}, ${second}` : name;
}

async function download(file) {
  const response = await fetch(BASE + file);
  if (!response.ok) throw new Error(`Couldn't download ${file}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL (or run through scripts/staging-db.sh).");

console.log("Downloading GeoNames files…");
const dir = mkdtempSync(join(tmpdir(), "geonames-"));
try {
  const [zip, admin1Text, countryText] = await Promise.all([
    download("cities1000.zip"),
    download("admin1CodesASCII.txt").then((b) => b.toString("utf8")),
    download("countryInfo.txt").then((b) => b.toString("utf8")),
  ]);
  writeFileSync(join(dir, "cities1000.zip"), zip);
  const citiesText = execFileSync("unzip", ["-p", join(dir, "cities1000.zip"), "cities1000.txt"], { maxBuffer: 512 * 1024 * 1024 }).toString("utf8");

  const regions = new Map(admin1Text.split("\n").filter(Boolean).map((line) => {
    const [code, name] = line.split("\t");
    return [code, name];
  }));
  const countries = new Map(countryText.split("\n").filter((l) => l && !l.startsWith("#")).map((line) => {
    const cols = line.split("\t");
    return [cols[0], cols[4]];
  }));

  const rows = [];
  for (const line of citiesText.split("\n")) {
    if (!line) continue;
    const c = line.split("\t");
    if (SKIP_FEATURES.has(c[7])) continue;
    rows.push({
      id: Number(c[0]),
      name: c[1],
      latitude: Number(c[4]),
      longitude: Number(c[5]),
      countryCode: c[8],
      region: regions.get(`${c[8]}.${c[10]}`) ?? null,
      country: countries.get(c[8]) ?? null,
      population: Number(c[14]) || 0,
      timeZone: c[17] || null,
    });
  }
  console.log(`Parsed ${rows.length} places.`);

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE places");
    const BATCH = 1000;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const values = [];
      const params = [];
      batch.forEach((r, j) => {
        const p = j * 9;
        values.push(`($${p + 1}, $${p + 2}, $${p + 3}, $${p + 4}, $${p + 5}, $${p + 6}, $${p + 7}, ST_SetSRID(ST_MakePoint($${p + 8}, $${p + 9}), 4326))`);
        params.push(r.id, r.name, r.region, r.countryCode, r.country, r.population, r.timeZone, r.longitude, r.latitude);
      });
      await client.query(
        `INSERT INTO places (id, name, region, country_code, country, population, time_zone, location) VALUES ${values.join(", ")}`,
        params,
      );
    }
    await client.query("COMMIT");
    console.log(`Loaded ${rows.length} places.`);

    // Existing entries with a location: the nearest town's name (unless the owner typed one) and
    // its time zone. The same query as nearestPlace in apps/web/src/lib/places.ts.
    const { rows: entries } = await client.query(
      "SELECT id, ST_X(location) AS lng, ST_Y(location) AS lat, place_name, time_zone FROM entries WHERE location IS NOT NULL AND (place_name IS NULL OR time_zone IS NULL)",
    );
    let named = 0;
    for (const entry of entries) {
      const { rows: [place] } = await client.query(
        `SELECT name, region, country_code, country, time_zone,
                ST_DistanceSphere(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)) AS meters
         FROM places ORDER BY location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326) LIMIT 1`,
        [entry.lng, entry.lat],
      );
      if (!place) continue;
      const name = Number(place.meters) <= MAX_PLACE_DISTANCE_METERS ? label(place) : null;
      await client.query("UPDATE entries SET place_name = COALESCE(place_name, $2), time_zone = COALESCE(time_zone, $3) WHERE id = $1", [
        entry.id,
        name,
        place.time_zone,
      ]);
      if (name && !entry.place_name) named++;
    }
    // Entries without a location: the time zone of the phone that shared them, if they were shared.
    const shared = await client.query(
      "UPDATE entries SET time_zone = shares.time_zone FROM shares WHERE shares.entry_id = entries.id AND entries.time_zone IS NULL",
    );
    console.log(`Named ${named} of ${entries.length} entries with a location; ${shared.rowCount} more got a time zone from their share.`);
  } finally {
    await client.end();
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
