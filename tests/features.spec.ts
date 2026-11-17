import { test, expect, type Page } from "@playwright/test";
async function ready(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("horicx:pass", String(Date.now() + 1800000)),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Find your frequency." }),
  ).toBeVisible();
}
test("daily mix responds to liked music and plays its recommended queue", async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole("button", { name: "Like Ocean Drive", exact: true })
    .click();
  await page
    .locator(".daily-mix")
    .filter({ hasText: "Your daily mix" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your daily mix", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".track-row").first()).toContainText("Ocean Drive");
  await page.getByRole("button", { name: "Play mix", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".now-playing")).toContainText("Ocean Drive");
  await page.getByRole("button", { name: "Open queue", exact: true }).click();
  await expect(page.locator(".queue-panel .queue-track")).toHaveCount(6);
});
test("following artists persists and adds them to the library", async ({
  page,
}) => {
  await ready(page);
  await page.goto("/#/artist/artist-0");
  await page
    .getByRole("button", { name: "Follow artist", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Following", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Following", exact: true }),
  ).toBeVisible();
  await page.goto("/#/library");
  await expect(page.locator(".followed-artist")).toHaveCount(1);
  await expect(page.locator(".followed-artist")).toContainText("Luna Vale");
  await page.locator(".followed-artist").click();
  await page.getByRole("button", { name: "Following", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Follow artist", exact: true }),
  ).toBeVisible();
});
test("playlist editing, searching, sorting and custom order persist", async ({
  page,
}) => {
  await page.addInitScript(
    () =>
      !localStorage.getItem("horicx:playlists") &&
      localStorage.setItem(
        "horicx:playlists",
        JSON.stringify([
          {
            id: "feature-list",
            name: "Night shift",
            trackIds: ["after-hours", "golden-hour", "ocean-drive"],
          },
        ]),
      ),
  );
  await ready(page);
  await page.goto("/#/playlist/feature-list");
  await page
    .getByRole("button", { name: "Edit playlist", exact: true })
    .click();
  await page.getByLabel("Playlist name", { exact: true }).fill("Night drive");
  await page
    .getByLabel("Description", { exact: true })
    .fill("The long way home.");
  await page
    .getByRole("button", { name: "Save playlist", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Night drive", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".playlist-description")).toContainText(
    "The long way home.",
  );
  await page
    .getByRole("textbox", { name: "Find in collection" })
    .fill("coastline");
  await expect(page.locator(".track-row")).toHaveCount(1);
  await expect(page.locator(".track-row")).toContainText("Ocean Drive");
  await page.getByRole("textbox", { name: "Find in collection" }).fill("");
  await page.getByLabel("Sort collection").selectOption("duration");
  await expect(page.locator(".track-row").first()).toContainText("Ocean Drive");
  await page.getByLabel("Sort collection").selectOption("default");
  await page.locator(".track-row").first().locator("summary").click();
  await page
    .getByRole("button", { name: "Move After Hours down", exact: true })
    .click();
  await expect(page.locator(".track-row").first()).toContainText("Golden Hour");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Night drive", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".track-row").first()).toContainText("Golden Hour");
});
test("play next and manual queue ordering control the next song", async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole("button", { name: "Play After Hours", exact: true })
    .click();
  await page.goto("/#/search");
  const add = async (title: string, action: string) => {
    const row = page.locator(".track-row").filter({ hasText: title });
    await row.locator("summary").click();
    await row
      .locator(".dropdown")
      .getByRole("button", { name: action, exact: true })
      .click();
    await row.locator("summary").click();
  };
  await add("Golden Hour", "Add to queue");
  await add("City Lights", "Play next");
  await page.getByRole("button", { name: "Open queue", exact: true }).click();
  await expect(page.locator(".queue-panel .queue-track").nth(1)).toContainText(
    "City Lights",
  );
  await page
    .getByRole("button", { name: "Move Golden Hour up in queue", exact: true })
    .click();
  await expect(page.locator(".queue-panel .queue-track").nth(1)).toContainText(
    "Golden Hour",
  );
  await page.getByRole("button", { name: "Next track", exact: true }).click();
  await expect(page.locator(".now-playing")).toContainText("Golden Hour");
});
test("sleep timer stops at the end of a track even when repeat is enabled", async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole("button", { name: "Play After Hours", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Repeat track", exact: true }).click();
  await page.getByRole("button", { name: "Sleep timer", exact: true }).click();
  await page
    .getByRole("button", { name: "End of this track", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Sleep timer", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("slider", { name: "Seek track" }).fill("20.5");
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible({ timeout: 6000 });
  await expect(
    page.getByRole("button", { name: "Sleep timer", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".now-playing")).toContainText("After Hours");
});
test("sleep timer can be set and cancelled on a small phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await ready(page);
  await page.locator(".player-art").click();
  await page.getByRole("button", { name: "Sleep timer", exact: true }).click();
  await page.getByRole("button", { name: "15 minutes", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sleep timer", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Sleep timer", exact: true }).click();
  await expect(page.locator(".timer-current")).toContainText("remaining");
  await page
    .getByRole("button", { name: "Cancel sleep timer", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Sleep timer", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("media session reports the actual track and playback state", async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole("button", { name: "Play Golden Hour", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => navigator.mediaSession?.metadata?.title))
    .toBe("Golden Hour");
  await expect
    .poll(() => page.evaluate(() => navigator.mediaSession?.playbackState))
    .toBe("playing");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.mediaSession?.playbackState))
    .toBe("paused");
});

test("a timed sleep deadline pauses playback without navigating away", async ({
  page,
}) => {
  await page.clock.install();
  await ready(page);
  await page
    .getByRole("button", { name: "Play After Hours", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sleep timer", exact: true }).click();
  await page.getByRole("button", { name: "5 minutes", exact: true }).click();
  await page.clock.fastForward(301000);
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sleep timer", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
});
