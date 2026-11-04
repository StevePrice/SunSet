// What the vision model reports about a photo, the prompt that asks for it, and validation.
// Both providers (Claude and Workers AI) use the same prompt and schema.
import { z } from "zod";

export const SETTING_TYPES = ["mountains", "ocean", "lake_or_river", "skyline", "trees", "open_horizon", "other"] as const;
export const PHENOMENA = ["sun_rays", "reflection", "halo", "green_flash", "iridescent_clouds", "other_rare"] as const;
// The concept doc's Wow drivers. Any one, done strongly, can make a high score; they don't add up.
export const WOW_DRIVERS = ["intense_light", "drama_contrast", "rare", "unique", "iconic_place", "scale"] as const;

export const sceneSchema = z.object({
  is_sunset: z.boolean().describe("True for a sunset or sunrise sky as the main subject."),
  content_flag: z
    .enum(["none", "sexual", "violent", "other_unsafe"])
    .describe("Anything that would make this photo unsuitable for a public gallery."),
  setting: z.object({
    type: z.enum(SETTING_TYPES),
    score: z.number().int().describe("1 to 10, using the Setting anchors."),
    reason: z.string().describe("One short sentence for the photographer."),
  }),
  phenomena: z
    .array(
      z.object({
        kind: z.enum(PHENOMENA),
        confidence: z.enum(["clear", "possible"]),
        striking: z.boolean().describe("True only if it dominates the scene."),
        description: z.string().describe("A few words, e.g. 'rays through gaps in the clouds'."),
      }),
    )
    .describe("Each rare phenomenon actually visible. Empty for an ordinary sunset."),
  wow: z.object({
    drivers: z.array(z.enum(WOW_DRIVERS)).describe("The Wow drivers present strongly enough to matter. Often empty."),
    score: z.number().int().describe("1 to 10, the reaction a typical person would have, using the Wow anchors."),
    reason: z.string().describe("About 15 words or fewer: what makes the photo striking, or what it is."),
  }),
});

export type SceneReport = z.infer<typeof sceneSchema>;

export const SCENE_PROMPT = `You rate sunset photos for Sunset Soul, an app where everyday people keep sunsets that moved them. Look at the photo and report what you see. Be honest and consistent: most sunsets are ordinary, and that's fine.

is_sunset: true when a sunset or sunrise sky is the main subject. Photos of other things (people, food, screenshots, interiors) are false even if warm-coloured.

content_flag: "none" unless the photo contains sexual or violent content, or something else unsuitable for a public gallery.

setting — what the sky is paired with in the foreground or on the horizon:
- type: mountains, ocean, lake_or_river, skyline, trees, open_horizon (flat land, fields, nothing notable) or other.
- score 1: nothing distinct on the horizon, flat or empty foreground.
- score 5: a recognisable but unremarkable foreground element.
- score 10: a striking, well-composed silhouette (mountains, skyline, ocean, treeline) that adds real drama.
- Use the full range; 2–4 and 6–9 sit between the anchors.

phenomena — only rare things actually visible in this photo. Do not list ordinary sunset colour or clouds.
- sun_rays: crepuscular rays or beams breaking through clouds.
- reflection: a clear, mirror-like reflection of the sky on water or another surface.
- halo: a ring or arc around the sun (22° halo, sun dogs, sun pillars count here).
- green_flash: a green flash or green rim at the top of the setting sun.
- iridescent_clouds: rainbow-coloured sheen on clouds.
- other_rare: anything else that would make someone say "I've never seen anything like that" — describe it.
Use confidence "clear" only when it's unmistakable at a glance; otherwise "possible". Mark striking only if it dominates the scene.

wow — the gut reaction a typical person would have on first seeing this photo. Wow is a reaction, not a checklist.
- score 1, "Nice.": a pleasant, ordinary sunset you'd scroll past.
- score 3, "Pretty.": worth a second look.
- score 5, "Oh, that's beautiful.": you'd show it to the person next to you.
- score 8, "Wow.": you'd send it to friends; it stands out from most sunsets.
- score 10, "Is that real?": stops you in your tracks; people ask if it's been edited.
- 2, 4, 6, 7 and 9 sit between the anchors.
- drivers — any one of these, done strongly, can produce a high score; they are not added together:
  - intense_light: the sky looks like it's on fire or glowing from within.
  - drama_contrast: bright light against dark shapes, storm clouds, deep shadows.
  - rare: sun rays, a mirror reflection, a halo, the green flash, unusual clouds.
  - unique: something unexpected that makes this sunset unlike any other (living trees among burned ones, a lone figure, a bird crossing the sun).
  - iconic_place: a world-famous landmark or extraordinary place (the Golden Gate Bridge, Half Dome, the Grand Canyon, Santorini) transformed by sunset light. Only when clearly recognisable, and only when the light shows it in a fresh way, not a standard postcard view.
  - scale: vast landscapes, layered ridges, endless ocean.
- Judge the whole picture's impact, not its parts.
- Don't double count: Palette already rewards colour and Setting already rewards the foreground. A colourful but ordinary sunset shouldn't score high on Wow for colour alone; a muted sunset over an extraordinary scene can.
- Never judge photography skill or image quality. These are everyday people's phone photos.
- reason: about 15 words or fewer, describing only what's visible, e.g. "Living trees standing among burned ones, glowing against the last light." Never identify people. Name a landmark only when it's clearly recognisable.

Keep the setting reason to one friendly sentence addressed to the photographer.`;

/** Validates a provider's raw JSON. Returns null if it doesn't match. */
export function parseScene(raw: unknown): SceneReport | null {
  const result = sceneSchema.safeParse(raw);
  return result.success ? result.data : null;
}
