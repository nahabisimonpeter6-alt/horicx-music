import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Edit3,
  Loader2,
  Music2,
  Search,
  Save,
} from "lucide-react";
import { useMusic } from "../store";
import { Modal } from "./Modals";
import type { Playlist, Track } from "../lib/types";
export function PlaylistArtwork({ playlist }: { playlist: Playlist }) {
  const m = useMusic();
  const tracks = playlist.trackIds
    .map((id) => m.tracks.find((t) => t.id === id && t.published))
    .filter((t): t is Track => !!t)
    .slice(0, 4);
  return tracks.length ? (
    <div className={`playlist-mosaic count-${tracks.length}`}>
      {tracks.map((t) => (
        <img src={t.cover} alt="" key={t.id} />
      ))}
    </div>
  ) : (
    <Music2 size={45} />
  );
}
export function PlaylistTools({ playlist }: { playlist: Playlist }) {
  const m = useMusic();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        className="button secondary"
        onClick={() => {
          setName(playlist.name);
          setDescription(playlist.description ?? "");
          setOpen(true);
        }}
      >
        <Edit3 size={15} />
        Edit playlist
      </button>
      {open && (
        <Modal
          title="Make this playlist yours."
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <p className="modal-subtitle">
            Give your collection a name and a little backstory.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                if (await m.editPlaylist(playlist.id, name, description))
                  setOpen(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field-label" htmlFor="edit-playlist-name">
              Playlist name
            </label>
            <input
              id="edit-playlist-name"
              className="form-input"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label className="field-label" htmlFor="edit-playlist-description">
              Description
            </label>
            <textarea
              id="edit-playlist-description"
              className="form-input"
              rows={3}
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A soundtrack for…"
            />
            <button
              type="submit"
              className="button lime full-width"
              disabled={busy}
            >
              {busy ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <Save size={16} />
              )}
              Save playlist
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function CollectionControls({
  query,
  setQuery,
  sort,
  setSort,
  custom = false,
}: {
  query: string;
  setQuery: (s: string) => void;
  sort: string;
  setSort: (s: string) => void;
  custom?: boolean;
}) {
  return (
    <div className="collection-controls">
      <div className="collection-search">
        <Search size={16} />
        <input
          aria-label="Find in collection"
          placeholder="Find in this collection"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <label>
        Sort by
        <select
          aria-label="Sort collection"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="default">
            {custom ? "Custom order" : "Recently added"}
          </option>
          <option value="title">Title</option>
          <option value="artist">Artist</option>
          <option value="duration">Duration</option>
        </select>
      </label>
    </div>
  );
}
export function sortTracks(tracks: Track[], sort: string, query: string) {
  return tracks
    .filter((t) =>
      `${t.title} ${t.artist} ${t.genre}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "artist"
          ? a.artist.localeCompare(b.artist)
          : sort === "duration"
            ? a.duration - b.duration
            : 0,
    );
}
