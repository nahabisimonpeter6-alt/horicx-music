import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import {
  api,
  APIError,
  cloudMode,
  configError,
  ensureListener,
  supabase,
} from "./lib/cloud";
import { demoAdvert, demoArtists, demoTracks } from "./lib/demo";
import { deleteFile, getFileURL, readLocal, writeLocal } from "./lib/storage";
import type {
  Advert,
  Album,
  Artist,
  Playlist,
  Stats,
  Track,
} from "./lib/types";
export function formatTime(value: number) {
  return `${Math.floor((value || 0) / 60)}:${String(Math.floor((value || 0) % 60)).padStart(2, "0")}`;
}
export function useMusic() {
  const ctx = useContext(Context);
  if (!ctx) throw Error("Missing music provider");
  return ctx;
}
function useMusicState() {
  const [tracks, setTracks] = useState<Track[]>(cloudMode ? [] : demoTracks);
  const [artists, setArtists] = useState<Artist[]>(
    cloudMode ? [] : demoArtists,
  );
  const [albums, setAlbums] = useState<Album[]>([]);
  const [adverts, setAdverts] = useState<Advert[]>(
    cloudMode ? [] : [demoAdvert],
  );
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [favourites, setFavourites] = useState<string[]>(
    cloudMode ? [] : () => readLocal("favourites", []),
  );
  const [playlists, setPlaylists] = useState<Playlist[]>(
    cloudMode ? [] : () => readLocal("playlists", []),
  );
  const [recent, setRecent] = useState<string[]>(
    cloudMode ? [] : () => readLocal("recent", []),
  );
  const [followedArtists, setFollowedArtists] = useState<string[]>(
    cloudMode ? [] : () => readLocal("followed-artists", []),
  );
  const [sleepTimer, setSleepTimer] = useState<number | "track" | null>(null);
  const [clock, setClock] = useState(Date.now());
  const [toast, setToast] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [adOpen, setAdOpen] = useState(false);
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [playError, setPlayError] = useState("");
  const [passUntil, setPassUntil] = useState(
    cloudMode ? 0 : () => readLocal("pass", 0),
  );
  const [listenMinutes, setListenMinutes] = useState(
    cloudMode ? 30 : () => readLocal("minutes", 30),
  );
  const [stats, setStats] = useState<Stats>(() =>
    cloudMode
      ? { songs: 0, users: null, plays: 0, completions: 0 }
      : readLocal("stats", { songs: 6, users: null, plays: 0, completions: 0 }),
  );
  const audio = useRef<HTMLAudioElement | null>(null);
  const pending = useRef<Track | null>(null);
  const request = useRef(0);
  const nextRef = useRef<() => void>(() => {});
  const passRef = useRef(passUntil);
  passRef.current = passUntil;
  const notify = (message: string) => setToast(message);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const save = <T,>(key: string, value: T) => {
    try {
      writeLocal(key, value);
    } catch {
      notify("Your browser could not save changes. Check available storage.");
    }
  };
  async function refresh() {
    if (!tracks.length) setLoading(true);
    setCatalogError("");
    try {
      if (cloudMode) {
        if (configError)
          throw Error(
            "Cloud configuration is incomplete. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY together.",
          );
        const data = await api<{
          tracks: Track[];
          artists: Artist[];
          albums: Album[];
          minutes: number;
        }>("catalog");
        setTracks(data.tracks);
        setArtists(data.artists);
        setAlbums(data.albums);
        setListenMinutes(data.minutes);
        if (isAdmin) {
          const overview = await api<{
            tracks: Track[];
            adverts: Advert[];
            stats: Stats;
          }>("admin_overview");
          setTracks(overview.tracks);
          setAdverts(overview.adverts);
          setStats(overview.stats);
        }
      } else {
        const local = await Promise.all(
          readLocal<Track[]>("uploads", []).map(async (t) => ({
            ...t,
            audio: await getFileURL(`${t.id}:audio`),
            cover: (await getFileURL(`${t.id}:cover`)) ?? t.cover,
          })),
        );
        setTracks([
          ...demoTracks.map((t) => ({
            ...t,
            ...readLocal<Record<string, Partial<Track>>>("track-edits", {})[
              t.id
            ],
          })),
          ...local,
        ]);
        setArtists([...demoArtists, ...readLocal<Artist[]>("artists", [])]);
        setAlbums(readLocal("albums", []));
        const ads = await Promise.all(
          readLocal<Advert[]>("adverts", []).map(async (a) => ({
            ...a,
            url: await getFileURL(a.id),
          })),
        );
        setAdverts([
          { ...demoAdvert, ...readLocal<Partial<Advert>>("demo-ad-edit", {}) },
          ...ads,
        ]);
      }
    } catch (e) {
      setCatalogError(
        e instanceof Error ? e.message : "Could not load the music library.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function loadUserData(u: User | null) {
    setUser(u);
    if (!cloudMode) return;
    setFavourites([]);
    setPlaylists([]);
    setRecent([]);
    setFollowedArtists([]);
    setIsAdmin(false);
    if (!u) return;
    try {
      const data = await api<{
        admin: boolean;
        favourites: string[];
        playlists: Playlist[];
        recent: string[];
        followedArtists?: string[];
        passUntil: number;
      }>("library");
      setIsAdmin(data.admin);
      setFavourites(data.favourites);
      setPlaylists(data.playlists);
      setRecent(data.recent);
      setFollowedArtists(data.followedArtists ?? []);
      setPassUntil(data.passUntil);
      if (data.admin) {
        const a = await api<{
          tracks: Track[];
          adverts: Advert[];
          stats: Stats;
        }>("admin_overview");
        setTracks(a.tracks);
        setAdverts(a.adverts);
        setStats(a.stats);
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not load your library.");
    }
  }
  useEffect(() => {
    void refresh();
    if (!supabase) return;
    void supabase.auth
      .getSession()
      .then(({ data }) => loadUserData(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        void loadUserData(session?.user ?? null);
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const a = new Audio();
    a.preload = "metadata";
    a.volume = 0.7;
    audio.current = a;
    const events: Record<string, () => void> = {
      timeupdate: () => setTime(a.currentTime),
      loadedmetadata: () => setDuration(a.duration),
      playing: () => {
        setPlaying(true);
        setBuffering(false);
        setPlayError("");
      },
      pause: () => setPlaying(false),
      waiting: () => setBuffering(true),
      canplay: () => setBuffering(false),
      ended: () => nextRef.current(),
      error: () => {
        setBuffering(false);
        setPlaying(false);
        setPlayError(
          "This track could not be played. Check your connection and try again.",
        );
      },
    };
    Object.entries(events).forEach(([k, v]) => a.addEventListener(k, v));
    return () => {
      a.pause();
      Object.entries(events).forEach(([k, v]) => a.removeEventListener(k, v));
      a.removeAttribute("src");
      a.load();
      audio.current = null;
    };
  }, []);
  useEffect(() => {
    const t = setInterval(() => {
      setClock(Date.now());
      if (passRef.current > 0 && passRef.current <= Date.now()) {
        audio.current?.pause();
        setPassUntil(0);
        notify(
          "Your listening pass has ended. Watch another short advert to keep listening.",
        );
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (typeof sleepTimer === "number" && clock >= sleepTimer) {
      ++request.current;
      pending.current = null;
      audio.current?.pause();
      setPlaying(false);
      setBuffering(false);
      setSleepTimer(null);
      setAdOpen(false);
      notify("Sleep timer finished. Your music is paused.");
    }
  }, [clock, sleepTimer]);
  function setSleep(minutes: number | "track" | null) {
    setSleepTimer(
      minutes === "track"
        ? "track"
        : minutes === null
          ? null
          : Date.now() + minutes * 60000,
    );
    notify(
      minutes === null
        ? "Sleep timer cancelled."
        : minutes === "track"
          ? "Music will stop at the end of this track."
          : `Sleep timer set for ${minutes} minutes.`,
    );
  }
  async function play(track: Track) {
    pending.current = track;
    setPlayError("");
    let url = track.audio;
    const seq = ++request.current;
    if (!cloudMode && passUntil <= Date.now()) {
      setAdOpen(true);
      return;
    }
    setBuffering(true);
    try {
      if (cloudMode) {
        await ensureListener();
        try {
          const result = await api<{ url: string; passUntil: number }>("play", {
            trackId: track.id,
          });
          url = result.url;
          setPassUntil(result.passUntil);
        } catch (e) {
          if (e instanceof APIError && e.status === 402) {
            setAdOpen(true);
            setBuffering(false);
            return;
          }
          throw e;
        }
      }
      if (seq !== request.current) return;
      if (!url)
        throw Error(
          "The music file is unavailable. Try reloading the library.",
        );
      const a = audio.current!;
      a.pause();
      setCurrent(track);
      setTime(0);
      setDuration(track.duration);
      a.src = url;
      a.load();
      await Promise.race([
        a.play(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                Error(
                  "Playback took too long. Check your connection and retry.",
                ),
              ),
            15000,
          ),
        ),
      ]);
      const nextRecent = [
        track.id,
        ...recent.filter((id) => id !== track.id),
      ].slice(0, 30);
      setRecent(nextRecent);
      if (!cloudMode) {
        save("recent", nextRecent);
        setStats((s) => {
          const n = { ...s, plays: s.plays + 1 };
          save("stats", n);
          return n;
        });
      }
    } catch (e) {
      if (seq !== request.current) return;
      setBuffering(false);
      setPlaying(false);
      setPlayError(
        e instanceof Error ? e.message : "Playback failed. Please try again.",
      );
      setCurrent(track);
    }
  }
  function move(direction: number) {
    const published = tracks.filter((t) => t.published);
    if (!published.length) return;
    if (direction === -1 && time > 3) {
      seek(0);
      return;
    }
    let target: Track | undefined;
    if (direction === 1 && queue.length) {
      target = tracks.find((t) => t.id === queue[0]);
      setQueue((q) => q.slice(1));
    }
    if (!target) {
      const i = published.findIndex((t) => t.id === current?.id);
      const choices = published.filter((t) => t.id !== current?.id);
      target =
        shuffle && choices.length
          ? choices[Math.floor(Math.random() * choices.length)]
          : published[(i + direction + published.length) % published.length];
    }
    void play(target);
  }
  nextRef.current = () => {
    if (sleepTimer === "track") {
      setSleepTimer(null);
      setPlaying(false);
      notify("Sleep timer finished. Your music is paused.");
      return;
    }
    if (repeat && current) {
      void play(current);
    } else move(1);
  };
  function togglePlay() {
    const a = audio.current;
    if (!a) return;
    if (playing) a.pause();
    else if (current) {
      if (passUntil <= Date.now() || playError || !a.src) void play(current);
      else
        void a
          .play()
          .catch(() =>
            setPlayError("Playback was interrupted. Press play to try again."),
          );
    } else {
      const t = tracks.find((t) => t.published);
      if (t) void play(t);
    }
  }
  function seek(value: number) {
    if (audio.current && Number.isFinite(value)) {
      audio.current.currentTime = Math.max(
        0,
        Math.min(value, duration || current?.duration || 0),
      );
      setTime(audio.current.currentTime);
    }
  }
  function setVolume(n: number) {
    setVolumeState(n);
    if (audio.current) audio.current.volume = n;
  }
  async function unlock(until?: number) {
    const expiry = until ?? Date.now() + listenMinutes * 60000;
    setPassUntil(expiry);
    if (!cloudMode) {
      save("pass", expiry);
      setStats((s) => {
        const n = { ...s, completions: s.completions + 1 };
        save("stats", n);
        return n;
      });
    }
    setAdOpen(false);
    notify(`${listenMinutes} minutes unlocked. Find your frequency.`);
    const t = pending.current;
    if (t) {
      if (!cloudMode) {
        passRef.current = expiry; // play reads state on next render; start after commit through effect below
        pending.current = t;
        setResumeAfterAd(t);
      } else void play(t);
    }
  }
  const [resumeAfterAd, setResumeAfterAd] = useState<Track | null>(null);
  useEffect(() => {
    if (resumeAfterAd && passUntil > Date.now()) {
      void play(resumeAfterAd);
      setResumeAfterAd(null);
    }
  }, [resumeAfterAd, passUntil]);
  async function favourite(id: string) {
    if (cloudMode && (!user || user.is_anonymous)) {
      setAuthOpen(true);
      return;
    }
    try {
      const next = favourites.includes(id)
        ? favourites.filter((x) => x !== id)
        : [...favourites, id];
      if (cloudMode)
        await api("favourite", {
          trackId: id,
          enabled: !favourites.includes(id),
        });
      else save("favourites", next);
      setFavourites(next);
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function createPlaylist(name: string) {
    if (cloudMode && (!user || user.is_anonymous)) {
      setAuthOpen(true);
      return;
    }
    const clean = name.trim().slice(0, 80);
    if (!clean) return;
    try {
      let p: Playlist = { id: crypto.randomUUID(), name: clean, trackIds: [] };
      if (cloudMode)
        p = await api<Playlist>("create_playlist", { name: clean });
      const next = [...playlists, p];
      setPlaylists(next);
      if (!cloudMode) save("playlists", next);
      notify(`“${clean}” created.`);
      return p;
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function playlistTrack(playlistId: string, trackId: string) {
    try {
      const p = playlists.find((x) => x.id === playlistId);
      if (!p) return;
      const adding = !p.trackIds.includes(trackId);
      if (cloudMode)
        await api("playlist_track", { playlistId, trackId, enabled: adding });
      const next = playlists.map((x) =>
        x.id === playlistId
          ? {
              ...x,
              trackIds: adding
                ? [...x.trackIds, trackId]
                : x.trackIds.filter((t) => t !== trackId),
            }
          : x,
      );
      setPlaylists(next);
      if (!cloudMode) save("playlists", next);
      notify(adding ? "Added to playlist." : "Removed from playlist.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function followArtist(id: string) {
    if (cloudMode && (!user || user.is_anonymous)) {
      setAuthOpen(true);
      return;
    }
    const enabled = !followedArtists.includes(id);
    try {
      if (cloudMode) await api("follow_artist", { artistId: id, enabled });
      const next = enabled
        ? [...followedArtists, id]
        : followedArtists.filter((x) => x !== id);
      if (!cloudMode) writeLocal("followed-artists", next);
      setFollowedArtists(next);
      notify(enabled ? "Artist added to your library." : "Artist unfollowed.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function editPlaylist(id: string, name: string, description: string) {
    const clean = name.trim();
    if (!clean || clean.length > 80 || description.length > 300) {
      notify("Use a name up to 80 characters and a description up to 300.");
      return false;
    }
    try {
      if (cloudMode)
        await api("edit_playlist", { id, name: clean, description });
      const next = playlists.map((p) =>
        p.id === id ? { ...p, name: clean, description } : p,
      );
      if (!cloudMode) writeLocal("playlists", next);
      setPlaylists(next);
      notify("Playlist updated.");
      return true;
    } catch (e) {
      notify((e as Error).message);
      return false;
    }
  }
  async function reorderPlaylist(id: string, trackIds: string[]) {
    try {
      if (cloudMode) await api("reorder_playlist", { id, trackIds });
      const next = playlists.map((p) => (p.id === id ? { ...p, trackIds } : p));
      if (!cloudMode) writeLocal("playlists", next);
      setPlaylists(next);
      return true;
    } catch (e) {
      notify((e as Error).message);
      return false;
    }
  }
  function playNext(t: Track) {
    setQueue((q) => [t.id, ...q]);
    notify(`“${t.title}” will play next.`);
  }
  function moveQueue(index: number, direction: number) {
    setQueue((q) => {
      const next = [...q],
        to = index + direction;
      if (to < 0 || to >= next.length) return q;
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  }
  async function deletePlaylist(id: string) {
    try {
      if (cloudMode) await api("delete_playlist", { id });
      const next = playlists.filter((p) => p.id !== id);
      setPlaylists(next);
      if (!cloudMode) save("playlists", next);
      notify("Playlist deleted.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function signOut() {
    if (supabase) {
      audio.current?.pause();
      setPassUntil(0);
      await supabase.auth.signOut();
      setIsAdmin(false);
      const data = await api<{
        tracks: Track[];
        artists: Artist[];
        albums: Album[];
        minutes: number;
      }>("catalog");
      setTracks(data.tracks);
      setAdverts([]);
    }
    setUser(null);
    setIsAdmin(false);
    notify("Signed out.");
  }
  async function removeTrack(t: Track) {
    if (cloudMode) await api("admin_delete_track", { id: t.id });
    else if (t.local) {
      await deleteFile(`${t.id}:audio`);
      await deleteFile(`${t.id}:cover`);
      save(
        "uploads",
        readLocal<Track[]>("uploads", []).filter((x) => x.id !== t.id),
      );
    } else
      throw Error(
        "Bundled demo tracks can be unpublished, but cannot be deleted.",
      );
    if (current?.id === t.id) {
      audio.current?.pause();
      setCurrent(null);
    }
    await refresh();
  }
  async function updateTrack(t: Track) {
    if (cloudMode) await api("admin_update_track", { track: t });
    else {
      let artist = artists.find(
        (a) => a.name.toLowerCase() === t.artist.trim().toLowerCase(),
      );
      if (!artist) {
        artist = {
          id: crypto.randomUUID(),
          name: t.artist.trim(),
          bio: "An independent voice on Horicx Music.",
          cover: "/art/artist-0.svg",
        };
        save("artists", [...readLocal<Artist[]>("artists", []), artist]);
      }
      let album = albums.find(
        (a) => a.title === t.album && a.artist_id === artist!.id,
      );
      if (t.album && !album) {
        album = {
          id: crypto.randomUUID(),
          title: t.album,
          artist_id: artist.id,
          release_date: t.release_date,
        };
        save("albums", [...readLocal<Album[]>("albums", []), album]);
      }
      t = { ...t, artist_id: artist.id, album_id: album?.id };
      if (t.local)
        save(
          "uploads",
          readLocal<Track[]>("uploads", []).map((x) =>
            x.id === t.id
              ? {
                  ...t,
                  audio: undefined,
                  cover: t.cover.startsWith("blob:")
                    ? "/art/after-hours.svg"
                    : t.cover,
                }
              : x,
          ),
        );
      else
        save("track-edits", {
          ...readLocal("track-edits", {}),
          [t.id]: {
            title: t.title,
            artist: t.artist,
            artist_id: t.artist_id,
            album: t.album,
            album_id: t.album_id,
            genre: t.genre,
            description: t.description,
            release_date: t.release_date,
            published: t.published,
          },
        });
    }
    await refresh();
  }
  function addQueue(t: Track) {
    setQueue((q) => [...q, t.id]);
    notify("Added to your queue.");
  }
  const mediaActions = useRef<
    Record<string, (details: MediaSessionActionDetails) => void>
  >({});
  mediaActions.current = {
    play: () => {
      if (!adOpen && !playing) togglePlay();
    },
    pause: () => audio.current?.pause(),
    nexttrack: () => {
      if (!adOpen) move(1);
    },
    previoustrack: () => {
      if (!adOpen) move(-1);
    },
    seekto: (d) => {
      if (!adOpen && d.seekTime !== undefined) seek(d.seekTime);
    },
    seekforward: (d) => {
      if (!adOpen)
        seek((audio.current?.currentTime ?? 0) + (d.seekOffset ?? 10));
    },
    seekbackward: (d) => {
      if (!adOpen)
        seek((audio.current?.currentTime ?? 0) - (d.seekOffset ?? 10));
    },
  };
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const actions: MediaSessionAction[] = [
      "play",
      "pause",
      "nexttrack",
      "previoustrack",
      "seekto",
      "seekforward",
      "seekbackward",
    ];
    for (const action of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, (d) =>
          mediaActions.current[action]?.(d),
        );
      } catch {
        /* Browser support varies by action. */
      }
    }
    return () => {
      for (const action of actions) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {}
      }
      navigator.mediaSession.metadata = null;
    };
  }, []);
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = adOpen
      ? "none"
      : playing
        ? "playing"
        : current
          ? "paused"
          : "none";
  }, [playing, current, adOpen]);
  useEffect(() => {
    if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined")
      return;
    navigator.mediaSession.metadata =
      current && !adOpen
        ? new MediaMetadata({
            title: current.title,
            artist: current.artist,
            album: current.album,
            artwork: [{ src: new URL(current.cover, location.href).href }],
          })
        : null;
  }, [current, adOpen]);
  useEffect(() => {
    if (
      !("mediaSession" in navigator) ||
      !navigator.mediaSession.setPositionState ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      adOpen
    )
      return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        position: Math.max(0, Math.min(time, duration)),
        playbackRate: 1,
      });
    } catch {
      /* Position reporting is optional on older browsers. */
    }
  }, [time, duration, adOpen]);
  return {
    tracks,
    artists,
    albums,
    adverts,
    loading,
    catalogError,
    refresh,
    user,
    isAdmin,
    favourites,
    playlists,
    recent,
    toast,
    notify,
    authOpen,
    setAuthOpen,
    queueOpen,
    setQueueOpen,
    adOpen,
    setAdOpen,
    current,
    playing,
    buffering,
    time,
    duration,
    volume,
    setVolume,
    shuffle,
    setShuffle,
    repeat,
    setRepeat,
    queue,
    setQueue,
    playError,
    passUntil,
    listenMinutes,
    setListenMinutes,
    stats,
    setStats,
    play,
    togglePlay,
    next: () => move(1),
    previous: () => move(-1),
    seek,
    unlock,
    favourite,
    createPlaylist,
    playlistTrack,
    deletePlaylist,
    signOut,
    removeTrack,
    updateTrack,
    addQueue,
    followedArtists,
    followArtist,
    editPlaylist,
    reorderPlaylist,
    playNext,
    moveQueue,
    sleepTimer,
    setSleep,
    clock,
  };
}
type MusicState = ReturnType<typeof useMusicState>;
const Context = createContext<MusicState | null>(null);
export function MusicProvider({ children }: { children: ReactNode }) {
  return (
    <Context.Provider value={useMusicState()}>{children}</Context.Provider>
  );
}
