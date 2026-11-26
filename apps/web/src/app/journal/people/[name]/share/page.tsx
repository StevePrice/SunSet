import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/app-nav";
import { peopleHref } from "@/components/people";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { MAX_SET_SIZE } from "@/lib/share-set-input";
import { getLiveSet } from "@/lib/share-sets";
import { recordingLengths } from "@/lib/story/clips";
import { loadSunsetsWith } from "../../load";
import { ShareSetForm } from "./share-set-form";

export const metadata = { title: "Share your sunsets together · Sunset Soul" };

// Share the set, review (Phase 4f-5, Build Spec 2.4, picture 20): every sunset with the person,
// all checked to start; uncheck any to leave out. Share makes one link and opens the share menu.
export default async function ShareSetPage(props: PageProps<"/journal/people/[name]/share">) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const found = await loadSunsetsWith(user.id, (await props.params).name);
  if (!found) notFound();
  const { name } = found;
  const entries = found.entries.slice(0, MAX_SET_SIZE);
  const [lengths, live] = await withDrizzle((db) => Promise.all([recordingLengths(db, user.id), getLiveSet(db, user.id, name)]));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-2 pb-8">
      <BackLink href={peopleHref(name)} label="Cancel" />
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-title-1">Share with {name}</h1>
        <p>Uncheck any you&apos;d rather not send.</p>
      </div>
      <ShareSetForm
        personName={name}
        ownerName={user.name.trim() || null}
        sunsets={entries.map((e) => ({
          id: e.id,
          title: e.title,
          takenAt: e.takenAt.toISOString(),
          timeZone: e.timeZone,
          spoken: lengths.has(e.id),
        }))}
        initialVoice={live?.includeVoice ?? false}
        sharingAgain={live !== null}
      />
    </main>
  );
}
