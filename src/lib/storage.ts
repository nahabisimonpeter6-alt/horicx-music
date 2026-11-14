export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`horicx:${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
export function writeLocal(key: string, value: unknown) {
  localStorage.setItem(`horicx:${key}`, JSON.stringify(value));
}
let dbPromise: Promise<IDBDatabase> | null = null;
function database() {
  return (dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("horicx-files", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () =>
      reject(
        Error(
          "Browser file storage is unavailable. Allow site storage and try again.",
        ),
      );
  }));
}
export async function putFile(key: string, file: Blob) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put(file, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(
        Error("Could not save this file. Your browser storage may be full."),
      );
  });
}
export async function getFileURL(key: string) {
  const db = await database();
  return new Promise<string | undefined>((resolve, reject) => {
    const r = db.transaction("files").objectStore("files").get(key);
    r.onsuccess = () =>
      resolve(r.result ? URL.createObjectURL(r.result) : undefined);
    r.onerror = () => reject(r.error);
  });
}
export async function deleteFile(key: string) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export function mediaDuration(file: File, kind: "audio" | "video") {
  return new Promise<number>((resolve, reject) => {
    const el = document.createElement(kind);
    const url = URL.createObjectURL(file);
    const done = () => {
      URL.revokeObjectURL(url);
      el.removeAttribute("src");
      el.load();
    };
    const timeout = setTimeout(() => {
      done();
      reject(
        Error("Could not read this media. Try a standard MP3 or MP4 file."),
      );
    }, 12000);
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      clearTimeout(timeout);
      const d = el.duration;
      done();
      Number.isFinite(d) && d > 0
        ? resolve(d)
        : reject(Error("Invalid media duration."));
    };
    el.onerror = () => {
      clearTimeout(timeout);
      done();
      reject(Error("This file cannot be played by your browser."));
    };
    el.src = url;
  });
}
export async function validateFile(
  file: File,
  kind: "audio" | "cover" | "advert",
) {
  const limits = { audio: 20, cover: 2, advert: 30 };
  if (file.size > limits[kind] * 1024 * 1024)
    throw Error(`File too large. Maximum ${limits[kind]} MB.`);
  if (!file.size) throw Error("The selected file is empty.");
  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = (s: string, offset = 0) =>
    s.split("").every((c, i) => b[offset + i] === c.charCodeAt(0));
  const mp3 = ascii("ID3") || (b[0] === 255 && (b[1] & 224) === 224);
  const img =
    (b[0] === 255 && b[1] === 216 && b[2] === 255) ||
    ascii("\x89PNG") ||
    (ascii("RIFF") && ascii("WEBP", 8));
  const vid =
    ascii("ftyp", 4) ||
    (b[0] === 26 && b[1] === 69 && b[2] === 223 && b[3] === 163);
  if (!(kind === "audio" ? mp3 : kind === "cover" ? img : vid))
    throw Error(
      kind === "audio"
        ? "Choose a valid MP3 file."
        : kind === "cover"
          ? "Choose a JPEG, PNG, or WebP image."
          : "Choose a valid MP4 or WebM video.",
    );
}
