import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Disc3,
  Edit3,
  FileAudio,
  Film,
  FolderUp,
  ImagePlus,
  Info,
  LayoutDashboard,
  Loader2,
  Music2,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { useMusic, formatTime } from "../store";
import { api, cloudMode, uploadCloud } from "../lib/cloud";
import {
  deleteFile,
  mediaDuration,
  putFile,
  readLocal,
  validateFile,
  writeLocal,
} from "../lib/storage";
import type { Advert, Album, Artist, Track } from "../lib/types";
import { Modal } from "./Modals";
const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";
export function Admin() {
  const m = useMusic();
  const [tab, setTab] = useState("Overview");
  const [songOpen, setSongOpen] = useState(false);
  const [adOpen, setAdOpen] = useState(false);
  const [edit, setEdit] = useState<Track | null>(null);
  const [entity, setEntity] = useState<{
    kind: "artist" | "album";
    item?: Artist | Album;
  } | null>(null);
  const [confirm, setConfirm] = useState<{
    text: string;
    action: () => Promise<void>;
  } | null>(null);
  const [minutes, setMinutes] = useState(m.listenMinutes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingAdStatus, setPendingAdStatus] = useState<
    Record<string, boolean>
  >({});
  async function run(fn: () => Promise<void>, message: string) {
    setError("");
    setBusy(true);
    try {
      await fn();
      m.notify(message);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function changeAd(a: Advert) {
    setPendingAdStatus((p) => ({ ...p, [a.id]: a.active }));
    try {
      await run(async () => {
        if (cloudMode)
          await api("admin_update_advert", {
            advert: {
              id: a.id,
              title: a.title,
              active: a.active,
              position: a.position,
            },
          });
        else if (a.id === "demo-advert")
          writeLocal("demo-ad-edit", {
            active: a.active,
            position: a.position,
          });
        else
          writeLocal(
            "adverts",
            readLocal<Advert[]>("adverts", []).map((x) =>
              x.id === a.id ? { ...a, url: undefined } : x,
            ),
          );
        await m.refresh();
      }, "Advert updated.");
    } finally {
      setPendingAdStatus((p) => {
        const next = { ...p };
        delete next[a.id];
        return next;
      });
    }
  }
  if (cloudMode && !m.isAdmin)
    return (
      <div className="admin-locked">
        <ShieldCheck size={45} />
        <h1>Owner’s studio</h1>
        <p>
          This area requires an administrator account. Admin access is verified
          by the server and database policies.
        </p>
        <button className="button lime" onClick={() => m.setAuthOpen(true)}>
          Sign in as administrator <ArrowUpRight size={17} />
        </button>
      </div>
    );
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">
            <span className="live-dot" />{" "}
            {cloudMode
              ? "YOUR MUSIC, YOUR CONTROL"
              : "LOCAL DEMO · OWNER’S STUDIO"}
          </span>
          <h1>
            Behind the sound<span>.</span>
          </h1>
          <p>Your catalogue, your artists, your next big release.</p>
        </div>
        <button className="button lime" onClick={() => setSongOpen(true)}>
          <Plus size={18} /> Upload a song
        </button>
      </div>
      {!cloudMode && (
        <div className="demo-admin-notice">
          <Info size={21} />
          <div>
            <strong>Your own little test studio.</strong>
            <p>
              Uploads and changes stay in this browser. No files are publicly
              uploaded, no real accounts are created, and counts below are local
              demo activity.
            </p>
          </div>
        </div>
      )}
      <div className="admin-tabs">
        {[
          { name: "Overview", icon: LayoutDashboard },
          { name: "Music", icon: Music2 },
          { name: "Artists", icon: Users },
          { name: "Albums", icon: Disc3 },
          { name: "Adverts", icon: Film },
          { name: "Settings", icon: Settings2 },
        ].map((t) => (
          <button
            className={tab === t.name ? "active" : ""}
            onClick={() => {
              setTab(t.name);
              setError("");
            }}
            key={t.name}
          >
            <t.icon size={16} />
            {t.name}
          </button>
        ))}
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {tab === "Overview" && (
        <>
          <div className="stats-grid">
            {[
              {
                label: "Tracks in catalogue",
                value: cloudMode ? m.stats.songs : m.tracks.length,
                icon: Music2,
                note: `${m.tracks.filter((t) => t.published).length} published`,
              },
              {
                label: "Registered listeners",
                value: cloudMode ? m.stats.users : "—",
                icon: Users,
                note: cloudMode
                  ? "Email accounts only"
                  : "No accounts in demo mode",
              },
              {
                label: "Track plays",
                value: m.stats.plays,
                icon: Volume2,
                note: cloudMode
                  ? "Playback links issued"
                  : "Actual local playback starts",
              },
              {
                label: "Adverts completed",
                value: m.stats.completions,
                icon: CheckCircle2,
                note: cloudMode
                  ? "Server-verified completions"
                  : "Local demo completions",
              },
            ].map((s) => (
              <div className="stat-card" key={s.label}>
                <div>
                  <span>{s.label}</span>
                  <s.icon size={19} />
                </div>
                <strong>{s.value ?? 0}</strong>
                <small>{s.note}</small>
              </div>
            ))}
          </div>
          <div className="admin-quick-grid">
            <button className="quick-card" onClick={() => setSongOpen(true)}>
              <span className="quick-icon">
                <FolderUp size={27} />
              </span>
              <div>
                <h3>Let a new sound in.</h3>
                <p>Upload an MP3, add its artwork, and make it yours.</p>
              </div>
              <ArrowUpRight size={21} />
            </button>
            <button
              className="quick-card violet"
              onClick={() => setAdOpen(true)}
            >
              <span className="quick-icon">
                <Film size={27} />
              </span>
              <div>
                <h3>Keep the music going.</h3>
                <p>Add a short advert to unlock your listeners’ music.</p>
              </div>
              <ArrowUpRight size={21} />
            </button>
          </div>
          <div className="section-heading">
            <h2>Your catalogue</h2>
            <button className="text-link" onClick={() => setTab("Music")}>
              Manage music <ArrowUpRight size={15} />
            </button>
          </div>
        </>
      )}
      {(tab === "Overview" || tab === "Music") && (
        <>
          <div className="admin-track-list">
            {m.tracks.length ? (
              m.tracks.map((t) => (
                <div className="admin-track" key={t.id}>
                  <img src={t.cover} alt="" />
                  <div className="admin-track-name">
                    <strong>{t.title}</strong>
                    <span>
                      {t.artist} · {t.genre}
                    </span>
                  </div>
                  <span
                    className={`status-tag ${t.published ? "published" : ""}`}
                  >
                    {t.published ? "Published" : "Draft"}
                  </span>
                  <span className="muted admin-duration">
                    {formatTime(t.duration)}
                  </span>
                  <button
                    className="icon-button"
                    aria-label={`Edit ${t.title}`}
                    onClick={() => setEdit(t)}
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    className="icon-button"
                    disabled={busy}
                    aria-label={`${t.published ? "Unpublish" : "Publish"} ${t.title}`}
                    title={t.published ? "Unpublish" : "Publish"}
                    onClick={() =>
                      void run(
                        () => m.updateTrack({ ...t, published: !t.published }),
                        t.published ? "Track unpublished." : "Track published.",
                      )
                    }
                  >
                    {t.published ? <X size={16} /> : <Check size={16} />}
                  </button>
                  <button
                    className="icon-button danger"
                    aria-label={`Delete ${t.title}`}
                    disabled={!t.local && !cloudMode}
                    title={
                      !t.local && !cloudMode
                        ? "Bundled originals can be unpublished"
                        : "Delete track"
                    }
                    onClick={() =>
                      setConfirm({
                        text: `Delete “${t.title}” and its uploaded files? This cannot be undone.`,
                        action: () => m.removeTrack(t),
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Music2 size={36} />
                <h3>Your first release starts here.</h3>
                <p>Add an MP3 and give your listeners something to discover.</p>
                <button
                  className="button lime"
                  onClick={() => setSongOpen(true)}
                >
                  Upload a song
                </button>
              </div>
            )}
          </div>
          {!cloudMode && (
            <p className="fine-print">
              Bundled original samples can be edited or unpublished. Delete is
              available for your own local uploads.
            </p>
          )}
        </>
      )}
      {(tab === "Artists" || tab === "Albums") && (
        <>
          <div className="section-heading">
            <h2>
              {tab === "Artists" ? "The voices in your world" : "Your releases"}
            </h2>
            <button
              className="button secondary"
              onClick={() =>
                setEntity({ kind: tab === "Artists" ? "artist" : "album" })
              }
            >
              <Plus size={16} /> Add {tab === "Artists" ? "artist" : "album"}
            </button>
          </div>
          <div className="entity-list">
            {(tab === "Artists" ? m.artists : m.albums).map((item) => (
              <div className="entity-row" key={item.id}>
                {"name" in item ? (
                  <img
                    src={item.cover || "/art/artist-placeholder.svg"}
                    alt=""
                  />
                ) : (
                  <div className="entity-icon">
                    <Disc3 size={24} />
                  </div>
                )}
                <div>
                  <strong>{"name" in item ? item.name : item.title}</strong>
                  <span>
                    {"name" in item
                      ? item.bio
                      : m.artists.find((a) => a.id === item.artist_id)?.name}
                  </span>
                </div>
                <button
                  className="icon-button"
                  aria-label={`Edit ${"name" in item ? item.name : item.title}`}
                  disabled={!cloudMode && item.id.startsWith("artist-")}
                  onClick={() =>
                    setEntity({
                      kind: tab === "Artists" ? "artist" : "album",
                      item,
                    })
                  }
                >
                  <Edit3 size={16} />
                </button>
                <button
                  className="icon-button danger"
                  disabled={!cloudMode && item.id.startsWith("artist-")}
                  aria-label="Delete entry"
                  onClick={() =>
                    setConfirm({
                      text: "Delete this entry? Entries used by tracks or albums must be reassigned first.",
                      action: async () => {
                        const kind = tab === "Artists" ? "artist" : "album";
                        if (cloudMode)
                          await api("admin_delete_entity", {
                            kind,
                            id: item.id,
                          });
                        else {
                          if (
                            m.tracks.some((t) =>
                              kind === "artist"
                                ? t.artist_id === item.id
                                : t.album_id === item.id,
                            ) ||
                            (kind === "artist" &&
                              m.albums.some((a) => a.artist_id === item.id))
                          )
                            throw Error(
                              "This entry is still used by tracks or albums. Reassign them first.",
                            );
                          writeLocal(
                            kind === "artist" ? "artists" : "albums",
                            (kind === "artist"
                              ? readLocal<Artist[]>("artists", [])
                              : readLocal<Album[]>("albums", [])
                            ).filter((x) => x.id !== item.id),
                          );
                        }
                        await m.refresh();
                      },
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          {!(tab === "Artists" ? m.artists : m.albums).length && (
            <div className="empty-state">
              <Disc3 size={35} />
              <h3>No {tab.toLowerCase()} yet.</h3>
              <p>Use the add button to create your first entry.</p>
            </div>
          )}
          {!cloudMode && tab === "Artists" && (
            <p className="fine-print">
              The six fictional demo artists are bundled with the original
              tracks. Add your own artists to try editing and deleting.
            </p>
          )}
        </>
      )}
      {tab === "Adverts" && (
        <>
          <div className="section-heading">
            <div>
              <h2>A short break. More listening.</h2>
              <p className="muted">
                Active adverts are served in ascending order of priority.
              </p>
            </div>
            <button className="button lime" onClick={() => setAdOpen(true)}>
              <Plus size={16} /> Add advert
            </button>
          </div>
          <div className="advert-grid">
            {m.adverts.map((a) => (
              <article className="advert-card" key={a.id}>
                <div className="advert-thumb">
                  {a.url ? (
                    <video
                      src={a.url}
                      controls
                      preload="metadata"
                      playsInline
                    />
                  ) : (
                    <Film size={40} />
                  )}
                  <span className="video-duration">
                    {formatTime(a.duration)}
                  </span>
                </div>
                <div className="advert-card-body">
                  <strong>{a.title}</strong>
                  <span className="fine-print">
                    {a.id === "demo-advert"
                      ? "Locally generated demo advert"
                      : cloudMode
                        ? "Private uploaded advert"
                        : "Local browser upload"}
                  </span>
                  <div className="advert-settings">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={pendingAdStatus[a.id] ?? a.active}
                        disabled={busy}
                        onChange={() =>
                          void changeAd({ ...a, active: !a.active })
                        }
                      />
                      <span>{a.active ? "Active" : "Inactive"}</span>
                    </label>
                    <label className="priority-label">
                      Priority
                      <input
                        type="number"
                        min="0"
                        max="999"
                        defaultValue={a.position}
                        aria-label={`Priority for ${a.title}`}
                        onBlur={(e) => {
                          const n = Math.max(
                            0,
                            Math.min(999, Number(e.target.value) || 0),
                          );
                          if (n !== a.position)
                            void changeAd({ ...a, position: n });
                        }}
                      />
                    </label>
                    <button
                      className="icon-button danger"
                      disabled={a.id === "demo-advert"}
                      aria-label={`Delete advert ${a.title}`}
                      onClick={() =>
                        setConfirm({
                          text: `Delete “${a.title}” and its video?`,
                          action: async () => {
                            if (cloudMode)
                              await api("admin_delete_advert", { id: a.id });
                            else {
                              await deleteFile(a.id);
                              writeLocal(
                                "adverts",
                                readLocal<Advert[]>("adverts", []).filter(
                                  (x) => x.id !== a.id,
                                ),
                              );
                            }
                            await m.refresh();
                          },
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {tab === "Settings" && (
        <div className="settings-panel">
          <Settings2 size={29} />
          <h2>A listening experience that fits.</h2>
          <p>
            Choose how much music a completed advert unlocks. Existing passes
            keep their original expiry.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                if (cloudMode) await api("admin_settings", { minutes });
                else writeLocal("minutes", minutes);
                m.setListenMinutes(minutes);
              }, "Listening period saved.");
            }}
          >
            <label className="field-label" htmlFor="listening-period">
              Listening pass duration (minutes)
            </label>
            <input
              className="form-input"
              id="listening-period"
              required
              type="number"
              min="1"
              max="120"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
            <p className="fine-print">
              Between 1 and 120 minutes. The default is 30 minutes.
            </p>
            <button className="button lime" disabled={busy}>
              <Save size={16} /> Save settings
            </button>
          </form>
          <div className="info-box stacked">
            <ShieldCheck size={22} />
            <p>
              {cloudMode
                ? "The backend checks advert sessions and listening passes before issuing short-lived playback URLs. These checks reduce bypassing; they cannot prove human attention or prevent recording."
                : "Demo unlocks are stored locally and can be reset or modified by the browser owner. Production checks run on the Supabase server after you connect your project."}
            </p>
          </div>
        </div>
      )}
      {(songOpen || edit) && (
        <SongForm
          track={edit ?? undefined}
          onClose={() => {
            setSongOpen(false);
            setEdit(null);
          }}
        />
      )}
      {adOpen && <AdvertForm onClose={() => setAdOpen(false)} />}{" "}
      {entity && (
        <EntityForm
          kind={entity.kind}
          item={entity.item}
          onClose={() => setEntity(null)}
        />
      )}
      {confirm && (
        <Modal
          title="Make this change?"
          onClose={() => {
            if (!busy) setConfirm(null);
          }}
        >
          <p className="modal-subtitle">{confirm.text}</p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="confirm-actions">
            <button
              className="button secondary"
              onClick={() => setConfirm(null)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              className="button danger-button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await confirm.action();
                  setConfirm(null);
                }, "Deleted.")
              }
            >
              <Trash2 size={16} />
              {busy ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function FileField({
  label,
  accept,
  file,
  onChange,
  note,
}: {
  label: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  note: string;
}) {
  return (
    <label className={`file-field ${file ? "has-file" : ""}`}>
      <Upload size={22} />
      <strong>{file?.name ?? label}</strong>
      <span>
        {file
          ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Click to replace`
          : note}
      </span>
      <input
        aria-label={label}
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
function SongForm({ track, onClose }: { track?: Track; onClose: () => void }) {
  const m = useMusic();
  const [title, setTitle] = useState(track?.title ?? "");
  const [artist, setArtist] = useState(track?.artist ?? "");
  const [album, setAlbum] = useState(track?.album ?? "");
  const [genre, setGenre] = useState(track?.genre ?? "Afrobeats");
  const [date, setDate] = useState(track?.release_date ?? "2026-11-14");
  const [description, setDescription] = useState(track?.description ?? "");
  const [published, setPublished] = useState(track?.published ?? true);
  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (track) {
        await m.updateTrack({
          ...track,
          title: title.trim(),
          artist: artist.trim(),
          album: album.trim(),
          genre,
          release_date: date,
          description,
          published,
        });
      } else {
        if (!audio) throw Error("Choose an MP3 file to upload.");
        setStage("Validating your files");
        await validateFile(audio, "audio");
        if (cover) await validateFile(cover, "cover");
        const duration = await mediaDuration(audio, "audio");
        setProgress(10);
        const id = crypto.randomUUID();
        let audioPath: string | undefined, coverPath: string | undefined;
        setStage(
          cloudMode
            ? "Uploading private audio"
            : "Saving audio in this browser",
        );
        if (cloudMode) {
          audioPath = await uploadCloud(audio, "audio", (n) =>
            setProgress(10 + n * 0.55),
          );
          if (cover) {
            setStage("Uploading artwork");
            coverPath = await uploadCloud(cover, "cover", (n) =>
              setProgress(65 + n * 0.25),
            );
          }
          setStage("Saving your release");
          await api("admin_save_track", {
            track: {
              title: title.trim(),
              artist: artist.trim(),
              album: album.trim(),
              genre,
              release_date: date,
              description,
              published,
              duration,
            },
            audioPath,
            coverPath,
          });
        } else {
          await putFile(`${id}:audio`, audio);
          setProgress(65);
          if (cover) {
            setStage("Saving cover artwork");
            await putFile(`${id}:cover`, cover);
          }
          let a = m.artists.find(
            (x) => x.name.toLowerCase() === artist.trim().toLowerCase(),
          );
          if (!a) {
            a = {
              id: crypto.randomUUID(),
              name: artist.trim(),
              bio: "An independent voice on Horicx Music.",
              cover: "/art/artist-placeholder.svg",
            };
            writeLocal("artists", [...readLocal<Artist[]>("artists", []), a]);
          }
          let al = m.albums.find(
            (x) =>
              x.title.toLowerCase() === album.trim().toLowerCase() &&
              x.artist_id === a.id,
          );
          if (album.trim() && !al) {
            al = {
              id: crypto.randomUUID(),
              title: album.trim(),
              artist_id: a.id,
              release_date: date,
            };
            writeLocal("albums", [...readLocal<Album[]>("albums", []), al]);
          }
          const record: Track = {
            id,
            title: title.trim(),
            artist: a.name,
            artist_id: a.id,
            album: album.trim(),
            album_id: al?.id,
            genre,
            duration,
            cover: "/art/cover-placeholder.svg",
            description,
            release_date: date,
            published,
            local: true,
          };
          writeLocal("uploads", [...readLocal<Track[]>("uploads", []), record]);
        }
        setProgress(100);
        await m.refresh();
      }
      m.notify(
        track ? "Release updated." : "Your new sound is in the catalogue.",
      );
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={track ? "Fine-tune your release." : "Let a new sound in."}
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      <p className="modal-subtitle">
        {track
          ? "Edit the details below, then save your changes."
          : cloudMode
            ? "Files upload to private Supabase storage. Only authorised listeners receive playback links."
            : "Local demo upload. Your song and artwork stay in this browser."}
      </p>
      <form onSubmit={submit}>
        {!track && (
          <div className="file-grid">
            <FileField
              label="Choose MP3 audio"
              accept="audio/mpeg,.mp3"
              file={audio}
              onChange={setAudio}
              note="MP3 · up to 20 MB"
            />
            <FileField
              label="Choose cover artwork"
              accept="image/png,image/jpeg,image/webp"
              file={cover}
              onChange={setCover}
              note="Optional · JPG, PNG, WebP · up to 2 MB"
            />
          </div>
        )}
        <div className="form-grid">
          <label>
            Song title
            <input
              className="form-input"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your track a name"
            />
          </label>
          <label>
            Artist
            <input
              className="form-input"
              required
              maxLength={100}
              list="artist-names"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Artist name"
            />
            <datalist id="artist-names">
              {m.artists.map((a) => (
                <option key={a.id} value={a.name} />
              ))}
            </datalist>
          </label>
          <label>
            Album
            <input
              className="form-input"
              maxLength={120}
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              placeholder="Album or single"
              list="album-names"
            />
            <datalist id="album-names">
              {m.albums.map((a) => (
                <option key={a.id} value={a.title} />
              ))}
            </datalist>
          </label>
          <label>
            Genre
            <select
              className="form-input"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            >
              {[
                "Afrobeats",
                "Electronic",
                "Lo-fi",
                "R&B",
                "Chill",
                "Hip-hop",
                "Jazz",
                "Gospel",
                "Other",
              ].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <label>
            Release date
            <input
              className="form-input"
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="publish-check">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Publish to the catalogue
          </label>
        </div>
        <label className="field-label" htmlFor="description">
          Description <span className="muted">(optional)</span>
        </label>
        <textarea
          id="description"
          className="form-input"
          maxLength={2000}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell the story behind the sound…"
        />
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {busy && (
          <div className="upload-progress">
            <div>
              <span>{stage || "Saving changes…"}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <progress value={progress} max={100} />
          </div>
        )}
        <button className="button lime full-width" disabled={busy}>
          {busy ? (
            <Loader2 className="spin" size={17} />
          ) : track ? (
            <Save size={17} />
          ) : (
            <Upload size={17} />
          )}{" "}
          {busy
            ? "Working on your release…"
            : track
              ? "Save release"
              : "Upload song"}
        </button>
      </form>
    </Modal>
  );
}
function AdvertForm({ onClose }: { onClose: () => void }) {
  const m = useMusic();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!file) throw Error("Choose an advert video.");
      await validateFile(file, "advert");
      const duration = await mediaDuration(file, "video");
      if (duration < 4 || duration > 120)
        throw Error("Use a video between 4 seconds and 2 minutes.");
      const id = crypto.randomUUID();
      if (cloudMode) {
        const path = await uploadCloud(file, "advert", setProgress);
        await api("admin_save_advert", {
          title: title.trim(),
          path,
          duration,
          active,
          position: m.adverts.length,
        });
      } else {
        setProgress(25);
        await putFile(id, file);
        setProgress(80);
        writeLocal("adverts", [
          ...readLocal<Advert[]>("adverts", []),
          {
            id,
            title: title.trim(),
            duration,
            active,
            position: m.adverts.length,
            local: true,
          },
        ]);
      }
      await m.refresh();
      m.notify("Advert added.");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="A little break, by you."
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p className="modal-subtitle">
        {cloudMode
          ? "Upload a private advert video for your listeners."
          : "Local demo upload. This advert stays in this browser."}{" "}
        Use a 4–120 second video.
      </p>
      <form onSubmit={submit}>
        <FileField
          label="Choose advert video"
          accept="video/mp4,video/webm"
          file={file}
          onChange={setFile}
          note="MP4 or WebM · up to 30 MB"
        />
        <label className="field-label" htmlFor="advert-title">
          Advert title
        </label>
        <input
          id="advert-title"
          className="form-input"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Meet your next favourite sound"
        />
        <label className="publish-check">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Activate after upload
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {busy && (
          <div className="upload-progress">
            <span>Saving advert… {Math.round(progress)}%</span>
            <progress max={100} value={progress} />
          </div>
        )}
        <button className="button lime full-width" disabled={busy}>
          {busy ? <Loader2 className="spin" size={17} /> : <Upload size={17} />}
          Upload advert
        </button>
      </form>
    </Modal>
  );
}
function EntityForm({
  kind,
  item,
  onClose,
}: {
  kind: "artist" | "album";
  item?: Artist | Album;
  onClose: () => void;
}) {
  const m = useMusic();
  const [name, setName] = useState(
    item ? ("name" in item ? item.name : item.title) : "",
  );
  const [bio, setBio] = useState(item && "bio" in item ? item.bio : "");
  const [artistId, setArtistId] = useState(
    item && "artist_id" in item ? item.artist_id : (m.artists[0]?.id ?? ""),
  );
  const [date, setDate] = useState(
    item && "release_date" in item ? item.release_date : "2026-11-14",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title={`${item ? "Edit" : "Add"} an ${kind}.`}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const record =
              kind === "artist"
                ? {
                    id: item?.id ?? crypto.randomUUID(),
                    name: name.trim(),
                    bio,
                    cover: "/art/artist-placeholder.svg",
                  }
                : {
                    id: item?.id ?? crypto.randomUUID(),
                    title: name.trim(),
                    artist_id: artistId,
                    release_date: date,
                  };
            if (cloudMode) await api("admin_save_entity", { kind, record });
            else {
              const key = kind === "artist" ? "artists" : "albums";
              const existing = readLocal<Array<Artist | Album>>(key, []);
              writeLocal(
                key,
                item
                  ? existing.map((x) => (x.id === item.id ? record : x))
                  : [...existing, record],
              );
            }
            await m.refresh();
            m.notify(`${kind === "artist" ? "Artist" : "Album"} saved.`);
            onClose();
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field-label" htmlFor="entity-name">
          {kind === "artist" ? "Artist name" : "Album title"}
        </label>
        <input
          id="entity-name"
          className="form-input"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {kind === "artist" ? (
          <>
            <label className="field-label" htmlFor="artist-bio">
              Biography
            </label>
            <textarea
              id="artist-bio"
              className="form-input"
              rows={3}
              maxLength={2000}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </>
        ) : (
          <>
            <label className="field-label" htmlFor="album-artist">
              Artist
            </label>
            <select
              id="album-artist"
              className="form-input"
              required
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
            >
              {m.artists.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <label className="field-label" htmlFor="album-release">
              Release date
            </label>
            <input
              type="date"
              id="album-release"
              className="form-input"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button lime full-width" disabled={busy}>
          {busy ? <Loader2 size={17} className="spin" /> : <Save size={17} />}
          Save {kind}
        </button>
      </form>
    </Modal>
  );
}
