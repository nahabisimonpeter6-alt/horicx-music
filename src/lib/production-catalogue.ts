// Production never imports the fictional catalogue or a browser-local advert.
import type { Advert, Artist, Track } from "./types";
export const demoTracks: Track[] = [];
export const demoArtists: Artist[] = [];
export const demoAdvert: Advert = {
  id: "",
  title: "",
  duration: 0,
  active: false,
  position: 0,
};
