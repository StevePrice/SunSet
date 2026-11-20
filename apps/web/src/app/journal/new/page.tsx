import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NewEntryForm } from "./new-entry-form";

export const metadata = { title: "New sunset · Sunset Soul" };

// New sunset (Build Spec 3.5): Cancel at top left, no header button and no bottom bar.
export default async function NewEntryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-2 pb-8">
      <NewEntryForm />
    </main>
  );
}
