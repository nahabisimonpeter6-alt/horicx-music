import { createClient } from "@supabase/supabase-js";
import { configuration, demoMode } from "./app-config";
export { demoMode };
export const cloudMode = !demoMode;
const { url, key } = configuration;
export const configError = cloudMode && configuration.issue !== null;
export const configurationIssue = configuration.issue;
export const supabase =
  cloudMode && !configError ? createClient(url, key) : null;
export class APIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function api<T = Record<string, unknown>>(
  action: string,
  data: Record<string, unknown> = {},
): Promise<T> {
  if (!supabase)
    throw Error(
      "Cloud configuration is incomplete. Set both Supabase environment variables.",
    );
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const response = await fetch(`${url}/functions/v1/music-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key!,
      Authorization: `Bearer ${session?.access_token ?? key}`,
    },
    body: JSON.stringify({ action, ...data }),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response
    .json()
    .catch(() => ({ error: "The server returned an unreadable response." }));
  if (!response.ok) {
    const message =
      typeof result.error === "string"
        ? result.error
        : (result.error?.message ?? result.message);
    throw new APIError(
      message ??
        (response.status === 404
          ? "The music API has not been deployed for this project."
          : "The request failed. Please try again."),
      response.status,
    );
  }
  return result as T;
}
export async function ensureListener() {
  if (!supabase) throw Error("Supabase is not configured.");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error)
      throw Error(
        "Guest listening is unavailable. Sign in, or ask the owner to enable anonymous sign-ins in Supabase.",
      );
  }
}
export async function uploadCloud(
  file: File,
  kind: string,
  onProgress: (n: number) => void,
): Promise<string> {
  if (!supabase) throw Error("Cloud is not configured.");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw Error("Sign in with an administrator account.");
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${url}/functions/v1/music-api?upload=${kind}`);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", key!);
    xhr.timeout = 120000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () =>
      reject(Error("Upload failed. Check your connection and try again."));
    xhr.ontimeout = () =>
      reject(Error("Upload timed out. Try a smaller file."));
    xhr.onload = () => {
      try {
        const result = JSON.parse(xhr.responseText);
        xhr.status < 300
          ? resolve(result.path)
          : reject(Error(result.error ?? "Upload failed."));
      } catch {
        reject(Error("Invalid server response."));
      }
    };
    const body = new FormData();
    body.append("file", file);
    xhr.send(body);
  });
}
