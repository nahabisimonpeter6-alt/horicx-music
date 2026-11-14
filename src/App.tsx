import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Check,
  ChevronRight,
  Clock3,
  Disc3,
  Flame,
  Headphones,
  Heart,
  Home,
  LayoutGrid,
  ListMusic,
  Loader2,
  Menu,
  MoreHorizontal,
  Music2,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import { cloudMode } from "./lib/cloud";
import { useMusic, formatTime } from "./store";
import type { Track } from "./lib/types";
import { Player } from "./components/Player";
import { AdModal, AuthModal, Modal } from "./components/Modals";
import { Admin } from "./components/Admin";
export function navigate(path: string) {
  location.hash = path;
}
function routeFromHash() {
  return location.hash.startsWith("#/") ? location.hash.slice(1) : "/";
}
function useRoute() {
  const [path, setPath] = useState(routeFromHash);
  useEffect(() => {
    const fn = () => {
      setPath(routeFromHash());
      window.scrollTo(0, 0);
    };
    addEventListener("hashchange", fn);
    return () => removeEventListener("hashchange", fn);
  }, []);
  return path;
}
export function TrackCard({ track }: { track: Track }) {
  const m = useMusic();
  return (
    <article className="track-card group">
      <div className="cover-wrap">
        <button
          className="art-link"
          aria-label={`View ${track.title}`}
          onClick={() => navigate(`/track/${track.id}`)}
        >
          <img
            src={track.cover}
            alt={`${track.title} original cover artwork`}
            loading="lazy"
          />
        </button>
        <button
          className="cover-play"
          aria-label={`Play ${track.title}`}
          onClick={() => void m.play(track)}
        >
          <Play size={20} fill="currentColor" />
        </button>
      </div>
      <div className="card-heading">
        <button
          onClick={() => navigate(`/track/${track.id}`)}
          className="track-title"
        >
          {track.title}
        </button>
        <button
          className={`icon-button card-heart ${m.favourites.includes(track.id) ? "is-liked" : ""}`}
          aria-label={`${m.favourites.includes(track.id) ? "Unlike" : "Like"} ${track.title}`}
          onClick={() => void m.favourite(track.id)}
        >
          <Heart
            size={16}
            fill={m.favourites.includes(track.id) ? "currentColor" : "none"}
          />
        </button>
      </div>
      <button
        className="artist-link"
        onClick={() => navigate(`/artist/${track.artist_id}`)}
      >
        {track.artist}
      </button>
      <span className="track-meta">
        {track.genre} <span>•</span> {formatTime(track.duration)}
      </span>
    </article>
  );
}
export function TrackTable({ tracks }: { tracks: Track[] }) {
  const m = useMusic();
  return (
    <div className="track-table">
      <div className="table-head">
        <span>#</span>
        <span>Title</span>
        <span className="album-col">Album</span>
        <span className="genre-col">Genre</span>
        <span>
          <Clock3 size={15} />
        </span>
        <span />
      </div>
      {tracks.map((t, i) => (
        <div
          className={`track-row ${m.current?.id === t.id ? "active-track" : ""}`}
          key={t.id}
        >
          <button
            className="row-play"
            aria-label={`Play ${t.title}`}
            onClick={() => void m.play(t)}
          >
            {m.current?.id === t.id && m.playing ? (
              <AudioLines size={17} />
            ) : (
              <>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <Play className="row-play-icon" size={15} fill="currentColor" />
              </>
            )}
          </button>
          <div className="row-title">
            <img src={t.cover} alt="" loading="lazy" />
            <div>
              <button onClick={() => navigate(`/track/${t.id}`)}>
                {t.title}
              </button>
              <button
                className="muted"
                onClick={() => navigate(`/artist/${t.artist_id}`)}
              >
                {t.artist}
              </button>
            </div>
          </div>
          <span className="album-col muted">{t.album}</span>
          <span className="genre-col">
            <span className="genre-tag">{t.genre}</span>
          </span>
          <span className="muted duration">{formatTime(t.duration)}</span>
          <div className="row-actions">
            <button
              className={`icon-button ${m.favourites.includes(t.id) ? "is-liked" : ""}`}
              aria-label={`Like ${t.title}`}
              onClick={() => void m.favourite(t.id)}
            >
              <Heart
                size={17}
                fill={m.favourites.includes(t.id) ? "currentColor" : "none"}
              />
            </button>
            <details className="track-menu">
              <summary aria-label={`Options for ${t.title}`}>
                <MoreHorizontal size={18} />
              </summary>
              <div className="dropdown">
                <button onClick={() => m.addQueue(t)}>
                  <ListMusic size={15} /> Add to queue
                </button>
                {m.playlists.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => void m.playlistTrack(p.id, t.id)}
                  >
                    {p.trackIds.includes(t.id) ? (
                      <Check size={15} />
                    ) : (
                      <Plus size={15} />
                    )}{" "}
                    {p.name}
                  </button>
                ))}
                {!m.playlists.length && (
                  <span>Create a playlist in Your library to add songs.</span>
                )}
              </div>
            </details>
          </div>
        </div>
      ))}
    </div>
  );
}
function Empty({
  title,
  description,
  icon = "music",
}: {
  title: string;
  description: string;
  icon?: string;
}) {
  return (
    <div className="empty-state">
      {icon === "search" ? <Search size={34} /> : <Music2 size={34} />}
      <h3>{title}</h3>
      <p>{description}</p>
      <button className="button secondary" onClick={() => navigate("/")}>
        Discover music <ArrowRight size={16} />
      </button>
    </div>
  );
}
function SectionTitle({
  eyebrow,
  title,
  action,
  onClick,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action && (
        <button className="text-link" onClick={onClick}>
          {action} <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}
const genres = [
  {
    name: "Afrobeats",
    color: "orange",
    icon: "◉",
    subtitle: "Feel the rhythm",
  },
  {
    name: "Electronic",
    color: "purple",
    icon: "≋",
    subtitle: "Find your energy",
  },
  { name: "Lo-fi", color: "rose", icon: "✳", subtitle: "Slow things down" },
  { name: "R&B", color: "green", icon: "✦", subtitle: "A little more soul" },
  { name: "Chill", color: "blue", icon: "≈", subtitle: "Take a deep breath" },
];
function HomePage() {
  const m = useMusic();
  const [filter, setFilter] = useState("For you");
  const published = m.tracks.filter((t) => t.published);
  const featured = published[0];
  const displayed =
    filter === "For you"
      ? published
      : published.filter((t) => t.genre === filter);
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow intro-eyebrow">
            <span className="live-dot" /> A WORLD OF SOUND, WAITING FOR YOU
          </div>
          <h1>
            Find your frequency<span>.</span>
          </h1>
          <p>New discoveries. Fresh favourites. Your kind of music.</p>
        </div>
        <div className="date-chip">
          <Headphones size={17} />
          <span>Made for your everyday</span>
        </div>
      </div>
      <div className="filter-row">
        {["For you", "Afrobeats", "Electronic", "Lo-fi", "R&B", "Chill"].map(
          (f) => (
            <button
              className={`filter-chip ${filter === f ? "selected" : ""}`}
              onClick={() => setFilter(f)}
              key={f}
            >
              {f === "For you" && <Sparkles size={14} />} {f}
            </button>
          ),
        )}
      </div>
      {filter === "For you" && featured && (
        <section className="featured-banner">
          <img
            className="hero-art"
            src="/art/hero.svg"
            alt="Original illustrated twilight landscape with a glowing moon and an open road"
          />
          <div className="hero-shade" />
          <div className="hero-content">
            <div className="featured-label">
              <span /> THE FEATURED RELEASE
            </div>
            <h2>
              <strong className="hero-release-title">{featured.title}</strong>
              <span>
                Different hours. <br />A different feeling.
              </span>
            </h2>
            <p>{featured.description}</p>
            <div className="hero-byline">
              <span className="little-avatar">
                <AudioLines size={15} />
              </span>
              {featured.artist}
              <span>•</span>
              {featured.genre}
              <span>•</span>
              {featured.original ? "Horicx Originals" : "Featured release"}
            </div>
            <div className="hero-buttons">
              <button
                className="button lime"
                onClick={() => void m.play(featured)}
              >
                <Play size={17} fill="currentColor" /> Listen now
              </button>
              <button
                className="button hero-secondary"
                onClick={() => navigate(`/track/${featured.id}`)}
              >
                Explore release <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
          <div className="hero-counter">
            <span>01</span>
            <div />
            <span>06</span>
          </div>
          <span className="hero-caption">SOUNDTRACK YOUR OWN WORLD.</span>
        </section>
      )}
      <section className="music-section">
        <SectionTitle
          eyebrow="GOOD MUSIC FINDS A WAY"
          title={
            filter === "For you" ? "Made for your mood" : `${filter}, on repeat`
          }
          action="Explore all"
          onClick={() => navigate("/search")}
        />
        {displayed.length ? (
          <div className="track-grid">
            {displayed.slice(0, 6).map((t) => (
              <TrackCard track={t} key={t.id} />
            ))}
          </div>
        ) : (
          <Empty
            title="More sounds are on the way"
            description="There are no published tracks in this genre yet."
          />
        )}
      </section>
      {filter === "For you" && (
        <>
          <section className="unlock-banner">
            <div className="unlock-icon">
              <Headphones size={25} />
              <span>
                <Sparkles size={12} />
              </span>
            </div>
            <div>
              <span className="eyebrow">LESS INTERRUPTIONS. MORE MUSIC.</span>
              <h3>One short ad. {m.listenMinutes} minutes in your world.</h3>
              <p>
                Unlock uninterrupted listening and let the good tracks roll.
              </p>
            </div>
            <button
              className="button secondary"
              onClick={() => {
                if (m.passUntil > Date.now())
                  m.notify(
                    "Your listening pass is active. Press play on any track.",
                  );
                else {
                  m.setAdOpen(true);
                }
              }}
            >
              {m.passUntil > Date.now()
                ? "Your pass is active"
                : "Unlock listening"}{" "}
              <ArrowUpRight size={16} />
            </button>
          </section>
          <section className="music-section">
            <SectionTitle
              title="Explore your sound"
              action="All genres"
              onClick={() => navigate("/genres")}
            />
            <GenreGrid />
          </section>
          <div className="two-columns">
            <section className="music-section">
              <SectionTitle
                title="Fresh on Horicx"
                action="View all"
                onClick={() => navigate("/search")}
              />
              <div className="fresh-list">
                {(cloudMode
                  ? published.slice(0, 4)
                  : published.slice(-4).reverse()
                ).map((t, i) => (
                  <div className="fresh-row" key={t.id}>
                    <span className="rank">0{i + 1}</span>
                    <button
                      className="fresh-art"
                      onClick={() => void m.play(t)}
                      aria-label={`Play ${t.title}`}
                    >
                      <img src={t.cover} alt="" />
                      <Play size={16} />
                    </button>
                    <div>
                      <button onClick={() => navigate(`/track/${t.id}`)}>
                        {t.title}
                      </button>
                      <button
                        className="muted"
                        onClick={() => navigate(`/artist/${t.artist_id}`)}
                      >
                        {t.artist}
                      </button>
                    </div>
                    <span className="fresh-duration">
                      {formatTime(t.duration)}
                    </span>
                    <button
                      className="icon-button"
                      aria-label={`Add ${t.title} to queue`}
                      onClick={() => m.addQueue(t)}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
            <section className="music-section">
              <SectionTitle
                title="Meet the artists"
                action="View all"
                onClick={() => navigate("/artists")}
              />
              <div className="artist-mini-grid">
                {m.artists.slice(0, 4).map((a) => (
                  <button
                    className="artist-mini"
                    onClick={() => navigate(`/artist/${a.id}`)}
                    key={a.id}
                  >
                    <img
                      src={a.cover || "/art/artist-0.svg"}
                      alt={`${a.name} original illustrated portrait`}
                    />
                    <strong>{a.name}</strong>
                    <span>
                      {cloudMode ? "Independent artist" : "Horicx Original"}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
      <div className="original-note">
        <AudioLines size={15} />
        <span>
          {cloudMode
            ? "Independent sounds. Your own discoveries."
            : "Original generated demo audio. Fictional artists. Real good listening."}
        </span>
      </div>
    </>
  );
}
function GenreGrid() {
  return (
    <div className="genre-grid">
      {genres.map((g) => (
        <button
          className={`genre-card ${g.color}`}
          key={g.name}
          onClick={() =>
            navigate(`/search?genre=${encodeURIComponent(g.name)}`)
          }
        >
          <div>
            <strong>{g.name}</strong>
            <span>{g.subtitle}</span>
          </div>
          <span className="genre-symbol">{g.icon}</span>
          <ArrowUpRight size={17} />
        </button>
      ))}
    </div>
  );
}
function SearchPage({ route }: { route: string }) {
  const m = useMusic();
  const params = new URLSearchParams(route.split("?")[1] || "");
  const genre = params.get("genre") ?? "";
  const [query, setQuery] = useState(params.get("q") ?? "");
  useEffect(() => setQuery(params.get("q") ?? ""), [route]);
  const results = m.tracks.filter(
    (t) =>
      t.published &&
      (!genre || t.genre === genre) &&
      `${t.title} ${t.artist} ${t.genre}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">YOUR NEXT DISCOVERY</span>
        <h1>{genre || "Explore the sounds"}</h1>
        <p>Search for a song, an artist, or a feeling.</p>
      </div>
      <div className="big-search">
        <Search size={22} />
        <input
          aria-label="Search music"
          autoFocus
          placeholder="What do you want to listen to?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            aria-label="Clear search"
            className="icon-button"
            onClick={() => setQuery("")}
          >
            <X size={18} />
          </button>
        )}
      </div>
      <div className="filter-row">
        <button
          className={`filter-chip ${!genre ? "selected" : ""}`}
          onClick={() => navigate("/search")}
        >
          All music
        </button>
        {genres.map((g) => (
          <button
            className={`filter-chip ${genre === g.name ? "selected" : ""}`}
            key={g.name}
            onClick={() =>
              navigate(
                `/search?genre=${encodeURIComponent(g.name)}&q=${encodeURIComponent(query)}`,
              )
            }
          >
            {g.name}
          </button>
        ))}
      </div>
      <SectionTitle
        title={
          query
            ? `Results for “${query}”`
            : `${results.length} tracks to discover`
        }
      />
      {results.length ? (
        <TrackTable tracks={results} />
      ) : (
        <Empty
          title="No sounds found"
          description="Try another song, artist, or genre."
          icon="search"
        />
      )}
    </>
  );
}
function LibraryPage({
  route,
  onCreate,
}: {
  route: string;
  onCreate: () => void;
}) {
  const m = useMusic();
  const isLiked = route === "/liked";
  const isRecent = route === "/recent";
  const playlist = m.playlists.find((p) => route === `/playlist/${p.id}`);
  const ids = isLiked ? m.favourites : isRecent ? m.recent : playlist?.trackIds;
  const tracks =
    ids
      ?.map((id) => m.tracks.find((t) => t.id === id && t.published))
      .filter((t): t is Track => !!t) ?? [];
  return (
    <>
      <div className="page-heading library-heading">
        <div className={`library-art ${isLiked ? "liked-art" : ""}`}>
          {isLiked ? (
            <Heart size={60} fill="currentColor" />
          ) : isRecent ? (
            <Clock3 size={60} />
          ) : (
            <ListMusic size={60} />
          )}
        </div>
        <div>
          <span className="eyebrow">
            {cloudMode ? "YOUR CLOUD LIBRARY" : "YOUR LOCAL DEMO LIBRARY"}
          </span>
          <h1>
            {isLiked
              ? "Liked songs"
              : isRecent
                ? "Recently played"
                : (playlist?.name ?? "Your library")}
          </h1>
          <p>
            {ids
              ? `${tracks.length} tracks · ${cloudMode ? "Saved to your account" : "Saved in this browser"}`
              : "A little space for all the sounds you love."}
          </p>
        </div>
      </div>
      {cloudMode && (!m.user || m.user.is_anonymous) && (
        <div className="info-box">
          <UserRound size={20} />
          <p>Sign in to save your favourites and playlists to your account.</p>
          <button className="button lime" onClick={() => m.setAuthOpen(true)}>
            Sign in
          </button>
        </div>
      )}
      {ids ? (
        <>
          <div className="library-actions">
            <button
              className="button lime"
              disabled={!tracks.length}
              onClick={() => {
                if (tracks[0]) {
                  m.setQueue(tracks.slice(1).map((t) => t.id));
                  void m.play(tracks[0]);
                }
              }}
            >
              <Play size={17} fill="currentColor" /> Play collection
            </button>
            {playlist && (
              <button
                className="button secondary"
                onClick={() => {
                  void m.deletePlaylist(playlist.id);
                  navigate("/library");
                }}
              >
                Delete playlist
              </button>
            )}
          </div>
          {tracks.length ? (
            <TrackTable tracks={tracks} />
          ) : (
            <Empty
              title={
                isRecent
                  ? "Your listening story starts here"
                  : "Make it your own"
              }
              description={
                playlist
                  ? "Use the song options menu to add tracks to this playlist."
                  : "Discover a track you love, then tap the heart to save it here."
              }
            />
          )}
        </>
      ) : (
        <>
          <div className="section-heading">
            <h2>Your collections</h2>
            <button className="button secondary" onClick={onCreate}>
              <Plus size={16} /> New playlist
            </button>
          </div>
          <div className="collection-grid">
            <button
              className="collection-card"
              onClick={() => navigate("/liked")}
            >
              <div className="collection-picture liked-art">
                <Heart fill="currentColor" size={45} />
              </div>
              <strong>Liked songs</strong>
              <span>{m.favourites.length} tracks</span>
            </button>
            {m.playlists.map((p) => (
              <button
                className="collection-card"
                key={p.id}
                onClick={() => navigate(`/playlist/${p.id}`)}
              >
                <div className="collection-picture">
                  <ListMusic size={45} />
                </div>
                <strong>{p.name}</strong>
                <span>{p.trackIds.length} tracks</span>
              </button>
            ))}
            <button
              className="collection-card new-collection"
              onClick={onCreate}
            >
              <div className="collection-picture">
                <Plus size={40} />
              </div>
              <strong>Create a playlist</strong>
              <span>Start with a feeling</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}
function DetailPage({ route }: { route: string }) {
  const m = useMusic();
  const id = decodeURIComponent(route.split("/")[2] || "");
  const isArtist = route.startsWith("/artist/");
  const artist = m.artists.find((a) => a.id === id);
  const track = m.tracks.find((t) => t.id === id && t.published);
  if ((isArtist && !artist) || (!isArtist && !track))
    return (
      <Empty
        title="This release is unavailable"
        description="It may have been removed or unpublished. Explore the rest of the collection."
      />
    );
  const list = isArtist
    ? m.tracks.filter((t) => t.artist_id === id && t.published)
    : [track!];
  return (
    <>
      <div className={`detail-hero ${isArtist ? "artist-detail" : ""}`}>
        <img
          src={isArtist ? artist!.cover || "/art/artist-0.svg" : track!.cover}
          alt={isArtist ? artist!.name : track!.title}
        />
        <div>
          <span className="eyebrow">
            {isArtist
              ? "MEET THE ARTIST"
              : track!.original
                ? "HORICX ORIGINAL · DEMO RELEASE"
                : "SINGLE RELEASE"}
          </span>
          <h1>{isArtist ? artist!.name : track!.title}</h1>
          <p>{isArtist ? artist!.bio : track!.description}</p>
          <div className="detail-meta">
            {isArtist ? (
              `${list.length} original tracks`
            ) : (
              <>
                <button onClick={() => navigate(`/artist/${track!.artist_id}`)}>
                  {track!.artist}
                </button>
                <span>•</span>
                {track!.genre}
                <span>•</span>
                {formatTime(track!.duration)}
              </>
            )}
          </div>
          <div className="library-actions">
            <button
              className="button lime"
              disabled={!list.length}
              onClick={() => {
                m.setQueue(list.slice(1).map((t) => t.id));
                if (list[0]) void m.play(list[0]);
              }}
            >
              <Play size={18} fill="currentColor" /> Listen now
            </button>
            {track && (
              <button
                className="button secondary"
                onClick={() => void m.favourite(track.id)}
              >
                <Heart
                  size={17}
                  fill={
                    m.favourites.includes(track.id) ? "currentColor" : "none"
                  }
                />
                {m.favourites.includes(track.id) ? "Saved" : "Save release"}
              </button>
            )}
          </div>
        </div>
      </div>
      <SectionTitle title={isArtist ? "Popular tracks" : "On this release"} />
      <TrackTable tracks={list} />
      {track?.original && (
        <p className="provenance-note">
          Original generated demo audio. This instrumental was composed and
          synthesized locally with code. The artist is fictional, and the
          artwork is an original procedural illustration.
        </p>
      )}
      {track && (
        <p className="muted release-date">
          Released{" "}
          {new Date(track.release_date + "T12:00:00").toLocaleDateString(
            "en-GB",
            { day: "numeric", month: "long", year: "numeric" },
          )}
        </p>
      )}
      <div className="music-section">
        <SectionTitle title="Keep discovering" />
        <div className="track-grid">
          {m.tracks
            .filter((t) => t.published && !list.some((x) => x.id === t.id))
            .slice(0, 6)
            .map((t) => (
              <TrackCard track={t} key={t.id} />
            ))}
        </div>
      </div>
    </>
  );
}
export default function App() {
  const m = useMusic();
  const route = useRoute();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [search, setSearch] = useState("");
  function openPlaylist() {
    if (cloudMode && (!m.user || m.user.is_anonymous)) m.setAuthOpen(true);
    else setNewPlaylist(true);
  }
  useEffect(() => setMobileMenu(false), [route]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).matches(
          "input,textarea,select,button,[contenteditable]",
        ) ||
        m.adOpen ||
        m.authOpen
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        m.togglePlay();
      }
      if (e.code === "ArrowRight" && e.altKey) {
        e.preventDefault();
        m.next();
      }
      if (e.code === "ArrowLeft" && e.altKey) {
        e.preventDefault();
        m.previous();
      }
    };
    addEventListener("keydown", fn);
    return () => removeEventListener("keydown", fn);
  });
  const nav = [
    { path: "/", title: "Discover", icon: Home },
    { path: "/search", title: "Search", icon: Search },
    { path: "/genres", title: "Browse genres", icon: LayoutGrid },
    { path: "/artists", title: "Artists", icon: Users },
  ];
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      {mobileMenu && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside className={`sidebar ${mobileMenu ? "mobile-open" : ""}`}>
        <button
          className="wordmark"
          onClick={() => navigate("/")}
          aria-label="Horicx Music home"
        >
          <span className="brand-symbol">
            <AudioLines size={26} strokeWidth={2.6} />
          </span>
          <span>
            horicx<span className="wordmark-dot">.</span>
            <small>MUSIC, ON YOUR TERMS</small>
          </span>
        </button>
        <div className="nav-label">EXPLORE</div>
        <nav className="primary-nav">
          {nav.map((n) => (
            <button
              key={n.path}
              className={route.split("?")[0] === n.path ? "active" : ""}
              onClick={() => navigate(n.path)}
            >
              <n.icon size={19} />
              {n.title}
              {route.split("?")[0] === n.path && (
                <span className="nav-active-dot" />
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="nav-label label-with-action">
          YOUR LIBRARY
          <button
            className="icon-button"
            aria-label="Create playlist"
            onClick={() => openPlaylist()}
          >
            <Plus size={16} />
          </button>
        </div>
        <nav className="primary-nav library-nav">
          <button
            className={route === "/liked" ? "active" : ""}
            onClick={() => navigate("/liked")}
          >
            <span className="nav-tile liked-tile">
              <Heart size={14} fill="currentColor" />
            </span>
            Liked songs <span className="nav-count">{m.favourites.length}</span>
          </button>
          <button
            className={route === "/recent" ? "active" : ""}
            onClick={() => navigate("/recent")}
          >
            <span className="nav-tile">
              <Clock3 size={15} />
            </span>
            Recently played
          </button>
          <button
            className={route === "/library" ? "active" : ""}
            onClick={() => navigate("/library")}
          >
            <span className="nav-tile">
              <ListMusic size={15} />
            </span>
            Your playlists
          </button>
          {m.playlists.map((p) => (
            <button
              className={`sidebar-playlist ${route === `/playlist/${p.id}` ? "active" : ""}`}
              key={p.id}
              onClick={() => navigate(`/playlist/${p.id}`)}
            >
              <Music2 size={15} />
              <span>{p.name}</span>
            </button>
          ))}
        </nav>
        <button className="create-playlist" onClick={() => openPlaylist()}>
          <Plus size={16} /> Create playlist
        </button>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <div className="mini-sound">
              <AudioLines size={21} />
              <span>
                Good music.
                <br />
                <strong>No limits to discovery.</strong>
              </span>
            </div>
            <p>
              Your next favourite sound is
              <br />
              just a play away.
            </p>
          </div>
          {(!cloudMode || m.isAdmin) && (
            <button
              className={`admin-link ${route === "/admin" ? "active" : ""}`}
              onClick={() => navigate("/admin")}
            >
              <Settings2 size={16} />
              {cloudMode ? "Admin studio" : "Demo admin studio"}
              <ArrowUpRight size={14} />
            </button>
          )}
          <div className="sidebar-foot">
            <span>© 2026 Horicx Music</span>
            <span>Made for the love of sound.</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="header-left">
            <button
              className="icon-button mobile-menu-button"
              aria-label="Open navigation"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={21} />
            </button>
            <div className="history-controls">
              <button
                className="circle-button"
                aria-label="Go back"
                onClick={() => history.back()}
              >
                <ArrowLeft size={16} />
              </button>
              <button
                className="circle-button"
                aria-label="Go forward"
                onClick={() => history.forward()}
              >
                <ArrowRight size={16} />
              </button>
            </div>
            <form
              className="header-search"
              onSubmit={(e) => {
                e.preventDefault();
                navigate(`/search?q=${encodeURIComponent(search)}`);
              }}
            >
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search songs, artists, genres"
                placeholder="Search songs, artists, genres..."
              />
              <kbd>↵</kbd>
            </form>
          </div>
          <div className="header-right">
            <span className="mode-badge">
              <span className="live-dot" />
              {cloudMode ? "Cloud mode" : "Demo mode"}
            </span>
            <span className="header-separator" />
            {m.user && !m.user.is_anonymous ? (
              <button
                className="profile-button"
                onClick={() => void m.signOut()}
                title="Sign out"
              >
                <UserRound size={17} />
                <span>Sign out</span>
              </button>
            ) : (
              <button
                className="profile-button"
                onClick={() => m.setAuthOpen(true)}
              >
                <UserRound size={17} />
                <span>{cloudMode ? "Sign in" : "Join the sound"}</span>
                <ArrowUpRight size={14} />
              </button>
            )}
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {m.catalogError ? (
            <div className="catalog-error">
              <WifiOff size={38} />
              <h1>We couldn’t load the music.</h1>
              <p>{m.catalogError}</p>
              <button className="button lime" onClick={() => void m.refresh()}>
                Try again
              </button>
            </div>
          ) : m.loading ? (
            <div className="skeleton-page">
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-hero" />
              <div className="track-grid">
                {Array.from({ length: 6 }, (_, i) => (
                  <div className="skeleton skeleton-card" key={i} />
                ))}
              </div>
              <span className="sr-only">Loading your music library</span>
            </div>
          ) : route === "/" ? (
            <HomePage />
          ) : route.startsWith("/search") ? (
            <SearchPage route={route} />
          ) : route === "/genres" ? (
            <>
              <div className="page-heading">
                <span className="eyebrow">SOMETHING FOR EVERY SIDE OF YOU</span>
                <h1>Explore your sound.</h1>
                <p>Follow a feeling. Find a new favourite.</p>
              </div>
              <GenreGrid />
              {genres.map((g) => (
                <section className="music-section" key={g.name}>
                  <SectionTitle title={g.name} />
                  <div className="track-grid">
                    {m.tracks
                      .filter((t) => t.published && t.genre === g.name)
                      .map((t) => (
                        <TrackCard track={t} key={t.id} />
                      ))}
                  </div>
                </section>
              ))}
            </>
          ) : route === "/artists" ? (
            <>
              <div className="page-heading">
                <span className="eyebrow">THE PEOPLE BEHIND THE FEELING</span>
                <h1>Meet the artists.</h1>
                <p>
                  {cloudMode
                    ? "Independent voices, waiting to be discovered."
                    : "Fictional artists. Original sounds. A world of possibilities."}
                </p>
              </div>
              <div className="artists-grid">
                {m.artists.map((a) => (
                  <button
                    className="artist-profile"
                    onClick={() => navigate(`/artist/${a.id}`)}
                    key={a.id}
                  >
                    <img
                      src={a.cover || "/art/artist-0.svg"}
                      alt={`Illustration for ${a.name}`}
                    />
                    <h2>{a.name}</h2>
                    <span>
                      View artist <ArrowUpRight size={14} />
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : route.startsWith("/artist/") || route.startsWith("/track/") ? (
            <DetailPage route={route} />
          ) : ["/library", "/liked", "/recent"].includes(route) ||
            route.startsWith("/playlist/") ? (
            <LibraryPage route={route} onCreate={() => openPlaylist()} />
          ) : route === "/admin" ? (
            <Admin />
          ) : (
            <Empty
              title="A little off the beat"
              description="This page does not exist. Head back to discover your next favourite."
            />
          )}
        </main>
        <footer className="content-footer">
          <button className="footer-brand" onClick={() => navigate("/")}>
            <AudioLines size={20} /> horicx.
          </button>
          <span>Find a sound that feels like you.</span>
          <span>INDEPENDENT SOUNDS. EVERYDAY DISCOVERIES.</span>
        </footer>
      </div>
      <nav className="mobile-bottom-nav">
        {[
          { path: "/", label: "Discover", icon: Home },
          { path: "/search", label: "Search", icon: Search },
          { path: "/library", label: "Library", icon: ListMusic },
          {
            path: "/admin",
            label: cloudMode ? "Account" : "Studio",
            icon: cloudMode ? UserRound : Settings2,
          },
        ].map((n) => (
          <button
            key={n.path}
            className={route === n.path ? "active" : ""}
            onClick={() => {
              if (cloudMode && n.path === "/admin" && !m.isAdmin)
                m.setAuthOpen(true);
              else navigate(n.path);
            }}
          >
            <n.icon size={20} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
      <Player />
      {m.toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {m.toast}
          <button
            className="icon-button"
            onClick={() => m.notify("")}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      )}
      {m.authOpen && <AuthModal />}
      {m.adOpen && <AdModal />}
      {newPlaylist && (
        <Modal
          title="A new collection of you."
          onClose={() => setNewPlaylist(false)}
        >
          <p className="modal-subtitle">
            {cloudMode
              ? "Create a playlist in your cloud library."
              : "Demo playlists are saved in this browser."}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const p = await m.createPlaylist(playlistName);
              if (p) {
                setNewPlaylist(false);
                setPlaylistName("");
                navigate(`/playlist/${p.id}`);
              }
            }}
          >
            <label className="field-label" htmlFor="playlist-name">
              Playlist name
            </label>
            <input
              id="playlist-name"
              className="form-input"
              autoFocus
              required
              maxLength={80}
              placeholder="Late nights, good company..."
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
            />
            <button className="button lime full-width" type="submit">
              <Plus size={17} /> Create playlist
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
