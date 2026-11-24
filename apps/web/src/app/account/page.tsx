import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader, BottomBar } from "@/components/app-nav";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { getStorySettings } from "@/lib/settings";
import { countRecordings } from "@/lib/story/clips";
import { FirstNameForm } from "./first-name-form";
import { YourData } from "./your-data";
import { SettingsPanel } from "./settings-panel";
import { SignOutButton } from "./sign-out-button";

export const metadata = { title: "Your account · Sunset Soul" };

// You (Phase 4e, Build Spec 3.13): first name, the signed-in email, settings, and Sign out at the
// bottom. Header and bottom bar, with You selected.
export default function AccountPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-4 pb-8">
      <AppHeader />
      <h1 className="font-serif text-title-1">Your account</h1>
      <Suspense fallback={<p className="text-ink-muted">Loading…</p>}>
        <AccountDetails />
      </Suspense>
      <BottomBar current="you" />
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
      <FirstNameForm initial={user.name.trim()} />
      <div className="flex flex-col gap-1 rounded-ss-lg bg-surface-raised p-4">
        <p className="text-caption text-ink-muted">Signed in as</p>
        <p className="break-all">{user.email}</p>
      </div>
      <SettingsPanel aiStoryHelp={settings?.aiStoryHelp ?? true} recordings={recordings} />
      <SignOutButton />
      <YourData />
      {/* Attribution required by the GeoNames licence (CC BY 4.0) for the town names. */}
      <p className="text-caption text-ink-muted">
        Place names from{" "}
        <a href="https://www.geonames.org" className="underline" target="_blank" rel="noreferrer">
          GeoNames
        </a>
        , licensed CC BY 4.0.
      </p>
    </div>
  );
}
