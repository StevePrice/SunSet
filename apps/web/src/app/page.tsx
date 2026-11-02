import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-linear-to-b from-orange-200 via-rose-300 to-indigo-900 px-6 text-center">
      <h1 className="text-5xl font-semibold tracking-tight text-white drop-shadow">Sunset Soul</h1>
      <p className="max-w-md text-lg text-white/90">
        A place to keep and share the sunsets that move you. Coming soon.
      </p>
      <Link href="/sign-in" className="rounded-full bg-white/90 px-5 py-2 font-medium text-rose-700 hover:bg-white">
        Sign in
      </Link>
    </main>
  );
}
