import type { Track } from "./types";
export type DailyMix = {
  id: string;
  title: string;
  subtitle: string;
  theme: string;
  tracks: Track[];
};
/** Deterministic recommendations from this listener's actual library signals. */
export function dailyMixes(
  tracks: Track[],
  favourites: string[],
  recent: string[],
  followed: string[],
): DailyMix[] {
  const published = tracks.filter((t) => t.published);
  const liked = new Set(favourites),
    history = new Set(recent),
    artists = new Set(followed);
  const genres = new Map<string, number>();
  for (const t of published) {
    const weight =
      (liked.has(t.id) ? 4 : 0) +
      (history.has(t.id) ? 2 : 0) +
      (artists.has(t.artist_id) ? 3 : 0);
    genres.set(t.genre, (genres.get(t.genre) ?? 0) + weight);
  }
  const ranked = published
    .map((t, i) => ({
      t,
      i,
      score:
        (genres.get(t.genre) ?? 0) +
        (liked.has(t.id) ? 2 : 0) +
        (artists.has(t.artist_id) ? 3 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.t);
  const mix = (
    id: string,
    title: string,
    subtitle: string,
    theme: string,
    list: Track[],
  ): DailyMix => ({ id, title, subtitle, theme, tracks: list.slice(0, 30) });
  return [
    mix(
      "daily",
      "Your daily mix",
      favourites.length || recent.length || followed.length
        ? "Inspired by your likes, listens & artists"
        : "A first taste of the Horicx catalogue",
      "violet",
      ranked,
    ),
    mix(
      "unwind",
      "Slow it down",
      "Lo-fi, chill & softer corners of your collection",
      "sage",
      published.filter((t) =>
        ["Lo-fi", "Chill", "R&B", "Jazz"].includes(t.genre),
      ),
    ),
    mix(
      "energy",
      "Turn it up",
      "Electronic pulses & feel-good rhythms",
      "sunset",
      published.filter((t) =>
        ["Electronic", "Afrobeats", "Hip-hop"].includes(t.genre),
      ),
    ),
  ].filter((m) => m.tracks.length > 0);
}
