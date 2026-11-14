import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
async function pass(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("horicx:pass", String(Date.now() + 1800000)),
  );
}
async function home(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Find your frequency." }),
  ).toBeVisible();
}
test("home loads all original artwork without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await home(page);
  await expect(page.locator(".track-card")).toHaveCount(6);
  await expect
    .poll(() =>
      page
        .locator("img")
        .evaluateAll((imgs) =>
          imgs.every((i) => i.complete && i.naturalWidth > 0),
        ),
    )
    .toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
});
test("search finds songs, artists and genres, and empty results work", async ({
  page,
}) => {
  await home(page);
  await page
    .locator(".primary-nav")
    .getByRole("button", { name: "Search", exact: true })
    .click();
  const search = page.getByRole("textbox", {
    name: "Search music",
    exact: true,
  });
  await search.fill("golden");
  await expect(page.locator(".track-row")).toHaveCount(1);
  await expect(page.locator(".track-row")).toContainText("Golden Hour");
  await search.fill("Luna");
  await expect(page.locator(".track-row")).toHaveCount(1);
  await search.fill("Electronic");
  await expect(page.locator(".track-row")).toHaveCount(2);
  await search.fill("no-such-song");
  await expect(
    page.getByRole("heading", { name: "No sounds found" }),
  ).toBeVisible();
});
test("closing an unfinished ad grants no pass", async ({ page }) => {
  await home(page);
  await page.getByRole("button", { name: "Listen now", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Watch a short ad to unlock 30 minutes of music.",
  );
  await page
    .getByRole("button", { name: "Play demo advert", exact: true })
    .click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Close dialog" }).click();
  expect(
    await page.evaluate(() => Number(localStorage.getItem("horicx:pass") || 0)),
  ).toBe(0);
  await page
    .getByRole("button", { name: "Play After Hours", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
test("finishing the real demo video unlocks audio and playback survives navigation", async ({
  page,
}) => {
  await home(page);
  await page.getByRole("button", { name: "Listen now", exact: true }).click();
  await page
    .getByRole("button", { name: "Play demo advert", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 18000 });
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.locator(".seek-row input").inputValue())
    .not.toBe("0");
  const before = Number(await page.locator(".seek-row input").inputValue());
  await page
    .locator(".primary-nav")
    .getByRole("button", { name: "Browse genres" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Explore your sound." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () =>
      Number(await page.locator(".seek-row input").inputValue()),
    )
    .toBeGreaterThan(before);
  expect(
    await page.evaluate(() => Number(localStorage.getItem("horicx:pass"))),
  ).toBeGreaterThan(Date.now());
});
test("player supports seek, volume, queue, next, previous, shuffle, and repeat", async ({
  page,
}) => {
  await pass(page);
  await home(page);
  await page
    .getByRole("button", { name: "Play After Hours", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("slider", { name: "Seek track" }).fill("7");
  await expect
    .poll(async () =>
      Number(
        await page.getByRole("slider", { name: "Seek track" }).inputValue(),
      ),
    )
    .toBeGreaterThanOrEqual(7);
  await page.getByRole("slider", { name: "Volume", exact: true }).fill("0.2");
  await expect(
    page.getByRole("slider", { name: "Volume", exact: true }),
  ).toHaveValue("0.2");
  await page.getByRole("button", { name: "Shuffle", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Shuffle", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Shuffle", exact: true }).click();
  await page.getByRole("button", { name: "Repeat track" }).click();
  await expect(
    page.getByRole("button", { name: "Repeat track" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Next track" }).click();
  await expect(page.locator(".now-playing")).toContainText("Golden Hour");
  await page.getByRole("button", { name: "Previous track" }).click();
  await expect(page.locator(".now-playing")).toContainText("After Hours");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open queue" }).click();
  await expect(
    page.getByRole("complementary", { name: "Playback queue" }),
  ).toBeVisible();
});
test("favourites and playlists persist, and tracks can be added and removed", async ({
  page,
}) => {
  await home(page);
  await page
    .getByRole("button", { name: "Like Golden Hour", exact: true })
    .click();
  await page
    .locator(".primary-nav")
    .getByRole("button", { name: "Liked songs" })
    .click();
  await expect(page.locator(".track-row")).toContainText("Golden Hour");
  await page.reload();
  await expect(page.locator(".track-row")).toContainText("Golden Hour");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Create playlist", exact: true })
    .first()
    .click();
  await page
    .getByRole("textbox", { name: "Playlist name" })
    .fill("Night drives");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create playlist", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Night drives" }),
  ).toBeVisible();
  await page
    .locator(".primary-nav")
    .getByRole("button", { name: "Search", exact: true })
    .click();
  await page
    .locator(".track-row")
    .filter({ hasText: "Golden Hour" })
    .locator("summary")
    .click();
  await page
    .getByRole("button", { name: "Night drives", exact: true })
    .last()
    .click();
  await page
    .locator(".sidebar-playlist")
    .filter({ hasText: "Night drives" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Night drives" }),
  ).toBeVisible();
  await expect(page.locator(".track-row")).toHaveCount(1);
  await expect(page.locator(".track-row")).toContainText("Golden Hour");
  await page.reload();
  await expect(page.locator(".track-row")).toContainText("Golden Hour");
  await page.locator("summary").click();
  await page
    .locator(".dropdown")
    .getByRole("button", { name: "Night drives" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Make it your own" }),
  ).toBeVisible();
});
test("song and artist details are connected", async ({ page }) => {
  await home(page);
  await page.getByRole("button", { name: "Explore release" }).click();
  await expect(
    page.getByRole("heading", { name: "After Hours", exact: true }),
  ).toBeVisible();
  await page
    .locator(".detail-meta")
    .getByRole("button", { name: "Luna Vale" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Luna Vale", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".track-row")).toHaveCount(1);
});
test("local MP3 upload, draft publication, edit and deletion work", async ({
  page,
}) => {
  await pass(page);
  await home(page);
  await page.locator(".admin-link").click();
  await page
    .getByRole("button", { name: "Upload a song", exact: true })
    .click();
  await page
    .getByLabel("Choose MP3 audio")
    .setInputFiles(path.resolve("public/audio/golden-hour.mp3"));
  await page
    .getByLabel("Song title", { exact: true })
    .fill("My first local song");
  await page
    .getByLabel("Choose cover artwork")
    .setInputFiles(path.resolve("public/art/golden-hour.png"));
  await page.getByLabel("Artist", { exact: true }).fill("Test Artist");
  await page.getByLabel("Album", { exact: true }).fill("Test Album");
  await page.getByRole("button", { name: "Upload song", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  const row = page
    .locator(".admin-track")
    .filter({ hasText: "My first local song" });
  await expect(row).toBeVisible();
  await page.reload();
  await expect(row).toBeVisible();
  await page.goto("/#/search?q=My%20first%20local%20song");
  await page
    .getByRole("button", { name: "Play My first local song", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".now-playing")).toContainText(
    "My first local song",
  );
  await page.goto("/#/admin");
  await expect(row).toBeVisible();
  await row
    .getByRole("button", { name: "Unpublish My first local song", exact: true })
    .click();
  await expect(row).toContainText("Draft");
  await row
    .getByRole("button", { name: "Edit My first local song", exact: true })
    .click();
  await page
    .getByLabel("Song title", { exact: true })
    .fill("Edited local song");
  await page.getByRole("button", { name: "Save release", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page
    .locator(".admin-track")
    .filter({ hasText: "Edited local song" })
    .getByRole("button", { name: "Delete Edited local song", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.locator(".admin-track").filter({ hasText: "Edited local song" }),
  ).toHaveCount(0);
});
test("local advert uploads, activation, order, and listening settings persist", async ({
  page,
}) => {
  await page.goto("/#/admin");
  await page.getByRole("button", { name: "Adverts", exact: true }).click();
  await page.getByRole("button", { name: "Add advert", exact: true }).click();
  await page
    .getByLabel("Choose advert video")
    .setInputFiles(path.resolve("public/demo-advert.mp4"));
  await page.getByLabel("Advert title").fill("My local advert");
  await page
    .getByRole("button", { name: "Upload advert", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  const card = page
    .locator(".advert-card")
    .filter({ hasText: "My local advert" });
  await expect(card).toBeVisible();
  await card.getByRole("checkbox").uncheck();
  await expect(card).toContainText("Inactive");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Listening pass duration (minutes)").fill("15");
  await page.getByRole("button", { name: "Save settings" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByLabel("Listening pass duration (minutes)"),
  ).toHaveValue("15");
});
test("missing adverts recover to browsing without a pass", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "horicx:demo-ad-edit",
      JSON.stringify({ active: false }),
    ),
  );
  await home(page);
  await page.getByRole("button", { name: "Listen now", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "No adverts are available yet.",
  );
  await page.getByRole("button", { name: "Keep browsing" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(
    await page.evaluate(() => localStorage.getItem("horicx:pass")),
  ).toBeNull();
});
for (const width of [320, 360, 390, 768])
  test(`layout is usable at ${width}px without horizontal scrolling`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await home(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (width < 600) {
      await expect(page.locator(".mobile-bottom-nav")).toBeVisible();
      const nav = await page.locator(".mobile-bottom-nav").boundingBox(),
        player = await page.locator(".player").boundingBox();
      expect(player!.y + player!.height).toBeLessThanOrEqual(nav!.y + 1);
    }
    await page.screenshot({
      path: `test-results/home-${width}.png`,
      fullPage: true,
    });
    await page.goto("/#/admin");
    await expect(
      page.getByRole("heading", { name: "Behind the sound." }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });

test("uploaded files reject mismatched audio signatures", async ({ page }) => {
  await page.goto("/#/admin");
  await page
    .getByRole("button", { name: "Upload a song", exact: true })
    .click();
  await page
    .getByLabel("Choose MP3 audio")
    .setInputFiles({
      name: "fake.mp3",
      mimeType: "audio/mpeg",
      buffer: Buffer.from("this is not an MP3"),
    });
  await page.getByLabel("Song title", { exact: true }).fill("Invalid upload");
  await page.getByLabel("Artist", { exact: true }).fill("Test Artist");
  await page.getByRole("button", { name: "Upload song", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Choose a valid MP3 file.",
  );
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("mobile player expands and exposes seek and volume controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await pass(page);
  await home(page);
  await page
    .getByRole("button", { name: "Play After Hours", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.locator(".player-art").click();
  await expect(page.locator(".player")).toHaveClass(/player-expanded/);
  await expect(
    page.getByRole("slider", { name: "Volume", exact: true }),
  ).toBeVisible();
  await page.getByRole("slider", { name: "Seek track" }).fill("5");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Collapse player" }).click();
  await expect(page.locator(".player")).not.toHaveClass(/player-expanded/);
});

test("expired listening pass pauses playback", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("horicx:pass", String(Date.now() + 4500)),
  );
  await home(page);
  await page
    .getByRole("button", { name: "Play After Hours", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole("status")).toContainText(
    "Your listening pass has ended.",
  );
});

test("artists and albums can be created, edited, and deleted locally", async ({
  page,
}) => {
  await page.goto("/#/admin");
  await page
    .locator(".admin-tabs")
    .getByRole("button", { name: "Artists", exact: true })
    .click();
  await page.getByRole("button", { name: "Add artist", exact: true }).click();
  await page.getByLabel("Artist name").fill("A New Voice");
  await page.getByLabel("Biography").fill("Independent sounds from Kampala.");
  await page.getByRole("button", { name: "Save artist", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.locator(".entity-row").filter({ hasText: "A New Voice" }),
  ).toBeVisible();
  await page
    .locator(".admin-tabs")
    .getByRole("button", { name: "Albums", exact: true })
    .click();
  await page.getByRole("button", { name: "Add album", exact: true }).click();
  await page.getByLabel("Album title").fill("A New Chapter");
  await page
    .getByLabel("Artist", { exact: true })
    .selectOption({ label: "A New Voice" });
  await page.getByRole("button", { name: "Save album", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  const album = page
    .locator(".entity-row")
    .filter({ hasText: "A New Chapter" });
  await expect(album).toBeVisible();
  await album.getByRole("button", { name: "Edit A New Chapter" }).click();
  await page.getByLabel("Album title").fill("Another Chapter");
  await page.getByRole("button", { name: "Save album", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page
    .locator(".entity-row")
    .filter({ hasText: "Another Chapter" })
    .getByRole("button", { name: "Delete entry" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page
    .locator(".admin-tabs")
    .getByRole("button", { name: "Artists", exact: true })
    .click();
  await page
    .locator(".entity-row")
    .filter({ hasText: "A New Voice" })
    .getByRole("button", { name: "Delete entry" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.locator(".entity-row").filter({ hasText: "A New Voice" }),
  ).toHaveCount(0);
});
