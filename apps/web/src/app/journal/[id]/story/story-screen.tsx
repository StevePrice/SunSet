"use client";
/* eslint-disable @next/next/no-img-element -- Journal photos are private and served by /api/photos. */

// The story screen (Phase 4e, Build Spec 3.7–3.9). One page in two states:
// - ready (B3a): the typing box first, Need ideas?, the Rather talk than type? panel, Save;
// - review (B3d), after speaking, and Edit from Entry Detail: the recording row with Add more and
//   Delete recording, "Here are your words", Need ideas? and Help me polish it, the title, Save.
// Typing first, speaking right below; the AI helps only when asked. Nothing is lost: each recording
// is saved before it's transcribed, and every AI step falls back to the person's own words.
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { AiPrivacyText } from "@/components/ai-privacy";
import { BackLink } from "@/components/app-nav";
import { buttonClass } from "@/components/button";
import { fieldClass, noticeClass } from "@/components/styles";
import type { StoryStyle } from "@/lib/story/prompts";
import { formatDuration } from "@/lib/story/voice";
import { deleteRecordingAction } from "../../actions";
import { HearYourVoice } from "../recording";
import {
  acceptAiNoticeAction,
  answerAction,
  declineAiNoticeAction,
  openersAction,
  polishAction,
  saveStoryTextAction,
  suggestTitleAction,
  tidyAction,
} from "./actions";
import { BottomSheet, MicIcon, MicNote, RecordingScreen, useVoiceRecorder, VoiceStatus } from "./voice-recorder";
import { WhosIn } from "./whos-in";

type Clip = { id: string; durationMs: number };

const MIC_NOTE_KEY = "ss-mic-note-seen";
const PLACEHOLDER = "Where were you, and what made you stop to take this?";

function micNoteSeen(): boolean {
  try {
    return localStorage.getItem(MIC_NOTE_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberMicNote() {
  try {
    localStorage.setItem(MIC_NOTE_KEY, "1");
  } catch {
    // Private browsing: the note shows again next time, which is harmless.
  }
}

export function StoryScreen({
  entryId,
  mode,
  dateLine,
  initialStory,
  initialTitle,
  initialClips,
  original,
  hasLocation,
  aiHelp,
  noticeSeen,
  hasPeople,
  initialNames,
  knownNames,
}: {
  entryId: string;
  /** "new" from Add your story; "edit" from Edit on Entry Detail. */
  mode: "new" | "edit";
  /** Date and place, beside the thumbnail. */
  dateLine: ReactNode;
  initialStory: string;
  initialTitle: string;
  initialClips: Clip[];
  /** "What you said" or "What you wrote", the person's original words (edit only). */
  original: { label: string; text: string } | null;
  hasLocation: boolean;
  aiHelp: boolean;
  noticeSeen: boolean;
  /** The scorer's people check: null while a new sunset is still being scored. */
  hasPeople: boolean | null;
  /** Names already on this sunset. */
  initialNames: string[];
  /** Names this person has used before, most recent first. */
  knownNames: string[];
}) {
  const [story, setStory] = useState(initialStory);
  const [title, setTitle] = useState(initialTitle);
  const [titleSuggested, setTitleSuggested] = useState(false);
  const [clips, setClips] = useState<Clip[]>(initialClips);
  const [aiOn, setAiOn] = useState(aiHelp);
  const [seen, setSeen] = useState(noticeSeen);
  // An AI step waiting for the first-use notice to be answered.
  const [afterNotice, setAfterNotice] = useState<(() => void) | null>(null);
  const [micNote, setMicNote] = useState(false);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [ideas, setIdeas] = useState<string[]>([]);
  const [nudge, setNudge] = useState<string | null>(null);
  const [polishOpen, setPolishOpen] = useState(false);
  const [removeLocation, setRemoveLocation] = useState(false);
  const [names, setNames] = useState<string[]>(initialNames);
  const [peopleSeen, setPeopleSeen] = useState(hasPeople === true);
  // Edit: "Add who's in it" opens the card when the people check missed someone.
  const [askWho, setAskWho] = useState(false);
  const showWho = peopleSeen || initialNames.length > 0 || askWho;
  const [message, setMessage] = useState<string | null>(null);
  const [tidying, setTidying] = useState(false);
  const [busy, startBusy] = useTransition();
  const [saving, startSaving] = useTransition();
  const box = useRef<HTMLTextAreaElement>(null);

  const review = mode === "edit" || clips.length > 0;
  const hasWords = story.trim() !== "";

  /** Runs an AI step, showing the first-use notice first if it hasn't been answered. */
  function withNotice(step: () => void) {
    if (seen) step();
    else setAfterNotice(() => step);
  }

  function appendWords(text: string) {
    setStory((current) => (current.trim() ? `${current.trim()}\n\n${text}` : text));
  }

  const voice = useVoiceRecorder({
    entryId,
    onClip: (clip) => setClips((list) => [...list, clip]),
    onTranscript: (text, clipId) => {
      // Kept as one spoken answer ("What you said", playback), then tidied into the box.
      void answerAction(entryId, nudge, text, [clipId]);
      setTidying(true);
      void tidyAction(entryId, text)
        .catch(() => ({ text }))
        .then((tidied) => {
          appendWords(tidied.text || text);
          setTidying(false);
          if (!title.trim() && !titleSuggested) suggestTitle(`${story}\n\n${tidied.text || text}`);
        });
    },
    onTypeInstead: (why) => {
      setMessage(why ?? null);
      box.current?.focus();
    },
  });

  function startVoice() {
    withNotice(() => {
      if (micNoteSeen()) void voice.start();
      else setMicNote(true);
    });
  }

  function suggestTitle(words: string) {
    void suggestTitleAction(entryId, words).then((result) => {
      if ("title" in result) {
        setTitle((current) => (current.trim() ? current : result.title));
        setTitleSuggested(true);
      }
    });
  }

  // Edit on an entry with a story but no title: suggest one once.
  useEffect(() => {
    if (mode === "edit" && aiOn && seen && !initialTitle && initialStory.trim()) suggestTitle(initialStory);
    // Only when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadIdeas(more: boolean) {
    startBusy(async () => {
      const result = await openersAction(entryId, more);
      setIdeas(result.view.openers);
      setMessage(result.error ?? null);
    });
  }

  function openIdeas() {
    if (ideasOpen) return setIdeasOpen(false);
    withNotice(() => {
      setIdeasOpen(true);
      if (!ideas.length) loadIdeas(false);
    });
  }

  // A new sunset is usually still being scored when this screen opens: ask for the people check
  // every few seconds for up to a minute, and show "Who's in this one?" if it says yes.
  useEffect(() => {
    if (hasPeople !== null) return;
    const started = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - started > 60_000) return clearInterval(timer);
      const response = await fetch(`/api/entries/${entryId}/people`, { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const { hasPeople: found } = (await response.json()) as { hasPeople: boolean | null };
      if (found !== null) clearInterval(timer);
      if (found) setPeopleSeen(true);
    }, 3000);
    return () => clearInterval(timer);
  }, [entryId, hasPeople]);

  function save() {
    setMessage(null);
    startSaving(async () => {
      const result = await saveStoryTextAction(entryId, { story, title, removeLocation, ...(showWho && { names }) });
      if (result?.error) setMessage(result.error);
    });
  }

  const header = (
    <>
      <div className="flex items-center gap-4">
        <img src={`/api/photos/${entryId}/thumb`} alt="" className="size-18 shrink-0 rounded-ss-md object-cover" />
        <p className="text-caption text-ink-muted">{dateLine}</p>
      </div>
      <h1 className="font-serif text-title-1">The story behind this moment</h1>
    </>
  );

  const textLink = "inline-flex min-h-12 items-center gap-2 text-label font-bold underline disabled:opacity-50";

  return (
    <div className="flex flex-col gap-5">
      <BackLink href={`/journal/${entryId}`} label="Back" />
      {header}

      {clips.length > 0 && (
        <div className="flex flex-col gap-1">
          <HearYourVoice
            key={clips.map((c) => c.id).join()}
            clips={clips.map((c) => `/api/clips/${c.id}`)}
            title="Your recording"
            subtitle={`${formatDuration(clips.reduce((total, c) => total + c.durationMs, 0))} · Private until you share it`}
            action={
              aiOn && (
                <button type="button" onClick={startVoice} disabled={voice.state.kind !== "idle"} className={`${textLink} shrink-0`}>
                  <MicIcon size={20} />
                  Add more
                </button>
              )
            }
          />
          <DeleteRecording entryId={entryId} onDeleted={() => setClips([])} />
        </div>
      )}

      {message && (
        <p role="alert" className={noticeClass}>
          {message}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {review && (
          <label htmlFor="story" className="text-caption text-ink-muted">
            Here are your words. Change anything you like.
          </label>
        )}
        {nudge && (
          <div className="flex items-start gap-3 rounded-ss-md bg-surface-sunken p-3">
            <p className="flex-1 font-serif">{nudge}</p>
            <button type="button" onClick={() => setNudge(null)} aria-label="Remove this idea" className="flex size-12 shrink-0 items-center justify-center text-ink-muted">
              ✕
            </button>
          </div>
        )}
        <textarea
          id="story"
          ref={box}
          value={story}
          onChange={(e) => setStory(e.target.value)}
          aria-label={review ? undefined : "Your story"}
          placeholder={PLACEHOLDER}
          className={`${fieldClass} ss-story min-h-60`}
        />
        {tidying && <p className="animate-pulse text-caption text-ink-muted">Tidying up your words…</p>}
      </div>

      {aiOn && (
        <div className="flex flex-wrap items-center justify-between gap-x-6">
          <button type="button" onClick={openIdeas} aria-expanded={ideasOpen} className={textLink}>
            <LightbulbIcon />
            Need ideas?
          </button>
          {hasWords && (
            <button type="button" onClick={() => withNotice(() => setPolishOpen((open) => !open))} aria-expanded={polishOpen} className={textLink}>
              <WandIcon />
              Help me polish it
            </button>
          )}
        </div>
      )}

      {ideasOpen && (
        <StoryIdeas
          ideas={ideas}
          loading={busy}
          onPick={(idea) => {
            setNudge(idea);
            box.current?.focus();
          }}
          onMore={() => loadIdeas(true)}
          onClose={() => setIdeasOpen(false)}
        />
      )}

      {polishOpen && hasWords && (
        <Polish
          entryId={entryId}
          words={story}
          onUse={(text, suggested) => {
            setStory(text);
            if (suggested && !title.trim()) {
              setTitle(suggested);
              setTitleSuggested(true);
            }
            setPolishOpen(false);
          }}
          onClose={() => setPolishOpen(false)}
        />
      )}

      {aiOn && clips.length === 0 && (
        <div className="flex items-center gap-4 rounded-ss-lg bg-surface-sunken p-4">
          <button
            type="button"
            onClick={startVoice}
            disabled={voice.state.kind !== "idle"}
            aria-label="Record your story"
            className="flex size-16 shrink-0 items-center justify-center rounded-ss-pill border-[1.5px] border-border-subtle bg-surface-raised text-ink disabled:opacity-50"
          >
            <MicIcon size={28} />
          </button>
          <div className="flex flex-col gap-1">
            <p className="text-label font-bold">Rather talk than type?</p>
            <p className="text-caption text-ink-muted">Tell it in your own voice. We&apos;ll write it down, and you can hear it again later.</p>
          </div>
        </div>
      )}

      <VoiceStatus state={voice.state} onRetry={() => void voice.retry()} onTypeInstead={voice.typeInstead} />

      {showWho ? (
        <WhosIn known={knownNames} picked={names} onChange={setNames} detected={peopleSeen} />
      ) : (
        mode === "edit" && (
          <button type="button" onClick={() => setAskWho(true)} className={`${textLink} self-start`}>
            Add who&apos;s in it
          </button>
        )
      )}

      {review && (
        <div className="flex flex-col gap-2">
          <label htmlFor="title" className="text-label font-bold">
            Title
          </label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className={`${fieldClass} font-serif`} />
          {titleSuggested && <p className="text-caption text-ink-muted">Suggested from your photo and story. Change it if you like.</p>}
        </div>
      )}

      {mode === "edit" && hasLocation && (
        <label className="flex min-h-12 items-center gap-3 text-label">
          <input type="checkbox" checked={removeLocation} onChange={(e) => setRemoveLocation(e.target.checked)} className="size-5" />
          Remove the location
        </label>
      )}

      <button type="button" onClick={save} disabled={saving || tidying || voice.state.kind === "uploading"} className={buttonClass("action", "w-full")}>
        {saving ? "Saving…" : "Save"}
      </button>
      {!review && <p className="text-center text-caption text-ink-muted">Not ready? Save now and add your story any time.</p>}
      {clips.length > 0 && (
        <p className="text-caption text-ink-muted">
          AI turned your recording into text{titleSuggested ? " and suggested the title" : ""}. Your recording and story stay private until you share them.
        </p>
      )}

      {original && (
        <details className="rounded-ss-lg bg-surface-raised p-4">
          <summary className="cursor-pointer text-label font-bold">{original.label}</summary>
          <p className="mt-3 whitespace-pre-wrap text-ink-story">{original.text}</p>
        </details>
      )}

      {voice.state.kind === "recording" && (
        <RecordingScreen elapsedMs={voice.state.elapsedMs} onStop={voice.stop} onCancel={voice.cancel} header={header} />
      )}
      {micNote && (
        <MicNote
          onContinue={() => {
            rememberMicNote();
            setMicNote(false);
            void voice.start();
          }}
          onTypeInstead={() => {
            setMicNote(false);
            box.current?.focus();
          }}
        />
      )}
      {afterNotice && (
        <FirstUseNotice
          onContinue={async () => {
            await acceptAiNoticeAction();
            setSeen(true);
            const step = afterNotice;
            setAfterNotice(null);
            step();
          }}
          onDecline={async () => {
            await declineAiNoticeAction();
            setSeen(true);
            setAiOn(false);
            setAfterNotice(null);
            setIdeasOpen(false);
            setPolishOpen(false);
          }}
        />
      )}
    </div>
  );
}

/** Shown once, the first time a person uses an AI step (Story Capture PRD 6.9). */
function FirstUseNotice({ onContinue, onDecline }: { onContinue: () => Promise<void>; onDecline: () => Promise<void> }) {
  const [pending, startPending] = useTransition();
  return (
    <BottomSheet labelledBy="ai-notice-title">
      <h2 id="ai-notice-title" className="font-serif text-title-2">
        Before we start
      </h2>
      <AiPrivacyText />
      <p className="text-ink-muted">You can turn AI story help off at any time in your account.</p>
      <button type="button" disabled={pending} className={buttonClass("action", "w-full")} onClick={() => startPending(onContinue)}>
        Continue
      </button>
      <button type="button" disabled={pending} className="inline-flex min-h-12 items-center self-center text-label underline" onClick={() => startPending(onDecline)}>
        Turn off AI help and type
      </button>
    </BottomSheet>
  );
}

/** Story ideas (Build Spec 3.9): three questions for this photo; a tapped one sits above the box. */
function StoryIdeas({
  ideas,
  loading,
  onPick,
  onMore,
  onClose,
}: {
  ideas: string[];
  loading: boolean;
  onPick: (idea: string) => void;
  onMore: () => void;
  onClose: () => void;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-ss-lg bg-surface-sunken p-4" aria-labelledby="ideas-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="ideas-title" className="font-serif text-title-3">
          Story ideas
        </h2>
        <button type="button" onClick={onClose} aria-label="Close story ideas" className="flex size-12 items-center justify-center text-ink-muted">
          ✕
        </button>
      </div>
      <p className="text-caption text-ink-muted">Tap one to keep it above your story while you write.</p>
      {loading && !ideas.length ? (
        <p className="animate-pulse text-ink-muted">Thinking of a few ideas…</p>
      ) : (
        ideas.map((idea) => (
          <button key={idea} type="button" onClick={() => onPick(idea)} className={buttonClass("secondary", "w-full justify-start text-left font-normal")}>
            {idea}
          </button>
        ))
      )}
      <button type="button" onClick={onMore} disabled={loading} className="inline-flex min-h-12 items-center self-start text-label underline disabled:opacity-50">
        More ideas
      </button>
    </section>
  );
}

type Kind = "my" | "crafted";
type Length = "line" | "short" | "full";
const LENGTHS: { key: Length; label: string }[] = [
  { key: "line", label: "One line" },
  { key: "short", label: "Short" },
  { key: "full", label: "Fuller" },
];

/** Help me polish it: My story (three lengths) or Crafted story, from the words in the box. */
function Polish({
  entryId,
  words,
  onUse,
  onClose,
}: {
  entryId: string;
  words: string;
  onUse: (text: string, title: string | null) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<Kind>("my");
  const [length, setLength] = useState<Length>("short");
  const [photoDetails, setPhotoDetails] = useState(true);
  const style: StoryStyle = kind === "my" ? `my-${length}` : photoDetails ? "crafted-photo" : "crafted-plain";
  const [versions, setVersions] = useState<Partial<Record<StoryStyle, { text: string; title: string | null; error?: string }>>>({});
  const [loading, startLoading] = useTransition();
  const version = versions[style];

  useEffect(() => {
    if (versions[style]) return;
    startLoading(async () => {
      const result = await polishAction(entryId, style, words);
      setVersions((v) => ({ ...v, [style]: result }));
    });
    // Each version is written the first time it's chosen, from the words when the panel opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style]);

  const tab = (active: boolean) =>
    `min-h-12 rounded-ss-pill px-4 text-label ${active ? "bg-surface-raised font-bold text-ink" : "text-ink-muted"}`;

  return (
    <section className="flex flex-col gap-3 rounded-ss-lg bg-surface-sunken p-4" aria-labelledby="polish-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="polish-title" className="font-serif text-title-3">
          Help me polish it
        </h2>
        <button type="button" onClick={onClose} aria-label="Close" className="flex size-12 items-center justify-center text-ink-muted">
          ✕
        </button>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Story style">
        <button type="button" className={tab(kind === "my")} aria-pressed={kind === "my"} onClick={() => setKind("my")}>
          My story
        </button>
        <button type="button" className={tab(kind === "crafted")} aria-pressed={kind === "crafted"} onClick={() => setKind("crafted")}>
          Crafted story
        </button>
      </div>
      {kind === "my" ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Length">
          {LENGTHS.map((l) => (
            <button key={l.key} type="button" className={tab(length === l.key)} aria-pressed={length === l.key} onClick={() => setLength(l.key)}>
              {l.label}
            </button>
          ))}
        </div>
      ) : (
        <label className="flex min-h-12 items-center gap-3 text-label">
          <input type="checkbox" checked={photoDetails} onChange={(e) => setPhotoDetails(e.target.checked)} className="size-5" />
          Add details from my photo
        </label>
      )}
      {loading && !version ? (
        <p className="min-h-32 animate-pulse rounded-ss-md bg-surface-raised p-4 text-ink-muted">Writing your story…</p>
      ) : (
        version && (
          <>
            {version.error && <p className={noticeClass}>{version.error}</p>}
            <p className="ss-story rounded-ss-md bg-surface-raised p-4 whitespace-pre-wrap text-ink-story">{version.text}</p>
            <button type="button" onClick={() => onUse(version.text, version.title)} className={buttonClass("secondary", "w-full")}>
              Use this version
            </button>
          </>
        )
      )}
      <p className="text-caption text-ink-muted">Your own words stay in the box until you choose a version. You can change anything after.</p>
    </section>
  );
}

function DeleteRecording({ entryId, onDeleted }: { entryId: string; onDeleted: () => void }) {
  const [pending, startPending] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="inline-flex min-h-12 items-center gap-2 self-start text-caption text-ink-muted underline disabled:opacity-50"
      onClick={() => {
        if (!confirm("Delete your recording? Your words stay. This can't be undone.")) return;
        startPending(async () => {
          await deleteRecordingAction(entryId);
          onDeleted();
        });
      }}
    >
      <TrashIcon />
      {pending ? "Deleting…" : "Delete recording (your words stay)"}
    </button>
  );
}

function LightbulbIcon() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4" />
    </svg>
  );
}

function WandIcon() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72M14 7l3 3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}

