// The Sunset Soul logo (brand/logo/LOGO-USAGE.md): the "for dark backgrounds" file by default,
// since dark mode is the brand default, and the "for light backgrounds" file when the phone is in
// light mode. Never on a person's photo.
const FILES = {
  horizontal: { name: "sunset-soul-logo-horizontal-transparent", ratio: 826 / 221 },
  stacked: { name: "sunset-soul-logo-stacked-transparent", ratio: 671 / 428 },
  // The sun mark on its own (empty Journal), 1000 × 655.
  mark: { name: "sunset-soul-mark", ratio: 1000 / 655 },
};

export function Logo({ layout = "horizontal", width }: { layout?: keyof typeof FILES; width: number }) {
  const { name, ratio } = FILES[layout];
  // The horizontal logo is never narrower than 120px.
  const w = layout === "horizontal" ? Math.max(width, 120) : width;
  return (
    <picture>
      <source srcSet={`/brand/${name}-for-light-backgrounds.svg`} media="(prefers-color-scheme: light)" />
      <img src={`/brand/${name}-for-dark-backgrounds.svg`} alt="Sunset Soul" width={w} height={Math.round(w / ratio)} />
    </picture>
  );
}
