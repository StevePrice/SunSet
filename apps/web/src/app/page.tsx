import { ButtonLink } from "@/components/button";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1>
        <Logo layout="stacked" width={240} />
      </h1>
      <p className="max-w-md text-ink-story">A place to keep and share the sunsets that move you. Coming soon.</p>
      <ButtonLink href="/sign-in" variant="action">
        Sign in
      </ButtonLink>
    </main>
  );
}
