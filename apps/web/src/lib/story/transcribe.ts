// Speech to text for voice answers: Whisper on Workers AI (decided 2026-11-03). The audio goes in
// as base64. Whisper large-v3-turbo decodes the container itself, so the iPhone's MP4 (AAC) and
// Chrome's WebM (Opus) are sent as they were recorded, with no conversion on the Worker.
export const WHISPER_MODEL = "@cf/openai/whisper-large-v3-turbo";

/** Whisper heard nothing usable; the clip is kept and the user can retry or type. */
export class TranscriptionError extends Error {}

export async function transcribe(ai: Ai, audio: ArrayBuffer): Promise<{ text: string; usage: null }> {
  const result = await ai.run(WHISPER_MODEL, {
    audio: Buffer.from(audio).toString("base64"),
    task: "transcribe",
    // English only for the beta (Phase 5 decisions).
    language: "en",
    // Skips silence, which otherwise makes Whisper invent words.
    vad_filter: true,
  });
  const text = (result.text ?? "").replace(/\s+/g, " ").trim();
  if (!text) throw new TranscriptionError("No speech found in the recording.");
  return { text, usage: null };
}
