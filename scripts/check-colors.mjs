// Fails when apps/web/src uses a raw colour instead of a design-system role: a Tailwind palette
// class (bg-zinc-100, text-white, from-orange-200 ...), an arbitrary colour class (bg-[#FBD2BC]),
// or a hex / rgb() / hsl() colour literal. Use the role names in globals.css (bg-surface,
// text-ink, bg-action ...) or, where CSS can't reach (next/og cards, emails), the generated
// design-tokens.generated.ts. Also fails on Tailwind's default text sizes (text-sm, text-lg ...):
// use the design-system type scale (text-caption, text-label, text-body, text-title-3 ...).
// Runs as part of `npm run lint` in apps/web.
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const srcDir = new URL("../apps/web/src/", import.meta.url).pathname;
const exempt = (file) => /\.generated\.ts$/.test(file);

const palette =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white";
const utilities =
  "bg|text|border(?:-[xytrblse])?|ring|ring-offset|fill|stroke|from|via|to|outline|divide|placeholder|decoration|accent|caret|shadow|inset-shadow";
const rules = [
  { name: "Tailwind palette colour class", re: new RegExp(`(?<![\\w-])(?:${utilities})-(?:${palette})(?:-\\d{2,3})?(?:/\\d+)?(?![\\w-])`, "g") },
  { name: "arbitrary colour class", re: /(?<![\w-])[a-z-]+-\[(?:#|rgba?\(|hsla?\(|oklch\()[^\]]*\]/g },
  { name: "hex colour", re: /(?<![\w&])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![\w-])/g },
  { name: "rgb()/hsl() colour", re: /\b(?:rgba?|hsla?|oklch)\(\s*[\d.]/g },
  { name: "Tailwind default text size", re: /(?<![\w-])text-(?:xs|sm|base|lg|xl|[2-9]xl)(?![\w-])/g },
];

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (/\.(tsx?|css|mjs|js)$/.test(entry.name) && !exempt(path)) yield path;
  }
}

const problems = [];
for await (const file of files(srcDir)) {
  const lines = (await readFile(file, "utf8")).split("\n");
  lines.forEach((line, i) => {
    for (const { name, re } of rules) {
      for (const match of line.matchAll(re)) problems.push(`${relative(process.cwd(), file)}:${i + 1}  ${name}: ${match[0]}`);
    }
  });
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n${problems.length} problem(s). Use the design-system role names and type scale instead (see apps/web/src/app/globals.css).`);
  process.exit(1);
}
console.log("check-colors: no raw colours or default text sizes in apps/web/src.");
