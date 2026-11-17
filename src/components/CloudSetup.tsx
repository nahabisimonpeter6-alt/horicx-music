import {
  ArrowRight,
  AudioLines,
  Cloud,
  Database,
  Headphones,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { configuration } from "../lib/app-config";
const configurationIssue = configuration.issue;
export function CloudSetup({
  backendPending = false,
  onRetry,
}: { backendPending?: boolean; onRetry?: () => void } = {}) {
  const projectUrl = configuration.url;
  const host = configuration.issue ? "" : new URL(projectUrl).hostname;
  const ref = host.endsWith(".supabase.co")
    ? host.slice(0, -".supabase.co".length)
    : null;
  return (
    <div className="launch-shell">
      <header className="launch-header">
        <a className="launch-brand" href="/">
          <AudioLines size={31} />
          <strong>
            horicx<span>.</span>
          </strong>
          <small>MUSIC, ON YOUR TERMS</small>
        </a>
        <span className="launch-status">
          <span />
          Cloud setup required
        </span>
      </header>
      <main className="launch-main">
        <section className="launch-hero">
          <div className="launch-hero-art" />
          <div className="launch-hero-copy">
            <span className="eyebrow">
              <Headphones size={14} /> A NEW HOME FOR YOUR SOUND
            </span>
            <h1>
              Your music.
              <br />
              Your platform<span>.</span>
            </h1>
            <p>
              Independent sounds deserve a place of their own. Connect your
              music library to bring Horicx Music to life.
            </p>
            <div className="launch-actions">
              <a
                className="button lime"
                href={
                  ref
                    ? `https://supabase.com/dashboard/project/${ref}`
                    : "https://supabase.com/dashboard/new"
                }
                target="_blank"
                rel="noreferrer"
              >
                {ref
                  ? "Open your Supabase project"
                  : "Create your Supabase project"}{" "}
                <ArrowRight size={17} />
              </a>
              <a className="button hero-secondary" href="/setup-guide.html">
                Setup instructions <Settings2 size={16} />
              </a>
            </div>
          </div>
        </section>
        <section className="launch-notice" role="status">
          <Cloud size={23} />
          <div>
            <strong>
              {backendPending
                ? "Your database and music API need setup"
                : configurationIssue === "private-key"
                  ? "A public project key is required"
                  : configurationIssue === "invalid-url"
                    ? "Check your Supabase project URL"
                    : "Your cloud library is waiting to be connected"}
            </strong>
            <p>
              {backendPending
                ? "Your project URL is configured, but the music API is not deployed. Apply the database migrations and deploy music-api to activate your library."
                : configurationIssue === "private-key"
                  ? "A privileged server key cannot be used in this website. Use a public publishable or anon key."
                  : "The database, administrator sign-in and private uploads become available after Supabase is configured. Uploading and listening stay unavailable until setup is complete."}
            </p>
          </div>
          {onRetry && (
            <button className="button secondary" onClick={onRetry}>
              Check connection
            </button>
          )}
        </section>
        <div className="launch-features">
          {[
            {
              icon: Database,
              title: "A library that belongs to you",
              text: "PostgreSQL holds your real artists, albums, playlists and listening history.",
            },
            {
              icon: LockKeyhole,
              title: "Private music, secure playback",
              text: "Audio is kept in private cloud storage, with short-lived links for authorised listeners.",
            },
            {
              icon: Upload,
              title: "Your own upload studio",
              text: "Add your music, artwork and adverts through an administrator account.",
            },
          ].map((f) => (
            <article key={f.title}>
              <f.icon size={24} />
              <h2>{f.title}</h2>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
        <p className="launch-footnote">
          <ShieldCheck size={15} />
          Cloud configuration is required before sign-in, music uploads and
          listening are available.
        </p>
      </main>
      <footer className="launch-footer">
        © {new Date().getFullYear()} Horicx Music{" "}
        <span>Find a sound that feels like you.</span>
      </footer>
    </div>
  );
}
