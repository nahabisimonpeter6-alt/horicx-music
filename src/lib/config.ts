export type CloudConfiguration = {
  url: string;
  key: string;
  issue: "missing" | "invalid-url" | "private-key" | null;
};
export function cloudConfiguration(
  rawUrl?: string,
  rawKey?: string,
): CloudConfiguration {
  const url = rawUrl?.trim() ?? "",
    key = rawKey?.trim() ?? "";
  if (key.startsWith("sb_secret_"))
    return { url, key: "", issue: "private-key" };
  try {
    const claims = JSON.parse(
      atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    if (claims.role === "service_role")
      return { url, key: "", issue: "private-key" };
  } catch {
    /* Publishable keys are not JWTs. */
  }
  if (!url || !key) return { url, key, issue: "missing" };
  try {
    const parsed = new URL(url);
    if (
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== "/" ||
      !(
        parsed.protocol === "https:" ||
        (parsed.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname))
      )
    )
      return { url, key, issue: "invalid-url" };
  } catch {
    return { url, key, issue: "invalid-url" };
  }
  return { url: url.replace(/\/$/, ""), key, issue: null };
}
