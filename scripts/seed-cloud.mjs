/** Seed through the SAME validated admin API as the browser. No service-role key. */
import { createClient } from "@supabase/supabase-js";
import { readFile, access } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { emitKeypressEvents } from "node:readline";
import process from "node:process";
try {
  await access(".env.local");
  process.loadEnvFile(".env.local");
} catch {
  /* Explicit environment variables also work. */
}
const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
if (!url || !key)
  throw Error(
    "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local first.",
  );
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const prompt = createInterface({
  input: process.stdin,
  output: process.stdout,
});
const email =
  process.env.HORICX_ADMIN_EMAIL ??
  (await prompt.question("Your confirmed administrator email: "));
prompt.close();
async function password() {
  if (process.env.HORICX_ADMIN_PASSWORD)
    return process.env.HORICX_ADMIN_PASSWORD;
  if (!process.stdin.isTTY)
    throw Error(
      "Run this script in an interactive terminal, or provide HORICX_ADMIN_PASSWORD securely through the environment.",
    );
  process.stdout.write("Administrator password (hidden): ");
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return await new Promise((resolve) => {
    let value = "";
    const listener = (str, key) => {
      if (key?.ctrl && key.name === "c") {
        process.stdin.setRawMode(false);
        process.exit(130);
      }
      if (key?.name === "return") {
        process.stdin.off("keypress", listener);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write("\n");
        resolve(value);
      } else if (key?.name === "backspace") value = value.slice(0, -1);
      else if (str && !key?.ctrl) value += str;
    };
    process.stdin.on("keypress", listener);
  });
}
const { data, error } = await client.auth.signInWithPassword({
  email,
  password: await password(),
});
if (error) throw Error(error.message);
const token = data.session.access_token;
async function request(action, body = {}) {
  const r = await fetch(`${url}/functions/v1/music-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...body }),
  });
  const json = await r.json();
  if (!r.ok) throw Error(json.error ?? "API request failed.");
  return json;
}
async function upload(relative, kind, type) {
  const content = await readFile(
    new URL(`../public/${relative}`, import.meta.url),
  );
  const f = new FormData();
  f.append("file", new Blob([content], { type }), relative.split("/").at(-1));
  const r = await fetch(`${url}/functions/v1/music-api?upload=${kind}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${token}` },
    body: f,
  });
  const json = await r.json();
  if (!r.ok) throw Error(json.error ?? "Upload failed.");
  return json.path;
}
const overview = await request("admin_overview");
const entries = [
  ["After Hours", "Luna Vale", "Electronic", 92],
  ["Golden Hour", "Sol Theory", "Afrobeats", 104],
  ["City Lights", "Neon Atlas", "Electronic", 116],
  ["Slow Mornings", "Juno Bloom", "Lo-fi", 78],
  ["Wildflower", "Milo Rivers", "R&B", 100],
  ["Ocean Drive", "Coastline", "Chill", 110],
];
for (const [title, artist, genre, bpm] of entries) {
  if (overview.tracks.some((t) => t.title === title && t.artist === artist)) {
    console.log(`Skipping existing release: ${title}`);
    continue;
  }
  const slug = title.toLowerCase().replace(" ", "-");
  const audioPath = await upload(`audio/${slug}.mp3`, "audio", "audio/mpeg");
  const coverPath = await upload(`art/${slug}.png`, "cover", "image/png");
  await request("admin_save_track", {
    track: {
      title,
      artist,
      album: title,
      genre,
      duration: (32 * 60) / bpm,
      release_date: "2026-11-14",
      description:
        "Original generated demo audio. Composed and synthesized locally with code; this artist is fictional. See CREDITS.md.",
      published: true,
      original: true,
    },
    audioPath,
    coverPath,
  });
  console.log(`Added original demo release: ${title}`);
}
if (
  !overview.adverts.some((a) => a.title === "Demo advert — Horicx Originals")
) {
  const path = await upload("demo-advert.mp4", "advert", "video/mp4");
  await request("admin_save_advert", {
    title: "Demo advert — Horicx Originals",
    path,
    duration: 8,
    active: true,
    position: 0,
  });
  console.log("Added locally generated 8-second demo advert.");
}
await client.auth.signOut();
console.log("Seed complete. Your cloud catalogue is ready.");
