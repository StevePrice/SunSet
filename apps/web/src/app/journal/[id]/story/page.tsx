import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { getEntry } from "@/lib/entries";
import { getSession, toView } from "@/lib/story/sessions";
import { StoryFlow } from "./story-flow";

export const metadata = { title: "Tell its story · Sunset Soul" };

export default async function StoryPage(props: PageProps<"/journal/[id]/story">) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const found = await withDrizzle(async (db) => {
    const entry = await getEntry(db, user.id, id);
    return entry && { entry, session: await getSession(db, user.id, id) };
  });
  if (!found) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-8">
      <Link href={`/journal/${id}`} className="text-caption underline">
        ← Back to this sunset
      </Link>
      <h1 className="font-serif text-title-1">Tell its story</h1>
      <StoryFlow entryId={id} initial={toView(found.session)} />
    </main>
  );
}
