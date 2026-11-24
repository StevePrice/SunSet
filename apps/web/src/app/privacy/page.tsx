import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LegalPage, List, OPERATOR, Section } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy policy · Sunset Soul" };

// Written from what the app does today (Phase 7a). Keep it in step: a new kind of data, a new
// service that receives data, or a new cookie means a change here.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        Sunset Soul is a private journal for the sunsets that move you. This policy explains what we keep, why, who
        else handles it, and how you can download or delete it. Sunset Soul is run by {OPERATOR} (&ldquo;we&rdquo;).
      </p>

      <Section title="The short version">
        <List>
          <li>Your Journal is private. Nobody sees a sunset unless you make a link and send it.</li>
          <li>We don&apos;t sell your data, and there are no ads.</li>
          <li>Your recordings are never shared, not even when you share a sunset.</li>
          <li>Friends see a town name, never the exact spot where you took the photo.</li>
          <li>You can download everything, or delete your account and all of it, from You at any time.</li>
        </List>
      </Section>

      <Section title="What we keep">
        <p>
          <strong>Your account:</strong> your email address and first name. If you use a password, we store only a
          scrambled (hashed) version of it. If you sign in with Google or Apple, we receive your name and email from them.
        </p>
        <p>
          <strong>Your sunsets:</strong> the photos you add, their date, and the place. Before a photo leaves your
          phone it is resized and re-saved, which removes its hidden details (such as the camera and GPS data). If the
          photo had a location, we show it to you first; you can remove it before saving. We keep the location to name
          the nearest town, and the town name is what anyone else would see.
        </p>
        <p>
          <strong>Your stories:</strong> the words you type, your voice recordings, their transcripts, titles, and the
          answers you give to story questions.
        </p>
        <p>
          <strong>Scores:</strong> each photo&apos;s Sunset Score and what the scorer noticed about it, including whether
          people appear in it and roughly how many. We don&apos;t recognise who anyone is.
        </p>
        <p>
          <strong>Friends who react:</strong> when someone reacts to a sunset you shared, we keep the first name they type,
          their reactions and any note they leave, and give their browser a cookie so they aren&apos;t asked again. They
          don&apos;t need an account.
        </p>
        <p>
          <strong>Security and limits:</strong> for each signed-in session, the IP address and browser it came from, and
          short-lived counts of requests from an IP address to stop abuse. Our hosting provider keeps request logs for a
          few days to find errors.
        </p>
        <p>
          <strong>How the app is used:</strong> events such as &ldquo;a sunset was saved&rdquo; or &ldquo;a shared sunset was
          opened&rdquo;, with yes/no facts like whether it has a story. These are linked to a random account number, not
          your name or email, and never include your photos, words, recordings or places. We use them to see which parts
          of Sunset Soul help people, and to compare how sunsets with and without people are shared.
        </p>
      </Section>

      <Section title="How we use it">
        <List>
          <li>To keep your Journal and show it to you.</li>
          <li>To score your photos, and, when you ask, to help write your story.</li>
          <li>To show a sunset to the people you send its link to.</li>
          <li>To sign you in and send account emails (sign-in links, verification, password reset).</li>
          <li>To keep the service safe, fix problems and decide what to improve.</li>
        </List>
      </Section>

      <Section title="AI">
        <p>
          Every photo you save is sent to an AI model to give it a Sunset Score. When you use story help (questions,
          transcripts, tidying or writing your story), your photo, recordings and words are sent to AI models too. We use
          Anthropic&apos;s Claude and Cloudflare Workers AI. Under their terms for businesses, they don&apos;t use what we
          send to train their models. You can turn story help off in You; typing your own story never needs it.
        </p>
      </Section>

      <Section title="Who else handles your data">
        <p>We use these providers to run Sunset Soul. Each handles data only to provide its service to us:</p>
        <List>
          <li>
            <strong>Cloudflare</strong>: runs the app, stores photos and recordings, sends email, transcribes speech, and
            stores database backups.
          </li>
          <li>
            <strong>DigitalOcean</strong>: hosts the database server.
          </li>
          <li>
            <strong>Anthropic</strong>: the Claude AI models, for scores and story help.
          </li>
          <li>
            <strong>PostHog</strong>: the usage events described above.
          </li>
          <li>
            <strong>Google or Apple</strong>, only if you choose to sign in with them.
          </li>
        </List>
        <p>
          When you choose a password, we check it against a list of leaked passwords (Have I Been Pwned). Only the first
          few characters of its scrambled form are sent, never the password itself.
        </p>
        <p>
          Some of these providers are in other countries, including the United States. We&apos;d share data with anyone
          else only if the law requires it, or to protect people from harm.
        </p>
      </Section>

      <Section title="What friends see when you share">
        <p>
          A share link shows the photo, its title and story, the date and the town to anyone who has the link. It never
          shows your recordings, your exact location or your email. You choose the place name friends see, and you can
          stop sharing at any time; the link then stops working. Shared pages are hidden from search engines.
        </p>
      </Section>

      <Section title="Cookies">
        <p>We use a few cookies, all needed for the app to work. None are used for advertising or tracking across sites:</p>
        <List>
          <li>Your sign-in session.</li>
          <li>Whether you last viewed your Journal as cards or photos.</li>
          <li>For friends who react: who they are on this device, so they keep their name and reactions.</li>
          <li>For a day after tapping &ldquo;Start your own Journal&rdquo; on a shared sunset: that you came from one.</li>
        </List>
      </Section>

      <Section title="How long we keep it, and deleting it">
        <p>
          We keep your sunsets until you delete them. Deleting a sunset removes its photo, story and recordings. Deleting
          your account (You → Delete my account) removes your account, every sunset, recording and share link at once.
        </p>
        <p>
          Nightly database backups are kept for 30 days, so deleted data can remain in a backup for up to 30 days before it
          is gone for good. Usage events aren&apos;t linked to your name or email and are kept to measure the service over
          time.
        </p>
      </Section>

      <Section title="Your choices and rights">
        <List>
          <li>
            <strong>Download</strong> everything (photos, recordings and a file of your stories) from{" "}
            <Link href="/account" className="underline">You</Link> → Download your sunsets.
          </li>
          <li>
            <strong>Correct</strong> your name and your sunsets at any time in the app.
          </li>
          <li>
            <strong>Delete</strong> a sunset, or your whole account, in the app.
          </li>
          <li>
            <strong>Ask us</strong> anything about your data, or to exercise any right your local law gives you, at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>. You can also complain to your data
            protection authority.
          </li>
        </List>
      </Section>

      <Section title="Security">
        <p>
          Connections are encrypted, photos and recordings are served only to you (or through a link you made), and the
          database isn&apos;t reachable from the internet. No service is perfectly secure; if something went wrong that
          affected you, we&apos;d tell you.
        </p>
      </Section>

      <Section title="Children">
        <p>
          Sunset Soul isn&apos;t for children under 13 (or the age your country requires to agree to this yourself). If you
          believe a child has made an account, tell us and we&apos;ll delete it.
        </p>
      </Section>

      <Section title="Changes">
        <p>If we change this policy in a way that matters, we&apos;ll tell you in the app or by email before it applies.</p>
      </Section>

      <Section title="Contact">
        <p>
          {OPERATOR}, <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
