import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NewEntryForm } from "./new-entry-form";

export const metadata = { title: "New sunset · Sunset Soul" };

export default async function NewEntryPage() {
  if (!(await getCurrentUser())) redirect("/sign-in");
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="font-serif text-title-1">New sunset</h1>
      <NewEntryForm />
    </main>
  );
}
