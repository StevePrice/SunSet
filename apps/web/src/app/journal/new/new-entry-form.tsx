"use client";
/* eslint-disable @next/next/no-img-element -- previews are local blob: URLs. */

// New sunset (Phase 4e, Build Spec 3.5), in two steps:
// - B2a, choose a photo: Take a photo (camera) or Choose from your photos, as two large cards;
// - B2b, photo chosen: the photo, Choose a different photo, Date taken and Place (each with
//   Change), then Add your story (saves first, then opens the story screen) or Save for now.
// Cancel at top left, no header button, no bottom bar. The story is told on the story screen.
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { Button } from "@/components/button";
import { fieldClass, noticeClass } from "@/components/styles";
import { MAX_PLACE_NAME_LENGTH, type Location } from "@/lib/entry-input";
import { formatTakenAt } from "@/lib/format";
import { preparePhoto, UnsupportedPhotoError, type PreparedPhoto } from "@/lib/photo-processing";

type LocationChoice = "photo" | "device" | "none";

const SAVE_FAILED = "Couldn't save your sunset. Check your connection and try again.";

/** yyyy-mm-dd in the phone's time zone, for the date field. */
function dateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function NewEntryForm() {
  const router = useRouter();
  const [prepared, setPrepared] = useState<PreparedPhoto | null>(null);
  const [processing, setProcessing] = useState(false);
  const [takenAt, setTakenAt] = useState<Date | null>(null);
  const [editing, setEditing] = useState<"date" | "place" | null>(null);
  const [choice, setChoice] = useState<LocationChoice>("none");
  const [deviceLocation, setDeviceLocation] = useState<Location | null>(null);
  // The nearest town for the chosen location (undefined while looking), and a name typed instead.
  const [town, setTown] = useState<{ key: string; name: string | null } | null>(null);
  const [typedPlace, setTypedPlace] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (prepared) URL.revokeObjectURL(prepared.previewUrl);
    };
  }, [prepared]);

  function cancel() {
    // Back to where they came from (the header's New sunset is on several screens).
    if (window.history.length > 1) router.back();
    else router.push("/journal");
  }

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setProcessing(true);
    try {
      const result = await preparePhoto(file);
      setPrepared(result);
      setTakenAt(result.takenAt);
      setChoice(result.location ? "photo" : "none");
      setEditing(null);
    } catch (e) {
      setError(e instanceof UnsupportedPhotoError ? e.message : "Couldn't open that photo. Please try another.");
    } finally {
      setProcessing(false);
    }
  }

  function useDeviceLocation() {
    if (!navigator.geolocation) {
      setError("This browser can't share your location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeviceLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setChoice("device");
      },
      () => setError("Couldn't get your location. You can save without one."),
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }

  /** A new date from the date field, keeping the photo's time of day. */
  function changeDate(value: string) {
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return;
    const base = takenAt ?? new Date();
    setTakenAt(new Date(y, m - 1, d, base.getHours(), base.getMinutes(), base.getSeconds()));
  }

  const location = choice === "photo" ? prepared?.location : choice === "device" ? deviceLocation : null;
  const locationKey = location ? `${location.latitude},${location.longitude}` : null;

  // Look up the town in words for the chosen location (our own database; nothing leaves it).
  useEffect(() => {
    if (!locationKey || town?.key === locationKey) return;
    let live = true;
    const [lat, lng] = locationKey.split(",");
    fetch(`/api/places?lat=${lat}&lng=${lng}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ name: string | null }>) : { name: null }))
      .catch(() => ({ name: null }))
      .then((result) => live && setTown({ key: locationKey, name: result.name }));
    return () => {
      live = false;
    };
  }, [locationKey, town?.key]);

  // Add your story saves first, so the photo is safe whatever happens on the story screen.
  async function save(tellStory: boolean) {
    if (!prepared) return;
    setSaving(true);
    setError(null);
    const body = new FormData();
    body.set("photo", prepared.photo, "photo.jpg");
    body.set("thumb", prepared.thumb, "thumb.jpg");
    body.set("photoWidth", String(prepared.width));
    body.set("photoHeight", String(prepared.height));
    body.set("story", "");
    body.set("timeZone", Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (typedPlace.trim()) body.set("placeName", typedPlace.trim());
    if (takenAt) body.set("takenAt", takenAt.toISOString());
    if (location) {
      body.set("latitude", String(location.latitude));
      body.set("longitude", String(location.longitude));
    }
    const response = await fetch("/api/entries", { method: "POST", body }).catch(() => null);
    if (!response?.ok) {
      const message = await response
        ?.json()
        .then((r) => (r as { error?: string }).error)
        .catch(() => null);
      setError(message ?? SAVE_FAILED);
      setSaving(false);
      return;
    }
    const { id } = (await response.json()) as { id: string };
    router.push(tellStory ? `/journal/${id}/story` : `/journal/${id}`);
    router.refresh();
  }

  const cancelButton = (
    <button type="button" onClick={cancel} className="inline-flex min-h-12 items-center self-start text-label font-bold">
      Cancel
    </button>
  );

  if (!prepared) {
    return (
      <div className="flex flex-col gap-6">
        {cancelButton}
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-title-1">New sunset</h1>
          <p>Add one you&apos;ve already taken, or one you&apos;re watching now.</p>
        </div>
        <div className="flex flex-col gap-4">
          {/* Choose from your photos first (decided 2026-11-22): most people take sunsets with the
              phone's own camera and add the best shot later. */}
          <PhotoChoice icon={<PhotoIcon />} title="Choose from your photos" note="A sunset you've already taken" disabled={processing} onChange={onPick} />
          <PhotoChoice
            icon={<CameraIcon />}
            title="Take a photo"
            note="Opens the camera. The photo is saved in your Journal."
            capture
            disabled={processing}
            onChange={onPick}
          />
        </div>
        {processing && (
          <p role="status" className="animate-pulse text-ink-muted">
            Preparing your photo…
          </p>
        )}
        {error && (
          <p role="alert" className={noticeClass}>
            {error}
          </p>
        )}
        <div className="flex items-start gap-3 rounded-ss-lg bg-surface-sunken p-4">
          <CalendarIcon />
          <p>Older photos keep the date and place they were taken, so they land in the right spot in your Journal. You can change either one.</p>
        </div>
      </div>
    );
  }

  const lookedUp = locationKey && town?.key === locationKey ? town.name : undefined;
  const placeText = typedPlace.trim()
    ? typedPlace.trim()
    : !location
      ? "No place"
      : lookedUp === undefined
        ? "Finding the town…"
        : (lookedUp ?? "No town nearby");
  return (
    <div className="flex flex-col gap-5">
      {cancelButton}
      <h1 className="font-serif text-title-1">New sunset</h1>
      <img src={prepared.previewUrl} alt="Your sunset" className="w-full rounded-ss-lg" />
      <label className="inline-flex min-h-12 cursor-pointer items-center self-start text-label font-bold underline">
        Choose a different photo
        <input type="file" accept="image/*" className="sr-only" onChange={onPick} disabled={processing || saving} />
      </label>
      {processing && (
        <p role="status" className="animate-pulse text-ink-muted">
          Preparing your photo…
        </p>
      )}

      <div className="flex flex-col divide-y divide-divider rounded-ss-lg bg-surface-raised">
        <DetailRow
          icon={<CalendarIcon />}
          label="Date taken"
          value={takenAt ? formatTakenAt(takenAt) : "Today"}
          open={editing === "date"}
          onChange={() => setEditing(editing === "date" ? null : "date")}
        >
          <label className="flex flex-col gap-1 text-caption">
            The day you took it
            <input
              type="date"
              className={fieldClass}
              max={dateInputValue(new Date())}
              value={dateInputValue(takenAt ?? new Date())}
              onChange={(e) => changeDate(e.target.value)}
            />
          </label>
        </DetailRow>
        <DetailRow
          icon={<PinIcon />}
          label="Place"
          value={placeText}
          open={editing === "place"}
          onChange={() => setEditing(editing === "place" ? null : "place")}
        >
          <fieldset className="flex flex-col gap-1">
            <legend className="sr-only">Place</legend>
            {prepared.location && (
              <label className="flex min-h-12 items-center gap-3">
                <input type="radio" name="location" className="size-5" checked={choice === "photo"} onChange={() => setChoice("photo")} />
                Where the photo was taken
              </label>
            )}
            {deviceLocation ? (
              <label className="flex min-h-12 items-center gap-3">
                <input type="radio" name="location" className="size-5" checked={choice === "device"} onChange={() => setChoice("device")} />
                Where I am now
              </label>
            ) : (
              <button type="button" className="inline-flex min-h-12 items-center self-start text-label underline" onClick={useDeviceLocation}>
                Use where I am now
              </button>
            )}
            <label className="flex min-h-12 items-center gap-3">
              <input type="radio" name="location" className="size-5" checked={choice === "none"} onChange={() => setChoice("none")} />
              No place
            </label>
            <label className="mt-2 flex flex-col gap-1 text-caption">
              Or name it yourself
              <input
                className={fieldClass}
                value={typedPlace}
                onChange={(e) => setTypedPlace(e.target.value)}
                maxLength={MAX_PLACE_NAME_LENGTH}
                placeholder="e.g. Sequoia National Park"
              />
            </label>
            <p className="text-caption text-ink-muted">Your Journal is private, including its places. The exact place is never shared.</p>
          </fieldset>
        </DetailRow>
      </div>

      {error && (
        <p role="alert" className={noticeClass}>
          {error}
        </p>
      )}
      <Button variant="action" className="w-full" disabled={saving || processing} onClick={() => save(true)}>
        {saving ? "Saving…" : "Add your story"}
      </Button>
      <button
        type="button"
        disabled={saving || processing}
        onClick={() => save(false)}
        className="inline-flex min-h-12 items-center self-center text-label font-bold underline disabled:opacity-50"
      >
        Save for now
      </button>
      <p className="text-center text-caption text-ink-muted">You can add a story any time.</p>
    </div>
  );
}

/** One of the two large choices on step one: the whole card is the file picker. */
function PhotoChoice({
  icon,
  title,
  note,
  capture = false,
  disabled,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  note: string;
  capture?: boolean;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="flex min-h-28 cursor-pointer items-center gap-5 rounded-ss-lg border-[1.5px] border-border-subtle bg-surface-raised px-5 py-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus-ring">
      <span className="flex size-16 shrink-0 items-center justify-center rounded-ss-pill bg-surface">{icon}</span>
      <span className="flex flex-col gap-1">
        <span className="font-serif text-title-3">{title}</span>
        <span className="text-caption text-ink-muted">{note}</span>
      </span>
      <input type="file" accept="image/*" {...(capture && { capture: "environment" })} className="sr-only" onChange={onChange} disabled={disabled} />
    </label>
  );
}

/** A Date taken or Place row with Change, opening its editor underneath. */
function DetailRow({
  icon,
  label,
  value,
  open,
  onChange,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  open: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      <div className="flex items-center gap-4">
        {icon}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-caption text-ink-muted">{label}</span>
          <span>{value}</span>
        </div>
        <button type="button" onClick={onChange} aria-expanded={open} className="inline-flex min-h-12 items-center text-label font-bold underline">
          {open ? "Done" : "Change"}
        </button>
      </div>
      {open && children}
    </div>
  );
}

const iconProps = {
  "aria-hidden": true,
  width: 26,
  height: 26,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "shrink-0",
} as const;

function CameraIcon() {
  return (
    <svg {...iconProps}>
      <path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg {...iconProps}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg {...iconProps}>
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
