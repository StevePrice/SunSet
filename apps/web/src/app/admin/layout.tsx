import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export const metadata = { title: "Admin · Sunset Soul", robots: { index: false } };

// Every admin page and action also checks requireAdmin itself; this only adds the navigation.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6">
      <nav className="flex flex-wrap items-center gap-4 border-b border-divider pb-3 text-caption">
        <strong>Admin</strong>
        <Link href="/admin" className="underline">
          Users
        </Link>
        <Link href="/admin/calibrate" className="underline">
          Rate photos
        </Link>
        <Link href="/admin/calibrate/results" className="underline">
          Results
        </Link>
        <Link href="/journal" className="ml-auto underline">
          My Journal
        </Link>
      </nav>
      {children}
    </div>
  );
}
