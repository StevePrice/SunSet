/**
 * Sunset Soul design tokens for React Native / Expo.
 * Generated from design-tokens.json. Do not edit by hand; change the tokens and regenerate.
 */

export type ColorSchemeName = "dark" | "light";

const darkColors = {
  /** The brand color. App icon tile, dark-mode page, text color in light mode. */
  brandTwilightNavy: "#1D2B5C",
  /** Second brand blue. The earth in the app icon and raised surfaces in dark mode. */
  brandBlueHour: "#273A72",
  /** Warm cream. Light-mode page and text on navy. */
  brandCream: "#FFF9F2",
  /** The sun in the logo and every score. The one warm accent. */
  brandApricot: "#FF9B5C",
  /** The beams in the logo on dark grounds and the selected reaction. */
  brandPeachBlush: "#FBD2BC",
  /** The action blue in its light-mode strength. */
  brandOceanBlue: "#2C4A8C",
  /** Screen background behind every photo and story. */
  surfacePage: "#1D2B5C",
  /** Unselected reaction chips, text fields, sheets and cards on surface-page. */
  surfaceRaised: "#273A72",
  /** Areas set back from the page: the area behind sheets, empty states, the Share Page margins. */
  surfaceSunken: "#16224A",
  /** Borders of reaction chips, text fields and secondary buttons. 3:1 or better on surface-page and surface-raised, so controls are easy to find. Cards use no border. */
  borderSubtle: "#7286C4",
  /** Hairlines between sections and above the tab bar. */
  divider: "#33467E",
  /** Titles, labels and primary text on surface-page and surface-raised. 11:1 or better in both themes. */
  ink: "#FFF6EC",
  /** Story text, set in the story style, on surface-page. */
  inkStory: "#E3E9F8",
  /** Dates, counts, the Wow reason line and other quiet text on surface-page and surface-raised. 5.6:1 or better. */
  inkMuted: "#C3CDEB",
  /** Warm accent text, such as Soul in the wordmark. Large text only (24px and up) in light mode. */
  inkAccent: "#FF9B5C",
  /** The one primary button per screen (Save, Send, Share) and the capture button. Lifted in dark mode so it shows on navy. The button is identified by its label; the fill is 2.4:1 against navy in dark mode. */
  action: "#3A64B8",
  /** Text and icons on action. */
  onAction: "#FFFFFF",
  /** Keyboard and accessibility focus outline, 3px, on every surface. */
  focusRing: "#FBD2BC",
  /** Fill of a reaction chip the person has tapped (Wow, Wish I was there, Love this!). */
  reactionSelected: "#FBD2BC",
  /** 1px border on reaction-selected so the chip reads as pressed. */
  reactionSelectedBorder: "#F2B08E",
  /** Text on reaction-selected. */
  onReaction: "#1D2B5C",
  /** Score badge fill, on photos and beside titles. */
  score: "#FF9B5C",
  /** Numbers on score. 6.5:1. */
  onScore: "#1D2B5C",
  /** Behind white text laid over a photo (home-screen previews, share cards only). */
  photoScrim: "rgba(22, 34, 74, 0.55)",
} as const;

const lightColors = {
  /** The brand color. App icon tile, dark-mode page, text color in light mode. */
  brandTwilightNavy: "#1D2B5C",
  /** Second brand blue. The earth in the app icon and raised surfaces in dark mode. */
  brandBlueHour: "#273A72",
  /** Warm cream. Light-mode page and text on navy. */
  brandCream: "#FFF9F2",
  /** The sun in the logo and every score. The one warm accent. */
  brandApricot: "#FF9B5C",
  /** The beams in the logo on dark grounds and the selected reaction. */
  brandPeachBlush: "#FBD2BC",
  /** The action blue in its light-mode strength. */
  brandOceanBlue: "#2C4A8C",
  /** Screen background behind every photo and story. */
  surfacePage: "#FFF9F2",
  /** Unselected reaction chips, text fields, sheets and cards on surface-page. */
  surfaceRaised: "#E6ECF8",
  /** Areas set back from the page: the area behind sheets, empty states, the Share Page margins. */
  surfaceSunken: "#F4EFE7",
  /** Borders of reaction chips, text fields and secondary buttons. 3:1 or better on surface-page and surface-raised, so controls are easy to find. Cards use no border. */
  borderSubtle: "#76839F",
  /** Hairlines between sections and above the tab bar. */
  divider: "#E4DED3",
  /** Titles, labels and primary text on surface-page and surface-raised. 11:1 or better in both themes. */
  ink: "#1D2B5C",
  /** Story text, set in the story style, on surface-page. */
  inkStory: "#24305A",
  /** Dates, counts, the Wow reason line and other quiet text on surface-page and surface-raised. 5.6:1 or better. */
  inkMuted: "#4E5B85",
  /** Warm accent text, such as Soul in the wordmark. Large text only (24px and up) in light mode. */
  inkAccent: "#C4621F",
  /** The one primary button per screen (Save, Send, Share) and the capture button. Lifted in dark mode so it shows on navy. The button is identified by its label; the fill is 2.4:1 against navy in dark mode. */
  action: "#2C4A8C",
  /** Text and icons on action. */
  onAction: "#FFFFFF",
  /** Keyboard and accessibility focus outline, 3px, on every surface. */
  focusRing: "#2C4A8C",
  /** Fill of a reaction chip the person has tapped (Wow, Wish I was there, Love this!). */
  reactionSelected: "#FBD2BC",
  /** 1px border on reaction-selected so the chip reads as pressed. */
  reactionSelectedBorder: "#F2B08E",
  /** Text on reaction-selected. */
  onReaction: "#1D2B5C",
  /** Score badge fill, on photos and beside titles. */
  score: "#FF9B5C",
  /** Numbers on score. 6.5:1. */
  onScore: "#1D2B5C",
  /** Behind white text laid over a photo (home-screen previews, share cards only). */
  photoScrim: "rgba(22, 34, 74, 0.55)",
} as const;

export const colors = { dark: darkColors, light: lightColors } as const;
export type ColorName = keyof typeof darkColors;
export type Colors = Record<ColorName, string>;

/** Font file names. Load these with expo-font (useFonts) using the same names as keys. */
export const fontFiles = [
  "Fraunces-Regular.ttf",
  "Fraunces-SemiBold.ttf",
  "Fraunces-MediumItalic.ttf",
  "AtkinsonHyperlegible-Regular.ttf",
  "AtkinsonHyperlegible-Bold.ttf",
  "AtkinsonHyperlegible-Italic.ttf",
  "AtkinsonHyperlegible-BoldItalic.ttf",
] as const;

export const fonts = {
  serifRegular: "Fraunces-Regular",
  serifSemiBold: "Fraunces-SemiBold",
  serifMediumItalic: "Fraunces-MediumItalic",
  sansRegular: "AtkinsonHyperlegible-Regular",
  sansBold: "AtkinsonHyperlegible-Bold",
  sansItalic: "AtkinsonHyperlegible-Italic",
  sansBoldItalic: "AtkinsonHyperlegible-BoldItalic",
} as const;

export const typography = {
  /** Welcome and onboarding headlines only. */
  display: { fontFamily: "Fraunces-SemiBold", fontSize: 40, lineHeight: 44, letterSpacing: -0.4 },
  /** Screen titles. */
  title1: { fontFamily: "Fraunces-SemiBold", fontSize: 32, lineHeight: 38 },
  /** Entry titles on Entry Detail and the Share Page. */
  title2: { fontFamily: "Fraunces-SemiBold", fontSize: 26, lineHeight: 32 },
  /** Featured card titles in the Journal. */
  title3: { fontFamily: "Fraunces-SemiBold", fontSize: 21, lineHeight: 26 },
  /** Every story and friend note. Set in ink-story. */
  story: { fontFamily: "Fraunces-Regular", fontSize: 18, lineHeight: 28 },
  /** Instructions, prompts and settings text. */
  body: { fontFamily: "AtkinsonHyperlegible-Regular", fontSize: 18, lineHeight: 26 },
  /** Grid tile titles and emphasis inside body. */
  bodyStrong: { fontFamily: "AtkinsonHyperlegible-Bold", fontSize: 18, lineHeight: 26 },
  /** Buttons, reaction chips and the score number. */
  label: { fontFamily: "AtkinsonHyperlegible-Bold", fontSize: 17, lineHeight: 22 },
  /** Dates, counts and the Wow reason line. The smallest reading size in the app. */
  caption: { fontFamily: "AtkinsonHyperlegible-Regular", fontSize: 15, lineHeight: 20 },
  /** Short uppercase section labels only, never sentences. */
  overline: { fontFamily: "AtkinsonHyperlegible-Bold", fontSize: 14, lineHeight: 18, letterSpacing: 1.12, textTransform: "uppercase" as const },
} as const;

export const spacing = {
  /** Gap between a number and its label. */
  space1: 4,
  /** Gap between reaction chips and between a photo and its title. */
  space2: 8,
  /** Gap between grid tiles. */
  space3: 12,
  /** Screen side margins and card padding. */
  space4: 16,
  /** Padding inside the story area. */
  space5: 20,
  /** Gap between sections. */
  space6: 24,
  /** Top of screen to the title. */
  space8: 32,
  /** Breathing room above and below empty states. */
  space10: 40,
} as const;

export const radius = {
  /** Score badges and small thumbnails. */
  radiusSm: 10,
  /** Photos, text fields and primary buttons. */
  radiusMd: 14,
  /** Cards and bottom sheets. */
  radiusLg: 20,
  /** Reaction chips and the round capture button. */
  radiusPill: 9999,
} as const;

export const size = {
  /** Smallest tappable area for anything. Larger than the platform minimum, for our 50 to 65 audience. */
  tapMin: 48,
  /** Primary and secondary buttons. */
  buttonHeight: 52,
  /** Reaction chips. */
  chipHeight: 48,
  /** The round capture button in the tab bar. */
  captureButton: 60,
  /** Line icons in buttons and the tab bar. */
  icon: 24,
  /** Bottom tab bar, not counting the phone's safe area. */
  tabBarHeight: 76,
} as const;

/**
 * Pick the theme for the phone's color scheme.
 * Usage: const theme = getTheme(useColorScheme());
 * When the phone gives no preference, Sunset Soul uses its brand default, dark.
 */
export function getTheme(scheme?: ColorSchemeName | null) {
  const name: ColorSchemeName = scheme === "light" ? "light" : "dark";
  return { name, colors: colors[name] as Colors, typography, spacing, radius, size, fonts };
}

export type Theme = ReturnType<typeof getTheme>;
