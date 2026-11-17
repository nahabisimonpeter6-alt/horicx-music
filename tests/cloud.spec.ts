/** Cloud UI contracts use explicit fake HTTP responses, not a real project. */
import { test, expect } from "@playwright/test";
import { demoTracks, demoArtists } from "../src/lib/demo";
test.use({ baseURL: "http://127.0.0.1:5174" });
test.beforeEach(async ({ page }) => {
  await page.route(
    "https://horicx-test.supabase.co/functions/v1/music-api",
    async (route) => {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: body.action === "catalog" ? 200 : 401,
        contentType: "application/json",
        body: JSON.stringify(
          body.action === "catalog"
            ? {
                tracks: demoTracks,
                artists: demoArtists,
                albums: [],
                minutes: 30,
              }
            : { error: "Please sign in to continue." },
        ),
      });
    },
  );
});
test("cloud visitors must sign in before creating a playlist", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".mode-badge")).toHaveText("Cloud mode");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Create playlist", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByRole("dialog")).toContainText(
    "Sign in to your favourites",
  );
  await expect(page.getByLabel("Email address")).toBeVisible();
});
test("cloud visitors must sign in before saving favourites", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Like Golden Hour", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("horicx:favourites")),
  ).toBeNull();
});
test("cloud admin route is guarded for visitors", async ({ page }) => {
  await page.goto("/#/admin");
  await expect(
    page.getByRole("heading", { name: "Owner’s studio" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Upload a song", exact: true }),
  ).toHaveCount(0);
});
test("cloud authentication failures are shown without pretending to sign in", async ({
  page,
}) => {
  await page.route(
    "https://horicx-test.supabase.co/auth/v1/token?grant_type=password",
    (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "invalid_grant",
          error_description: "Invalid login credentials",
          msg: "Invalid login credentials",
        }),
      }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email address").fill("listener@example.test");
  await page.getByLabel("Password", { exact: true }).fill("incorrect-password");
  await page
    .getByRole("dialog")
    .locator("form")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Invalid login credentials",
  );
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toHaveCount(0);
});
test("cloud catalogue errors remain errors and never fall back to the demo", async ({
  page,
}) => {
  await page.route(
    "https://horicx-test.supabase.co/functions/v1/music-api",
    (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "The connected database is unavailable.",
        }),
      }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "We couldn’t load the music." }),
  ).toBeVisible();
  await expect(page.locator(".catalog-error")).toContainText(
    "The connected database is unavailable.",
  );
  await expect(page.locator(".track-card")).toHaveCount(0);
});

test("following an artist in cloud mode requires a registered account", async ({
  page,
}) => {
  await page.goto("/#/artist/artist-0");
  await page
    .getByRole("button", { name: "Follow artist", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByLabel("Email address")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("horicx:followed-artists")),
  ).toBeNull();
});
