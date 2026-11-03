// Scores one photo: pixel metrics for Palette and Reach, the vision model for Setting and Wow.
import { measurePixels, scoreEntry, type PixelMetrics, type SceneReport, type Scores } from "@sunset/scoring";
import { decodeForAnalysis } from "./decode";
import { detectScene, type ProviderName } from "./providers";

// Anthropic accepts images up to 5 MB; larger display photos fall back to the thumbnail.
const MAX_VISION_BYTES = 4.5 * 1024 * 1024;

export type PhotoScore =
  | { status: "done"; scores: Scores; details: ScoreDetails }
  | { status: "not_sunset"; details: ScoreDetails };

export type ScoreDetails = {
  metrics: PixelMetrics;
  analysisSize: { width: number; height: number };
  scene: SceneReport;
  model: string;
  usage: { inputTokens?: number; outputTokens?: number };
  timingMs: { decode: number; pixels: number; vision: number };
};

export async function scorePhoto(
  env: Env,
  provider: ProviderName,
  display: ArrayBuffer,
  thumb?: () => Promise<ArrayBuffer>,
): Promise<PhotoScore> {
  const visionImage = display.byteLength > MAX_VISION_BYTES && thumb ? await thumb() : display;
  const visionStarted = Date.now();
  const visionPromise = detectScene(env, provider, visionImage).then((result) => ({
    ...result,
    ms: Date.now() - visionStarted,
  }));

  const decodeStarted = Date.now();
  const analysis = await decodeForAnalysis(display);
  const pixelsStarted = Date.now();
  const metrics = measurePixels(analysis);
  const pixelsDone = Date.now();

  const vision = await visionPromise;
  const details: ScoreDetails = {
    metrics,
    analysisSize: { width: analysis.width, height: analysis.height },
    scene: vision.scene,
    model: vision.model,
    usage: vision.usage,
    timingMs: { decode: pixelsStarted - decodeStarted, pixels: pixelsDone - pixelsStarted, vision: vision.ms },
  };
  if (!vision.scene.is_sunset) return { status: "not_sunset", details };
  return { status: "done", scores: scoreEntry(metrics, vision.scene), details };
}
