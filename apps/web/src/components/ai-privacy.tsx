// The data and privacy explanation for AI story help, shown in Settings and in the first-use
// notice (Story Capture PRD 6.9).
export function AiPrivacyText() {
  return (
    <div className="flex flex-col gap-2 leading-7">
      <p>
        To make questions, transcripts and your story, your photo, recordings and words are processed by AI services:
        Anthropic&apos;s Claude and Cloudflare Workers AI. They don&apos;t use them to train their models.
      </p>
      <p>Your recordings are private. They are never shared, not even when you share a sunset.</p>
    </div>
  );
}
