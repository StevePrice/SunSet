"use client";
/* eslint-disable @next/next/no-img-element -- previews are local blob: URLs. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import type { Location } from "@/lib/entry-input";
import { MAX_STORY_LENGTH } from "@/lib/entry-input";
import { formatLocation, formatTakenAt } from "@/lib/format";
import { preparePhoto, UnsupportedPhotoError, type PreparedPhoto } from "@/lib/photo-processing";

type LocationChoice = "photo" | "device" | "none";

const pickerClass =
  "flex flex-1 cursor-pointer items-center justify-center rounded-xl border border-zinc-300 px-4 py-6 text-center font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900";

export function NewEntryForm() {
  const router = useRouter();
  const [prepared, setPrepared] = useState<PreparedPhoto | null>(null);
  const [processing, setProcessing] = useState(false);
  const [story, setStory] = useState("");
  const [choice, setChoice] = useState<LocationChoice>("none");
  const [deviceLocation, setDeviceLocation] = useState<Location | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (prepared) URL.revokeObjectURL(prepared.previewUrl);
    };
  }, [prepared]);

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setProcessing(true);
    try {
      const result = await preparePhoto(file);
      setPrepared(result);
      setChoice(result.location ? "photo" : "none");
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

  const location = choice === "photo" ? prepared?.location : choice === "device" ? deviceLocation : null;

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!prepared) return;
    setSaving(true);
    setError(null);
    const body = new FormData();
    body.set("photo", prepared.photo, "photo.jpg");
    body.set("thumb", prepared.thumb, "thumb.jpg");
    body.set("photoWidth", String(prepared.width));
    body.set("photoHeight", String(prepared.height));
    body.set("story", story);
    if (prepared.takenAt) body.set("takenAt", prepared.takenAt.toISOString());
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
      setError(message ?? "Couldn't save your sunset. Check your connection and try again.");
      setSaving(false);
      return;
    }
    const { id } = (await response.json()) as { id: string };
    router.push(`/journal/${id}`);
    router.refresh();
  }

  if (!prepared) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <label className={pickerClass}>
            Take a photo
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onPick} disabled={processing} />
          </label>
          <label className={pickerClass}>
            Choose from your photos
            <input type="file" accept="image/*" className="sr-only" onChange={onPick} disabled={processing} />
          </label>
        </div>
        {processing && <p className="text-zinc-600 dark:text-zinc-400">Preparing your photo…</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <Link href="/journal" className="text-sm underline">
          Back to your Journal
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSave} className="flex flex-col gap-5">
      <img src={prepared.previewUrl} alt="Your sunset" className="w-full rounded-2xl" />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {prepared.takenAt ? `Taken ${formatTakenAt(prepared.takenAt)}` : "Date taken unknown; we'll use today."}
      </p>

      <label className="flex flex-col gap-2">
        <span className="font-medium">The story (optional)</span>
        <textarea
          className="min-h-28 rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="What was happening when you took this?"
          maxLength={MAX_STORY_LENGTH}
          value={story}
          onChange={(e) => setStory(e.target.value)}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">Location</legend>
        {prepared.location && (
          <label className="flex items-center gap-2">
            <input type="radio" name="location" checked={choice === "photo"} onChange={() => setChoice("photo")} />
            Where the photo was taken ({formatLocation(prepared.location)})
          </label>
        )}
        {deviceLocation ? (
          <label className="flex items-center gap-2">
            <input type="radio" name="location" checked={choice === "device"} onChange={() => setChoice("device")} />
            Where I am now ({formatLocation(deviceLocation)})
          </label>
        ) : (
          <button type="button" className="self-start text-sm underline" onClick={useDeviceLocation}>
            Use where I am now
          </button>
        )}
        <label className="flex items-center gap-2">
          <input type="radio" name="location" checked={choice === "none"} onChange={() => setChoice("none")} />
          No location
        </label>
        <p className="text-sm text-zinc-500">Only you can see your Journal, including its locations.</p>
      </fieldset>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-orange-600 px-4 py-3 font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save to my Journal"}
        </button>
        <button
          type="button"
          disabled={saving}
          className="rounded-lg border border-zinc-300 px-4 py-3 dark:border-zinc-700"
          onClick={() => setPrepared(null)}
        >
          Pick another
        </button>
      </div>
    </form>
  );
}
