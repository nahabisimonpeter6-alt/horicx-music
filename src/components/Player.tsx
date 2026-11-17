import {
  ArrowUp,
  ArrowDown,
  Moon,
  Check,
  AudioLines,
  ChevronDown,
  Heart,
  ListMusic,
  Loader2,
  Maximize2,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useState } from "react";
import { useMusic, formatTime } from "../store";
import { navigate } from "../App";
import { Modal } from "./Modals";
export function Player() {
  const m = useMusic();
  const [expanded, setExpanded] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const track = m.current ?? m.tracks.find((t) => t.published);
  return (
    <>
      <section
        className={`player ${expanded ? "player-expanded" : ""}`}
        aria-label="Music player"
      >
        <button
          className="collapse-player icon-button"
          aria-label="Collapse player"
          onClick={() => setExpanded(false)}
        >
          <ChevronDown size={24} />
        </button>
        <div className="now-playing">
          {track ? (
            <>
              <button
                className="player-art"
                onClick={() => {
                  if (matchMedia("(max-width:600px)").matches)
                    setExpanded(true);
                  else navigate(`/track/${track.id}`);
                }}
                aria-label={`View ${track.title}`}
              >
                <img src={track.cover} alt="Current track artwork" />
              </button>
              <div className="now-playing-copy">
                <button onClick={() => navigate(`/track/${track.id}`)}>
                  {track.title}
                </button>
                <span>{track.artist}</span>
                {expanded && <span className="eyebrow">HORICX MUSIC</span>}
              </div>
              <button
                className={`icon-button player-heart ${m.favourites.includes(track.id) ? "is-liked" : ""}`}
                aria-label="Like current track"
                onClick={() => void m.favourite(track.id)}
              >
                <Heart
                  size={18}
                  fill={
                    m.favourites.includes(track.id) ? "currentColor" : "none"
                  }
                />
              </button>
            </>
          ) : (
            <>
              <span className="player-placeholder">
                <AudioLines size={26} />
              </span>
              <div className="now-playing-copy">
                <strong>Your world, on play</strong>
                <span>Choose a track to get started</span>
              </div>
            </>
          )}
        </div>
        <div className="player-center">
          <div className="playback-controls">
            <button
              className={`icon-button shuffle-control ${m.shuffle ? "enabled" : ""}`}
              aria-label="Shuffle"
              aria-pressed={m.shuffle}
              onClick={() => m.setShuffle(!m.shuffle)}
            >
              <Shuffle size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="Previous track"
              onClick={m.previous}
            >
              <SkipBack size={19} fill="currentColor" />
            </button>
            <button
              className="main-play"
              aria-label={m.playing ? "Pause" : "Play"}
              onClick={m.togglePlay}
              disabled={!track}
            >
              {m.buffering ? (
                <Loader2 className="spin" size={21} />
              ) : m.playing ? (
                <Pause size={19} fill="currentColor" />
              ) : (
                <Play size={19} fill="currentColor" />
              )}
            </button>
            <button
              className="icon-button"
              aria-label="Next track"
              onClick={m.next}
            >
              <SkipForward size={19} fill="currentColor" />
            </button>
            <button
              className={`icon-button repeat-control ${m.repeat ? "enabled" : ""}`}
              aria-label="Repeat track"
              aria-pressed={m.repeat}
              onClick={() => m.setRepeat(!m.repeat)}
            >
              <Repeat size={17} />
            </button>
          </div>
          <div className="seek-row">
            <span>{formatTime(m.time)}</span>
            <input
              aria-label="Seek track"
              type="range"
              min="0"
              max={m.duration || track?.duration || 1}
              step="0.1"
              value={m.time}
              onChange={(e) => m.seek(Number(e.target.value))}
              style={
                {
                  "--range-progress": `${(m.time / (m.duration || track?.duration || 1)) * 100}%`,
                } as React.CSSProperties
              }
            />
            <span>{formatTime(m.duration || track?.duration || 0)}</span>
          </div>
        </div>
        <div className="player-right">
          <button
            className={`icon-button ${m.queueOpen ? "enabled" : ""}`}
            aria-label="Open queue"
            onClick={() => {
              m.setQueueOpen(!m.queueOpen);
              setExpanded(false);
            }}
          >
            <ListMusic size={19} />
            {m.queue.length > 0 && <span className="queue-dot" />}
          </button>
          <button
            className={`icon-button sleep-control ${m.sleepTimer !== null ? "enabled" : ""}`}
            aria-label="Sleep timer"
            title={
              m.sleepTimer === null
                ? "Sleep timer"
                : m.sleepTimer === "track"
                  ? "Sleep timer: end of track"
                  : `Sleep timer: ${formatTime(Math.max(0, (m.sleepTimer - m.clock) / 1000))} remaining`
            }
            aria-pressed={m.sleepTimer !== null}
            onClick={() => setTimerOpen(true)}
          >
            <Moon size={18} />
            {m.sleepTimer !== null && <span className="queue-dot" />}
          </button>
          <span className="player-divider" />
          <button
            className="icon-button volume-button"
            aria-label={m.volume === 0 ? "Unmute" : "Mute"}
            onClick={() => m.setVolume(m.volume === 0 ? 0.7 : 0)}
          >
            {m.volume === 0 ? (
              <VolumeX size={19} />
            ) : m.volume < 0.5 ? (
              <Volume1 size={19} />
            ) : (
              <Volume2 size={19} />
            )}
          </button>
          <input
            className="volume-range"
            aria-label="Volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={m.volume}
            onChange={(e) => m.setVolume(Number(e.target.value))}
            style={
              {
                "--range-progress": `${m.volume * 100}%`,
              } as React.CSSProperties
            }
          />
          <button
            className="icon-button expand-button"
            aria-label="Expand player"
            onClick={() => setExpanded(!expanded)}
          >
            <Maximize2 size={16} />
          </button>
        </div>
        <button
          className="mobile-expand"
          aria-label="Expand current track"
          onClick={() => setExpanded(!expanded)}
        />
      </section>
      {m.playError && (
        <div className="playback-error" role="alert">
          <span>{m.playError}</span>
          <button
            onClick={() => {
              if (m.current) void m.play(m.current);
            }}
          >
            Retry
          </button>
        </div>
      )}
      {m.queueOpen && (
        <aside className="queue-panel" aria-label="Playback queue">
          <div className="section-heading">
            <h2>Your queue</h2>
            <button
              className="icon-button"
              aria-label="Close queue"
              onClick={() => m.setQueueOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          {m.current && (
            <>
              <span className="eyebrow">NOW PLAYING</span>
              <div className="queue-track">
                <img src={m.current.cover} alt="" />
                <div>
                  <strong>{m.current.title}</strong>
                  <span>{m.current.artist}</span>
                </div>
                <AudioLines size={19} className="lime-text" />
              </div>
            </>
          )}
          <div className="section-heading">
            <span className="eyebrow">UP NEXT</span>
            {m.queue.length > 0 && (
              <button className="text-link" onClick={() => m.setQueue([])}>
                Clear
              </button>
            )}
          </div>
          {m.queue.length ? (
            m.queue.map((id, i) => {
              const t = m.tracks.find((x) => x.id === id);
              return t ? (
                <div className="queue-track" key={`${id}-${i}`}>
                  <button
                    aria-label={`Play queued ${t.title}`}
                    onClick={() => {
                      m.setQueue((q) => q.filter((_, j) => j !== i));
                      void m.play(t);
                    }}
                  >
                    <img src={t.cover} alt="" />
                  </button>
                  <div>
                    <strong>{t.title}</strong>
                    <span>{t.artist}</span>
                  </div>
                  <div className="queue-reorder">
                    <button
                      className="icon-button"
                      aria-label={`Move ${t.title} up in queue`}
                      disabled={i === 0}
                      onClick={() => m.moveQueue(i, -1)}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Move ${t.title} down in queue`}
                      disabled={i === m.queue.length - 1}
                      onClick={() => m.moveQueue(i, 1)}
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${t.title} from queue`}
                    onClick={() =>
                      m.setQueue((q) => q.filter((_, j) => j !== i))
                    }
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : null;
            })
          ) : (
            <div className="queue-empty">
              <ListMusic size={30} />
              <h3>Make room for the next one.</h3>
              <p>Add a track from its options menu.</p>
            </div>
          )}
        </aside>
      )}
      {timerOpen && (
        <Modal
          title="A softer end to your day."
          onClose={() => setTimerOpen(false)}
        >
          <p className="modal-subtitle">
            Let the music drift off when you do. Your timer works across pages
            while this app is open.
          </p>
          {m.sleepTimer !== null && (
            <div className="timer-current">
              <Moon size={20} />
              <div>
                <strong>
                  {m.sleepTimer === "track"
                    ? "At the end of this track"
                    : `${formatTime(Math.max(0, (m.sleepTimer - m.clock) / 1000))} remaining`}
                </strong>
                <span>Music will pause automatically</span>
              </div>
            </div>
          )}
          <div className="timer-options">
            {[5, 15, 30, 60].map((minutes) => (
              <button
                key={minutes}
                onClick={() => {
                  m.setSleep(minutes);
                  setTimerOpen(false);
                }}
              >
                <Moon size={16} />
                <span>{minutes} minutes</span>
                <span className="timer-choice-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
            <button
              disabled={!m.current}
              onClick={() => {
                m.setSleep("track");
                setTimerOpen(false);
              }}
            >
              <AudioLines size={17} />
              <span>End of this track</span>
              {m.sleepTimer === "track" && <Check size={16} />}
            </button>
            {m.sleepTimer !== null && (
              <button
                className="cancel-timer"
                onClick={() => {
                  m.setSleep(null);
                  setTimerOpen(false);
                }}
              >
                <X size={17} />
                <span>Cancel sleep timer</span>
              </button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
