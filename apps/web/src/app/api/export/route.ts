import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Zip, ZipPassThrough, strToU8 } from "fflate";
import { track } from "@/lib/analytics";
import { namesByEntry } from "@/lib/people";
import { getCurrentUser } from "@/lib/auth";
import { withDrizzle } from "@/lib/db";
import { listEntries, photoKey } from "@/lib/entries";
import { EXPORT_README, exportSets, exportSunset, type ExportSunset } from "@/lib/export";
import { listSetsForExport } from "@/lib/share-sets";
import { listAdditions } from "@/lib/additions";
import { getAfterglow } from "@/lib/reactions";
import { getScore } from "@/lib/scores";
import { listClips } from "@/lib/story/clips";
import { originalWords } from "@/lib/story/prompts";
import { getSession } from "@/lib/story/sessions";

// "Download your sunsets" (You; Phase 7a user rights): a ZIP of every photo, recording and story,
// with journal.json. Streamed file by file and stored without compression (JPEGs and audio are
// already compressed), so a big Journal never has to fit in the Worker's memory at once.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  const { env, ctx } = await getCloudflareContext({ async: true });

  const sets = await withDrizzle((db) => listSetsForExport(db, user.id));
  const sunsets: ExportSunset[] = await withDrizzle(async (db) => {
    const [entries, names] = await Promise.all([listEntries(db, user.id), namesByEntry(db, user.id)]);
    const out: ExportSunset[] = [];
    for (const entry of entries) {
      const [score, afterglow, clips, session, additions] = await Promise.all([
        getScore(db, user.id, entry.id),
        getAfterglow(db, user.id, entry.id),
        listClips(db, user.id, entry.id),
        getSession(db, user.id, entry.id),
        listAdditions(db, user.id, entry.id),
      ]);
      const turns = session?.turns ?? [];
      out.push({ entry, score, afterglow, clips, originalWords: turns.length ? originalWords(turns) : null, people: names.get(entry.id) ?? [], additions });
    }
    return out;
  });

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const zip = new Zip((error, chunk, final) => {
    if (error) {
      void writer.abort(error);
      return;
    }
    void writer.write(chunk);
    if (final) void writer.close();
  });

  const addText = (path: string, text: string) => {
    const file = new ZipPassThrough(`sunset-soul/${path}`);
    zip.add(file);
    file.push(strToU8(text), true);
  };

  const addObject = async (path: string, key: string) => {
    const object = await env.PHOTOS.get(key);
    if (!object) return false;
    const file = new ZipPassThrough(`sunset-soul/${path}`);
    zip.add(file);
    const reader = object.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      file.push(value);
    }
    file.push(new Uint8Array(0), true);
    // Let the download catch up before the next file, so memory stays small.
    await writer.ready;
    return true;
  };

  const produce = (async () => {
    try {
      addText("README.txt", EXPORT_README);
      const records = [];
      const photoOf = new Map<string, string>();
      for (const sunset of sunsets) {
        const { photo, recordings, record } = exportSunset(sunset);
        photoOf.set(sunset.entry.id, photo);
        const hasPhoto = await addObject(photo, photoKey(user.id, sunset.entry.id, "display"));
        const files: string[] = [];
        for (const { clip, path } of recordings) if (await addObject(path, clip.r2Key)) files.push(path);
        records.push({ ...record, photo: hasPhoto ? photo : null, recordings: record.recordings.filter((r) => files.includes(r.file)) });
      }
      addText("journal.json", JSON.stringify({ exportedAt: new Date().toISOString(), name: user.name, email: user.email, sunsets: records, sharedSets: exportSets(sets, photoOf) }, null, 2));
      zip.end();
    } catch (error) {
      console.error(`Export for ${user.id} failed:`, error);
      zip.terminate();
      await writer.abort(error);
    }
  })();
  ctx.waitUntil(produce);
  await track("data_exported", user.id, { sunsets: sunsets.length });

  const day = new Date().toISOString().slice(0, 10);
  return new Response(readable, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="sunset-soul-${day}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
