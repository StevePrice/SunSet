import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, GOVERNING_LAW, LegalPage, List, OPERATOR, Section } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms · Sunset Soul" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms">
      <p>
        These terms are the agreement between you and {OPERATOR} (&ldquo;we&rdquo;) for using Sunset Soul. By creating an
        account, you agree to them. Please also read the <Link href="/privacy" className="underline">Privacy policy</Link>.
      </p>

      <Section title="Your account">
        <List>
          <li>You need to be at least 13, or the age your country requires to agree to these terms yourself.</li>
          <li>Keep your sign-in details to yourself. You&apos;re responsible for what happens in your account.</li>
          <li>One person per account.</li>
        </List>
      </Section>

      <Section title="Your sunsets stay yours">
        <p>
          You own the photos, stories and recordings you add. You give us permission to store, process and show them only
          as needed to run Sunset Soul for you: keeping your Journal, scoring your photos, story help when you ask for it,
          and showing a sunset to the people you send its link to. This permission ends when you delete them, apart from
          copies in backups, which are gone within 30 days.
        </p>
        <p>Only add photos and recordings you have the right to use.</p>
      </Section>

      <Section title="Sharing">
        <p>
          Anyone who has a share link can see that sunset, and anyone can forward a link. Think about who&apos;s in a photo
          before you share it, and stop sharing whenever you like. Friends who react agree to keep their notes kind; we may
          remove anything that isn&apos;t.
        </p>
      </Section>

      <Section title="Please don't">
        <List>
          <li>Post anything illegal, hateful, sexual, violent, or that harasses someone.</li>
          <li>Share photos or recordings of people who wouldn&apos;t want them shared, or that put a child at risk.</li>
          <li>Try to get into other people&apos;s accounts or data, or get around our limits.</li>
          <li>Overload, scrape, copy or reverse-engineer the service, or use it to send spam.</li>
        </List>
        <p>We may remove content, or pause or close an account, that breaks these rules.</p>
      </Section>

      <Section title="Scores and AI">
        <p>
          Sunset Scores and AI-written questions and stories are made by computer models. They&apos;re for fun and
          inspiration, can be wrong, and aren&apos;t a judgement of you or your photo. Read a story before you share it.
        </p>
      </Section>

      <Section title="The beta">
        <p>
          Sunset Soul is new and still changing. Features may change or stop, and there may be problems. We back up the
          database every night, but please keep your own copy of anything precious: You → Download your sunsets gives you
          everything. Sunset Soul is free during the beta; we&apos;ll tell you well before anything changes that.
        </p>
      </Section>

      <Section title="Leaving">
        <p>
          You can delete your account at any time in You. We may close an account that breaks these terms, or close the
          service, with notice where we can, so you have time to download your sunsets.
        </p>
      </Section>

      <Section title="Our responsibility">
        <p>
          Sunset Soul is provided as it is, without promises that it will always be available or free of errors. As far
          as the law allows, we aren&apos;t responsible for indirect losses, or for lost content beyond what we can restore
          from backups. Nothing here limits rights you have under the law that can&apos;t be limited.
        </p>
      </Section>

      <Section title="Changes and law">
        <p>
          If we change these terms in a way that matters, we&apos;ll tell you before it applies. These terms are governed by
          the laws of {GOVERNING_LAW}.
        </p>
        <p>
          Questions: <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
