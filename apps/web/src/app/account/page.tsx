import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/button";
import { AppHeader } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { getStorySettings } from "@/lib/settings";
import { countRecordings } from "@/lib/story/clips";
import { SettingsPanel } from "./settings-panel";
import { SignOutButton } from "./sign-out-button";

export const metadata = { title: "Your account · Sunset Soul" };

export default function AccountPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-8">
      <AppHeader />
      <h1 className="font-serif text-title-1">Your account</h1>
      <Suspense fallback={<p className="text-ink-muted">Loading…</p>}>
        <AccountDetails />
      </Suspense>
    </main>
  );
}

async function AccountDetails() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const { settings, recordings } = await withDrizzle(async (db) => ({
    settings: await getStorySettings(db, user.id),
    recordings: await countRecordings(db, user.id),
  }));
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <p>
          Signed in as <strong>{user.name}</strong>
          <br />
          <span className="text-ink-muted">{user.email}</span>
        </p>
        <ButtonLink href="/journal" variant="action" className="w-full">
          Open your Journal
        </ButtonLink>
        <SignOutButton />
      </div>
      <SettingsPanel aiStoryHelp={settings?.aiStoryHelp ?? true} recordings={recordings} />
    </div>
  );
}
