export type Track = {
  id: string;
  title: string;
  artist: string;
  artist_id: string;
  album: string;
  album_id?: string;
  genre: string;
  duration: number;
  cover: string;
  audio?: string;
  description: string;
  release_date: string;
  published: boolean;
  original?: boolean;
  local?: boolean;
};
export type Artist = { id: string; name: string; bio: string; cover: string };
export type Album = {
  id: string;
  title: string;
  artist_id: string;
  release_date: string;
};
export type Advert = {
  id: string;
  title: string;
  url?: string;
  duration: number;
  active: boolean;
  position: number;
  local?: boolean;
};
export type Playlist = { id: string; name: string; trackIds: string[] };
export type Stats = {
  songs: number;
  users: number | null;
  plays: number;
  completions: number;
};
