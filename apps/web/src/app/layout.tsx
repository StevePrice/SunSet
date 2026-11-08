import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// The brand fonts, self-hosted from the design system (design-system/fonts, SIL OFL).
const fraunces = localFont({
  variable: "--font-fraunces",
  display: "swap",
  src: [
    { path: "../../../../design-system/fonts/Fraunces-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../../../design-system/fonts/Fraunces-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../../../../design-system/fonts/Fraunces-MediumItalic.ttf", weight: "500", style: "italic" },
  ],
});

const atkinson = localFont({
  variable: "--font-atkinson",
  display: "swap",
  src: [
    { path: "../../../../design-system/fonts/AtkinsonHyperlegible-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../../../design-system/fonts/AtkinsonHyperlegible-Bold.ttf", weight: "700", style: "normal" },
    { path: "../../../../design-system/fonts/AtkinsonHyperlegible-Italic.ttf", weight: "400", style: "italic" },
    { path: "../../../../design-system/fonts/AtkinsonHyperlegible-BoldItalic.ttf", weight: "700", style: "italic" },
  ],
});

export const metadata: Metadata = {
  title: "Sunset Soul",
  description: "A place to keep and share the sunsets that move you.",
};

// Browser chrome follows the page: navy in dark mode (the brand default), cream in light mode.
export const viewport: Viewport = {
  colorScheme: "dark light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${atkinson.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
