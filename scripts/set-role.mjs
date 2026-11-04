// Gives an account a role ("admin" or "user").
//   DATABASE_URL=... node scripts/set-role.mjs someone@example.com admin
import { createRequire } from "node:module";

const [email, role] = process.argv.slice(2);
if (!email || !["admin", "user"].includes(role)) {
  console.error("Usage: node scripts/set-role.mjs <email> <admin|user>");
  process.exit(1);
}
const { Client } = createRequire(new URL("../apps/web/package.json", import.meta.url))("pg");
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const { rows } = await client.query("update users set role = $2 where lower(email) = lower($1) returning email, role", [email, role]);
console.log(rows.length ? `${rows[0].email} is now ${rows[0].role}.` : `No account with the email ${email}.`);
await client.end();
