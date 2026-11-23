import type { MetadataRoute } from "next";
import { colors } from "@/lib/design-tokens.generated";

// The installable web app (Phase 7a): "Add to Home Screen" opens Sunset Soul full screen on the
// Journal. Navy, the brand's default dark surface, for the splash and the status bar. Icons from
// brand/logo/app-icons (the 192 is a resized copy of the 1024 App Store icon).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sunset Soul",
    short_name: "Sunset Soul",
    description: "A place to keep and share the sunsets that move you.",
    start_url: "/journal",
    scope: "/",
    display: "standalone",
    background_color: colors.dark.surfacePage,
    theme_color: colors.dark.surfacePage,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
