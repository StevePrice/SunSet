export type HealthReport = {
  status: "ok" | "error";
  database: { reachable: boolean; postgis?: string; error?: string };
};

export async function checkHealth(queryPostgis: () => Promise<string>): Promise<HealthReport> {
  try {
    const postgis = await queryPostgis();
    return { status: "ok", database: { reachable: true, postgis } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: "error", database: { reachable: false, error: message } };
  }
}
