/** Read-only launch gate. It never creates accounts, seeds songs or changes cloud state. */
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { readFileSync } from "node:fs";
const publicProject = JSON.parse(
  readFileSync(
    new URL("../src/lib/public-project.json", import.meta.url),
    "utf8",
  ),
);
try {
  process.loadEnvFile(".env.local");
} catch {}
const failures = [];
const url = (process.env.VITE_SUPABASE_URL ?? publicProject.url)?.trim(),
  key = (
    process.env.VITE_SUPABASE_ANON_KEY ?? publicProject.publishableKey
  )?.trim();
if (!url || !key)
  failures.push(
    "Supabase is not configured. Set the project URL and public publishable/anon key in the build environment.",
  );
if (key?.startsWith("sb_secret_"))
  failures.push("A server secret key must never be used in the frontend.");
try {
  await access("dist/index.html");
} catch {
  failures.push("Run npm run build before checking the production package.");
}
for (const target of ["dist/audio", "dist/demo-advert.mp4"]) {
  try {
    await access(target);
    failures.push(`${target} must not be included in production.`);
  } catch {}
}
try {
  const files = await readdir("dist/assets");
  for (const file of files.filter((f) => f.endsWith(".js"))) {
    const text = await readFile(path.join("dist/assets", file), "utf8");
    if (
      /Luna Vale|Sol Theory|Neon Atlas|Juno Bloom|Milo Rivers|demo-advert\.mp4/.test(
        text,
      )
    )
      failures.push("A production bundle contains sample catalogue data.");
  }
} catch {}
if (url && key && !key.startsWith("sb_secret_")) {
  try {
    const response = await fetch(
      `${url.replace(/\/$/, "")}/functions/v1/music-api`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: key },
        body: JSON.stringify({ action: "status" }),
        signal: AbortSignal.timeout(20000),
      },
    );
    const state = await response.json();
    if (!response.ok || state.database !== true)
      throw Error(
        "The database and deployed music-api health check could not be verified.",
      );
    if (!state.tracks)
      failures.push(
        "Upload and publish your first real song before opening listening.",
      );
    if (!state.activeAdverts)
      failures.push(
        "Upload and activate a real advert to enable listening passes.",
      );
    console.log("Verified: cloud database and music API are reachable.");
  } catch (e) {
    failures.push(
      e instanceof Error
        ? e.message
        : "The cloud connection could not be verified.",
    );
  }
}
if (failures.length) {
  console.error("NOT READY TO LAUNCH:");
  for (const message of failures) console.error(`- ${message}`);
  process.exitCode = 1;
} else
  console.log(
    "Production checks passed: real cloud catalogue, active advert and clean static package.",
  );
