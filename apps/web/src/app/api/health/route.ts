import { connection } from "next/server";
import { withDb } from "@/lib/db";
import { checkHealth } from "@/lib/health";

export async function GET() {
  await connection();
  const report = await checkHealth(() =>
    withDb(async (client) => {
      const result = await client.query<{ version: string }>(
        "select postgis_lib_version() as version",
      );
      return result.rows[0].version;
    }),
  );
  return Response.json(report, { status: report.status === "ok" ? 200 : 503 });
}
