import type { Track, Artist, Advert } from "./types";
const titles = [
  "After Hours",
  "Golden Hour",
  "City Lights",
  "Slow Mornings",
  "Wildflower",
  "Ocean Drive",
];
const names = [
  "Luna Vale",
  "Sol Theory",
  "Neon Atlas",
  "Juno Bloom",
  "Milo Rivers",
  "Coastline",
];
const genres = [
  "Electronic",
  "Afrobeats",
  "Electronic",
  "Lo-fi",
  "R&B",
  "Chill",
];
const tempos = [92, 104, 116, 78, 100, 110];
export const demoTracks: Track[] = titles.map((title, i) => {
  const slug = title.toLowerCase().replace(" ", "-");
  return {
    id: slug,
    title,
    artist: names[i],
    artist_id: `artist-${i}`,
    album: title,
    genre: genres[i],
    duration: (32 * 60) / tempos[i],
    cover: `/art/${slug}.svg`,
    audio: `/audio/${slug}.mp3`,
    description: [
      "A late-night journey through soft synths, warm bass, and a city that never quite sleeps.",
      "Sun-soaked chords and a light, rolling rhythm. A little warmth for wherever the day takes you.",
      "Glowing melodies and a steady pulse, made for getting lost in the lights.",
      "A soft piano-inspired melody, dusty percussion, and room to breathe.",
      "An easygoing groove with flowering chords and a mellow, unhurried melody.",
      "Windows down. Sea breeze in. Bright synths meet an open-road rhythm.",
    ][i],
    release_date: `2026-10-${String(22 + i).padStart(2, "0")}`,
    published: true,
    original: true,
  };
});
export const demoArtists: Artist[] = names.map((name, i) => ({
  id: `artist-${i}`,
  name,
  bio: `${name} is a fictional artist in the Horicx Originals demo collection. Explore an original, locally generated instrumental sound.`,
  cover: `/art/artist-${i}.svg`,
}));
export const demoAdvert: Advert = {
  id: "demo-advert",
  title: "Your next favourite sound",
  url: "/demo-advert.mp4",
  duration: 8,
  active: true,
  position: 0,
};
