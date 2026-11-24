import { getCloudflareContext } from "@opennextjs/cloudflare";
import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/app-nav";
import { PhotoCard } from "@/components/photo-card";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { getEntry } from "@/lib/entries";
import { namesForEntry } from "@/lib/people";
import { getShareForEntry } from "@/lib/shares";
import { listClips } from "@/lib/story/clips";
import { BeforeYouShareForm } from "./before-you-share";

export const metadata = { title: "Before you share · Sunset Soul" };

// Before you share (Phase 4f-3, Build Spec 2.7, picture 23): reached from Share only when the photo
// has names or the story was spoken. Only this one sunset is sent.
export default async function BeforeYouSharePage(props: PageProps<"/journal/[id]/share">) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const found = await withDrizzle(async (db) => {
    const entry = await getEntry(db, user.id, id);
    if (!entry) return null;
    const [names, clips, share] = await Promise.all([namesForEntry(db, user.id, id), listClips(db, user.id, id), getShareForEntry(db, user.id, id)]);
    return { entry, names, clips, share };
  });
  if (!found) notFound();
  const { entry, names, clips, share } = found;
  // Nothing to ask: back to Entry Detail, whose Share opens the menu straight away.
  if (!names.length && !clips.length) redirect(`/journal/${id}`);
  const { env } = await getCloudflareContext({ async: true });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-2 pb-8">
      <BackLink href={`/journal/${id}`} label="Cancel" />
      <h1 className="font-serif text-title-1">Before you share</h1>
      <div className="flex items-center gap-4">
        <PhotoCard src={`/api/photos/${id}/thumb`} alt="" square corners="sm" className="w-16 shrink-0" />
        {entry.title && <p className="font-serif text-title-3">{entry.title}</p>}
      </div>
      <BeforeYouShareForm
        entryId={id}
        ownerName={user.name.trim() || null}
        names={names}
        voiceMs={clips.reduce((total, c) => total + c.durationMs, 0)}
        shareUrl={share && `${env.BETTER_AUTH_URL}/s/${share.id}`}
      />
    </main>
  );
}
