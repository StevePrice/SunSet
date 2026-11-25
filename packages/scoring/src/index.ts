export * from "./pixels";
export * from "./scene";
export * from "./scores";

/** Bump when thresholds, prompts or models change; scores are stored per version. */
// v2.1 (Phase 4f): photos with people pass the sunset check, the Wow rules for people, and the
// hidden people check.
export const SCORER_VERSION = "v2.1";
