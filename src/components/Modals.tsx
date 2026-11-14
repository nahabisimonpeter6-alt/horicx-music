import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  AudioLines,
  CheckCircle2,
  Headphones,
  Info,
  Loader2,
  Play,
  ShieldCheck,
  Volume2,
  X,
} from "lucide-react";
import { useMusic } from "../store";
import { api, cloudMode, ensureListener, supabase } from "../lib/cloud";
import type { Advert } from "../lib/types";
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = ref.current;
    panel?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
      }
      if (e.key === "Tab") {
        const all = panel?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),select,textarea,video,[tabindex="0"]',
        );
        if (!all?.length) return;
        const first = all[0],
          last = all[all.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === panel)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? "wide" : ""}`}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-heading"
        tabIndex={-1}
      >
        <button
          className="modal-close icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={21} />
        </button>
        <div className="modal-brand">
          <AudioLines size={25} />
        </div>
        <h2 id="modal-heading">{title}</h2>
        {children}
      </div>
    </div>
  );
}
export function AuthModal() {
  const m = useMusic();
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    try {
      const { data, error } = signup
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: location.origin },
          })
        : await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (signup && !data.session)
        setMessage(
          "Check your email to confirm your account, then come back and sign in.",
        );
      else {
        m.setAuthOpen(false);
        m.notify(
          signup ? "Welcome to Horicx Music." : "Good to have you back.",
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        cloudMode
          ? signup
            ? "Find your people. Your sound."
            : "Welcome to your world."
          : "A little music. A lot of possibility."
      }
      onClose={() => m.setAuthOpen(false)}
    >
      {cloudMode ? (
        <>
          <p className="modal-subtitle">
            {signup
              ? "Create an account to keep your favourites and playlists with you."
              : "Sign in to your favourites, playlists, and next discoveries."}
          </p>
          <div className="auth-tabs">
            <button
              className={!signup ? "active" : ""}
              onClick={() => {
                setSignup(false);
                setError("");
                setMessage("");
              }}
            >
              Sign in
            </button>
            <button
              className={signup ? "active" : ""}
              onClick={() => {
                setSignup(true);
                setError("");
                setMessage("");
              }}
            >
              Create account
            </button>
          </div>
          {message ? (
            <div className="success-box">
              <CheckCircle2 size={22} />
              <p>{message}</p>
            </div>
          ) : (
            <form onSubmit={submit}>
              <label className="field-label" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                className="form-input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="form-input"
                type="password"
                autoComplete={signup ? "new-password" : "current-password"}
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <button className="button lime full-width" disabled={busy}>
                {busy ? <Loader2 size={18} className="spin" /> : null}
                {signup ? "Create account" : "Sign in"}
                <ArrowRight size={17} />
              </button>
            </form>
          )}
          <p className="fine-print">
            Your music belongs with you. Your password is securely managed by
            Supabase Auth.
          </p>
        </>
      ) : (
        <>
          <p className="modal-subtitle">
            You’re exploring the local demo. Favourites, playlists and uploads
            work right here in your browser.
          </p>
          <div className="info-box stacked">
            <Info size={22} />
            <p>
              No account is created in demo mode. Connect your own Supabase
              project to enable real sign-up and cloud libraries.
            </p>
          </div>
          <button
            className="button lime full-width"
            onClick={() => m.setAuthOpen(false)}
          >
            Keep discovering <ArrowRight size={17} />
          </button>
        </>
      )}
    </Modal>
  );
}
export function AdModal() {
  const m = useMusic();
  const [ad, setAd] = useState<Advert | null>(null);
  const [session, setSession] = useState("");
  const [phase, setPhase] = useState<
    "loading" | "ready" | "watching" | "finishing" | "error"
  >("loading");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [retry, setRetry] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const start = useRef(0);
  const watched = useRef(0);
  const lastPosition = useRef(0);
  const lastPing = useRef(0);
  const busy = useRef(false);
  const finished = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    let cancelled = false;
    setPhase("loading");
    setError("");
    setProgress(0);
    finished.current = false;
    watched.current = 0;
    lastPosition.current = 0;
    lastPing.current = 0;
    busy.current = false;
    void (async () => {
      try {
        if (cloudMode) {
          await ensureListener();
          const data = await api<{ advert: Advert; sessionId: string }>(
            "ad_start",
          );
          if (!cancelled) {
            setAd(data.advert);
            setSession(data.sessionId);
            setPhase("ready");
          }
        } else {
          const chosen = m.adverts
            .filter((a) => a.active && a.url)
            .sort((a, b) => a.position - b.position)[0];
          if (!chosen)
            throw Error(
              "No adverts are available yet. The owner can activate one in the studio. Your library is still free to browse.",
            );
          if (!cancelled) {
            setAd(chosen);
            setPhase("ready");
          }
        }
      } catch (e) {
        if (!cancelled) {
          setPhase("error");
          setError((e as Error).message);
        }
      }
    })();
    return () => {
      cancelled = true;
      active.current = false;
      video.current?.pause();
    };
  }, [retry]);
  useEffect(() => {
    const handler = () => {
      if (document.hidden) video.current?.pause();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);
  async function heartbeat(position: number) {
    if (!cloudMode || !session) return;
    await api("ad_progress", { sessionId: session, position });
  }
  async function complete() {
    if (finished.current || !ad) return;
    finished.current = true;
    setPhase("finishing");
    try {
      if (
        watched.current < ad.duration - 0.6 ||
        Date.now() - start.current < (ad.duration - 0.6) * 1000
      )
        throw Error(
          "The advert was interrupted. Please watch it from the beginning to unlock listening.",
        );
      if (cloudMode) {
        while (busy.current) await new Promise((r) => setTimeout(r, 50));
        await heartbeat(ad.duration);
        const result = await api<{ passUntil: number }>("ad_complete", {
          sessionId: session,
        });
        if (active.current) await m.unlock(result.passUntil);
      } else if (active.current) await m.unlock();
    } catch (e) {
      if (active.current) {
        setPhase("error");
        setError((e as Error).message);
      }
    }
  }
  function update() {
    const v = video.current;
    if (!v || !ad || finished.current) return;
    const delta = v.currentTime - lastPosition.current;
    if (delta >= 0 && delta < 1.6) watched.current += delta;
    lastPosition.current = v.currentTime;
    setProgress(Math.min(100, (v.currentTime / ad.duration) * 100));
    if (cloudMode && v.currentTime - lastPing.current >= 2 && !busy.current) {
      lastPing.current = v.currentTime;
      busy.current = true;
      void heartbeat(v.currentTime)
        .catch((e) => {
          if (active.current) {
            v.pause();
            setPhase("error");
            setError((e as Error).message);
          }
        })
        .finally(() => {
          busy.current = false;
        });
    }
  }
  return (
    <Modal
      title={`A short break. A longer escape.`}
      onClose={() => m.setAdOpen(false)}
      wide
    >
      <p className="modal-subtitle">
        Watch a short ad to unlock {m.listenMinutes} minutes of music.
      </p>
      <div className="ad-label">
        <span className="live-dot" />
        {cloudMode ? "HORICX ADVERT" : "DEMO ADVERT"}
        <span>
          {ad ? `${ad.duration.toFixed(0)} seconds` : "Finding an advert"}
        </span>
      </div>
      {phase === "error" ? (
        <div className="ad-error">
          <Info size={32} />
          <h3>Let’s try that again.</h3>
          <p role="alert">{error}</p>
          <button
            className="button lime"
            onClick={() => setRetry((v) => v + 1)}
          >
            Try again
          </button>
          <button className="text-link" onClick={() => m.setAdOpen(false)}>
            Keep browsing
          </button>
        </div>
      ) : phase === "loading" ? (
        <div className="ad-loading">
          <Loader2 className="spin" size={30} />
          <span>Getting your advert ready…</span>
        </div>
      ) : (
        <div className="ad-video-wrap">
          <video
            key={`${ad?.id}-${retry}`}
            ref={video}
            src={ad?.url}
            playsInline
            preload="auto"
            controls
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            onPlay={() => {
              if (!start.current || video.current!.currentTime < 0.2)
                start.current = Date.now();
              setPhase("watching");
            }}
            onTimeUpdate={update}
            onRateChange={() => {
              if (video.current) video.current.playbackRate = 1;
            }}
            onSeeking={() => {
              const v = video.current;
              if (v && v.currentTime > watched.current + 0.8)
                v.currentTime = Math.max(0, watched.current);
            }}
            onEnded={() => void complete()}
            onError={() => {
              setPhase("error");
              setError(
                "This advert could not be played. Check your connection, try again, or keep browsing.",
              );
            }}
          />
          {phase === "ready" && (
            <button
              className="ad-start"
              onClick={() => {
                void video.current?.play().catch(() => {
                  setPhase("error");
                  setError("Playback was blocked. Please try again.");
                });
              }}
            >
              <span>
                <Play size={25} fill="currentColor" />
              </span>
              Play {cloudMode ? "advert" : "demo advert"}
            </button>
          )}
          {phase === "finishing" && (
            <div className="ad-finishing">
              <Loader2 className="spin" /> Unlocking your music…
            </div>
          )}
        </div>
      )}
      <div
        className="ad-progress"
        role="progressbar"
        aria-label="Advert playback progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div style={{ width: `${progress}%` }} />
      </div>
      <div className="ad-footnote">
        <ShieldCheck size={17} />
        <span>
          Finish the video to get your pass. Closing it won’t unlock listening.
        </span>
      </div>
      {!cloudMode && (
        <p className="fine-print">
          This locally generated demo advert demonstrates the experience. Demo
          passes are stored in this browser and do not provide production
          security.
        </p>
      )}
    </Modal>
  );
}
