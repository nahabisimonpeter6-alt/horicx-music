import {
  ArrowRight,
  AudioLines,
  ChevronRight,
  Clock3,
  Play,
  Sparkles,
} from "lucide-react";
import { useMusic, formatTime } from "../store";
import { dailyMixes } from "../lib/discovery";
import { navigate, TrackTable } from "../App";
export function DiscoveryShelf() {
  const m = useMusic();
  const mixes = dailyMixes(m.tracks, m.favourites, m.recent, m.followedArtists);
  const recent = m.recent
    .map((id) => m.tracks.find((t) => t.id === id && t.published))
    .filter((t) => !!t)
    .slice(0, 4);
  return (
    <section
      className="music-section discovery-shelf"
      aria-label="Made for you"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">A LITTLE MORE YOU, EVERY DAY</span>
          <h2>Made for you</h2>
        </div>
        <Sparkles size={19} className="lime-text" />
      </div>
      <div className="daily-mixes">
        {mixes.map((mix, i) => (
          <button
            className={`daily-mix ${mix.theme}`}
            key={mix.id}
            onClick={() => navigate(`/mix/${mix.id}`)}
          >
            <div className="mix-art">
              {mix.tracks.slice(0, 4).map((t) => (
                <img src={t.cover} key={t.id} alt="" />
              ))}
              <span className="mix-number">0{i + 1}</span>
              <span className="mix-play">
                <Play size={19} fill="currentColor" />
              </span>
            </div>
            <div className="mix-copy">
              <strong>{mix.title}</strong>
              <span>{mix.subtitle}</span>
              <small>
                {mix.tracks.length} tracks <ArrowRight size={13} />
              </small>
            </div>
          </button>
        ))}
      </div>
      {recent.length > 0 && (
        <div className="jump-back">
          <div className="section-heading">
            <h3>Jump back in</h3>
            <button className="text-link" onClick={() => navigate("/recent")}>
              Your listening history <ChevronRight size={14} />
            </button>
          </div>
          <div className="quick-picks">
            {recent.map((t) => (
              <button
                className="quick-pick"
                key={t.id}
                onClick={() => void m.play(t)}
                aria-label={`Resume ${t.title}`}
              >
                <img src={t.cover} alt="" />
                <div>
                  <strong>{t.title}</strong>
                  <span>{t.artist}</span>
                </div>
                <Play size={15} fill="currentColor" />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
export function MixPage({ id }: { id: string }) {
  const m = useMusic();
  const mix = dailyMixes(
    m.tracks,
    m.favourites,
    m.recent,
    m.followedArtists,
  ).find((x) => x.id === id);
  if (!mix)
    return (
      <div className="empty-state">
        <Sparkles size={32} />
        <h2>This mix is waiting for more music.</h2>
        <p>Explore the catalogue to find your next favourite.</p>
        <button className="button lime" onClick={() => navigate("/")}>
          Discover music
        </button>
      </div>
    );
  return (
    <>
      <div className={`mix-hero ${mix.theme}`}>
        <div className="mix-hero-art">
          <div className="mix-cover-grid">
            {mix.tracks.slice(0, 4).map((t) => (
              <img src={t.cover} alt="" key={t.id} />
            ))}
          </div>
          <AudioLines size={48} />
        </div>
        <div>
          <span className="eyebrow">MADE FOR YOU · HORICX MIX</span>
          <h1>{mix.title}</h1>
          <p>{mix.subtitle}</p>
          <div className="mix-meta">
            <span>{mix.tracks.length} tracks</span>
            <span>•</span>
            <Clock3 size={13} />
            <span>
              {formatTime(
                mix.tracks.reduce((total, t) => total + t.duration, 0),
              )}
            </span>
          </div>
          <button
            className="button lime"
            onClick={() => {
              m.setQueue(mix.tracks.slice(1).map((t) => t.id));
              void m.play(mix.tracks[0]);
            }}
          >
            <Play size={17} fill="currentColor" />
            Play mix
          </button>
        </div>
      </div>
      <div className="mix-explanation">
        <Sparkles size={17} />
        <p>
          {id === "daily"
            ? "Your likes, recent listening and followed artists shape this mix. It updates as your listening changes."
            : "A mood-based selection from the available catalogue. New matching releases join automatically."}
        </p>
      </div>
      <TrackTable tracks={mix.tracks} />
    </>
  );
}
