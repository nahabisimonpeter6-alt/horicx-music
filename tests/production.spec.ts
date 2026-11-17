import { test, expect } from "@playwright/test";
import { readdir, readFile, access } from "node:fs/promises";
import { cloudConfiguration } from "../src/lib/config";
test.use({ baseURL: "http://127.0.0.1:5175" });
test.beforeEach(async ({ page }) => {
  await page.route("**/functions/v1/music-api", (route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ message: "Requested function was not found" }),
    }),
  );
});
test("production displays an honest backend setup state without sample music or a local admin", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".launch-hero h1")).toContainText("Your music.");
  await expect(page.locator(".launch-notice")).toContainText("music API");
  await expect(page.locator(".track-card")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Demo admin studio" }),
  ).toHaveCount(0);
  await expect(page.getByText("Local preview", { exact: true })).toHaveCount(0);
  await page.screenshot({
    path: "test-results/production-setup-desktop.png",
    fullPage: true,
  });
});
test("browser-local flags do not unlock a production administrator route", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("horicx:pass", String(Date.now() + 1800000));
    localStorage.setItem("horicx:admin", "true");
    localStorage.setItem("horicx:favourites", '["after-hours"]');
  });
  await page.goto("/#/admin");
  await expect(page.locator(".launch-notice")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Upload a song", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".admin-track")).toHaveCount(0);
});
test("production assets exclude sample audio, video and fictional artist names", async () => {
  await expect(access("dist/audio")).rejects.toThrow();
  await expect(access("dist/demo-advert.mp4")).rejects.toThrow();
  for (const file of (await readdir("dist/assets")).filter((f) =>
    f.endsWith(".js"),
  )) {
    const text = await readFile(`dist/assets/${file}`, "utf8");
    expect(text).not.toMatch(
      /Luna Vale|Sol Theory|Neon Atlas|Juno Bloom|Milo Rivers|demo-advert\.mp4/,
    );
  }
});
for (const width of [320, 390])
  test(`production connection screen fits ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.locator(".launch-header")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/production-setup-${width}.png`,
      fullPage: true,
    });
  });
test("public project configuration rejects privileged keys and unsafe URLs", () => {
  expect(cloudConfiguration(undefined, "sb_secret_fixture").issue).toBe(
    "private-key",
  );
  expect(
    cloudConfiguration("https://example.supabase.co", "sb_secret_fixture")
      .issue,
  ).toBe("private-key");
  const jwt = `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role: "service_role" }))}.fixture`;
  expect(cloudConfiguration("https://example.supabase.co", jwt).issue).toBe(
    "private-key",
  );
  expect(cloudConfiguration("http://example.com", "public-key").issue).toBe(
    "invalid-url",
  );
  expect(
    cloudConfiguration("https://u:secret@example.supabase.co", "public-key")
      .issue,
  ).toBe("invalid-url");
  expect(
    cloudConfiguration("https://example.supabase.co/", "sb_publishable_fixture")
      .url,
  ).toBe("https://example.supabase.co");
});
