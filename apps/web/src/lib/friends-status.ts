// The "See what friends sent" row's second line on Entry Detail (4f Build Spec 1.2, picture 22).

/** "Shared · 4 reactions · 2 added to the story", "No reactions yet", "Not shared yet"… */
export function friendsStatus(shared: boolean, reactions: number, added: number): string {
  const parts = [
    ...(reactions > 0 ? [`${reactions} ${reactions === 1 ? "reaction" : "reactions"}`] : []),
    ...(added > 0 ? [`${added} added to the story`] : []),
  ];
  // Reactions stay after Stop sharing, so a sunset with some but no link was shared before.
  if (!shared) return parts.length ? "Not shared" : "Not shared yet";
  return parts.length ? ["Shared", ...parts].join(" · ") : "No reactions yet";
}
