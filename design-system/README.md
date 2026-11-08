# Sunset Soul Design System

The brand's colors, type, spacing and fonts, ready to use in the Sunset Soul app.

The logo is a separate kit in `brand/logo/`, with its own usage guide (`brand/logo/LOGO-USAGE.md`).

- **Dark mode is the brand default.** Light mode follows the phone's setting.
- **Built for readers aged 50 to 65:** body text is 18pt, nothing is smaller than 15pt, and every tap target is at least 48pt.

## What's in this folder

| Folder or file | What it is | Who uses it |
|---|---|---|
| `design-tokens.json` | The single source of truth: every color (dark and light), type style, spacing, corner radius and size, in the W3C Design Tokens format. | Everyone. Change values here first. |
| `react-native/theme.ts` | The tokens for a React Native or Expo app. | React Native / Expo developers |
| `ios/SunsetSoulTheme.swift` | The tokens for a native iPhone app (SwiftUI). Colors switch with dark mode; fonts grow with Dynamic Type. | iOS developers |
| `android/res/` | Colors (light in `values`, dark in `values-night`), sizes and fonts for a native Android app. | Android developers |
| `web/tokens.css` | CSS variables for the Share Page and the website. | Web developers |
| `fonts/` | Fraunces and Atkinson Hyperlegible font files, with their open licenses (SIL OFL, free for apps). | Everyone |
| `../brand/logo/` | The logo lives outside this folder, in the separate logo kit: logo files, app store icons, favicons and `LOGO-USAGE.md`. | Everyone |

Each developer only needs the one platform folder that matches the app, plus `fonts/` and the logo kit in `brand/logo/`.

## How to add this to GitHub (no coding needed)

1. Open the app's repository on github.com.
2. Click **Add file**, then **Upload files**.
3. Drag the whole `sunset-soul-design-system` folder into the page. GitHub keeps the folders inside it.
4. Under **Commit changes**, write a short note such as "Add Sunset Soul design system".
5. Choose **Create a new branch** and click **Propose changes**. This lets your developer review it before it goes into the app.
6. Send your developer the link and point them to this README.

## For developers

### React Native / Expo

```ts
import { useFonts } from "expo-font";
import { useColorScheme } from "react-native";
import { getTheme } from "./design-system/react-native/theme";

const [loaded] = useFonts({
  "Fraunces-Regular": require("./design-system/fonts/Fraunces-Regular.ttf"),
  "Fraunces-SemiBold": require("./design-system/fonts/Fraunces-SemiBold.ttf"),
  "Fraunces-MediumItalic": require("./design-system/fonts/Fraunces-MediumItalic.ttf"),
  "AtkinsonHyperlegible-Regular": require("./design-system/fonts/AtkinsonHyperlegible-Regular.ttf"),
  "AtkinsonHyperlegible-Bold": require("./design-system/fonts/AtkinsonHyperlegible-Bold.ttf"),
  "AtkinsonHyperlegible-Italic": require("./design-system/fonts/AtkinsonHyperlegible-Italic.ttf"),
  "AtkinsonHyperlegible-BoldItalic": require("./design-system/fonts/AtkinsonHyperlegible-BoldItalic.ttf"),
});

const theme = getTheme(useColorScheme());
// <Text style={[theme.typography.story, { color: theme.colors.inkStory }]}>…</Text>
```

Each weight is its own font file, so set `fontFamily` from `theme.typography` and don't set `fontWeight` on custom-font text.

### iOS (SwiftUI)

1. Add `ios/SunsetSoulTheme.swift` and the `.ttf` files in `fonts/` to the app target.
2. List each font file under **Fonts provided by application** (`UIAppFonts`) in Info.plist.
3. Use `SunsetSoul.Colors.surfacePage`, `SunsetSoul.Typography.story`, `SunsetSoul.Spacing.space4`, and so on.

### Android

Copy the contents of `android/res/` into `app/src/main/res/`. Reference `@color/surface_page`, `@dimen/text_story` and `@font/fraunces_regular`. Dark colors load automatically from `values-night`.

### Web

Link `web/tokens.css` and keep `fonts/` beside the `web/` folder. Use `var(--ss-surface-page)` and the `.ss-story` class, for example.

## Rules that matter most

- The photo leads. Never put text, filters or the logo on a person's photo inside the app; only the score badge sits on it.
- On images shared outside the app (share card, Stories cards), put the logo mark (`brand/logo/sunset-soul-mark-for-dark-backgrounds.svg`, 34pt wide) in the photo's top-left corner on a 48pt square of `photoScrim` with 10pt corners. On those images the score badge sits in the bottom-right corner, opposite the mark.
- Photos run full bleed (edge to edge) only at the top of Entry Detail, on the score reveal and on Stories cards. Everywhere else they are inset 16pt from the screen edges with 14pt corners (`radius.md`). No borders or frames around photos.
- The Journal has two views, switched by a two-part toggle under the title: **Stories** (inset photo cards: photo, date, title, first three lines of the story, 32pt apart) and **All photos** (a two-column grid of square photos, 8pt apart, 10pt corners, grouped under month headings, photos only). Never three columns.
- Use one `action` button per screen. Use `score` (apricot) only for scores and `reaction-selected` (peach blush) only for tapped reactions.
- No red anywhere, no drop shadows, no emoji in the interface.
- `score` and `reactionSelected` are fill colors only. In light mode never use them for text or icons: show scores as an apricot badge with `onScore` numbers, and keep links and labels in `ink`.
- Draw the Live Map with the `map*` colors (water, land, coastline, pin ring and outline), never the surface colors.
- Respect the phone's text size setting and let layouts grow with it.

The full brand book, with live component previews, is in the Sunset Soul Design System on Claude.
