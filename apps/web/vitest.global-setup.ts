// Migrates the test database once, before the database tests (which run in parallel).
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;
  const pool = new Pool({ connectionString: url });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "../../db/migrations" });
  } finally {
    await pool.end();
  }
}
