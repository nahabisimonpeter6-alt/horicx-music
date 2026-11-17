import { createClient, type User } from "npm:@supabase/supabase-js@2.100.0";
const service = createClient(
  Deno.env.get("SUPABASE_URL")!,
  (Deno.env.get("SUPABASE_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function required(value: unknown, max = 120) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new HttpError(400, "A required field is empty or too long.");
  }
  return value.trim();
}
function uuid(value: unknown) {
  const s = required(value, 36);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      s,
    )
  )
    throw new HttpError(400, "Invalid record ID.");
  return s;
}
function finite(value: unknown, min: number, max: number) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new HttpError(400, "A numeric value is out of range.");
  return value;
}
function text(value: unknown, max = 2000) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > max) {
    throw new HttpError(400, "Text is too long.");
  }
  return value.trim();
}
function check<T>(result: { data: T; error: unknown }): T {
  if (result.error) {
    const e = result.error as { message?: string; code?: string };
    if (e.code === "23503") {
      throw new HttpError(
        409,
        "This entry is used by another record. Reassign or remove those records first.",
      );
    }
    if (e.code === "23505") {
      throw new HttpError(409, "An entry with these details already exists.");
    }
    throw new HttpError(400, e.message ?? "The database request failed.");
  }
  return result.data;
}
// Use rows() for non-null reads, check() for mutations and optional reads.
function rows<T>(result: { data: T; error: unknown }): NonNullable<T> {
  const data = check(result);
  if (data === null || data === undefined)
    throw new HttpError(500, "The server returned no data. Please try again.");
  return data;
}
function one<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}
async function signed(bucket: string, path: string, seconds: number) {
  const data = rows(
    await service.storage.from(bucket).createSignedUrl(path, seconds),
  );
  return data.signedUrl;
}
async function limit(key: string, count: number) {
  const permitted = check(
    await service.rpc("consume_rate_limit", { p_key: key, p_limit: count }),
  );
  if (!permitted) {
    throw new HttpError(429, "Too many requests. Wait a minute and try again.");
  }
}
async function authenticate(req: Request): Promise<User> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Please sign in to continue.");
  const { data, error } = await service.auth.getUser(token);
  if (error || !data.user) {
    throw new HttpError(401, "Your session has expired. Please sign in again.");
  }
  return data.user;
}
async function admin(user: User) {
  const data = check(
    await service
      .from("admin_roles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  );
  if (!data) throw new HttpError(403, "Administrator access is required.");
}
function member(user: User) {
  if (user.is_anonymous) {
    throw new HttpError(
      403,
      "Create an account or sign in to save a cloud library.",
    );
  }
}
async function catalogue(includeDrafts = false) {
  let query = service
    .from("tracks")
    .select("*,artists(name),albums(title),track_media(cover_path)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (!includeDrafts) query = query.eq("published", true);
  const data = rows(await query);
  return await Promise.all(
    data.map(async (row) => {
      const { artists, albums, track_media, ...track } = row;
      return {
        ...track,
        artist: one(artists)?.name ?? "Unknown artist",
        album: one(albums)?.title ?? "Single",
        cover: one(track_media)?.cover_path
          ? await signed("covers", one(track_media)!.cover_path, 3600)
          : "/art/cover-placeholder.svg",
      };
    }),
  );
}
async function artistByName(name: string) {
  const existing = check(
    await service.from("artists").select("id").eq("name", name).maybeSingle(),
  );
  if (existing) return existing.id;
  return rows(
    await service.from("artists").insert({ name }).select("id").single(),
  ).id;
}
async function albumByName(title: string, artistId: string, date: string) {
  if (!title) return null;
  const existing = check(
    await service
      .from("albums")
      .select("id")
      .eq("title", title)
      .eq("artist_id", artistId)
      .maybeSingle(),
  );
  if (existing) return existing.id;
  return rows(
    await service
      .from("albums")
      .insert({
        title,
        artist_id: artistId,
        release_date: date,
      })
      .select("id")
      .single(),
  ).id;
}
function date(value: unknown) {
  const s = required(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s))) {
    throw new HttpError(400, "Enter a valid release date.");
  }
  return s;
}
async function validateStoredPath(
  path: unknown,
  bucket: string,
  userId: string,
) {
  const value = required(path, 200);
  if (!value.startsWith(`${userId}/`) || value.includes("..")) {
    throw new HttpError(
      400,
      "The upload path is not valid for this administrator.",
    );
  }
  const { data, error } = await service.storage.from(bucket).info(value);
  if (error || !data) {
    throw new HttpError(
      400,
      "The uploaded file could not be found. Upload it again.",
    );
  }
  return value;
}
// Bound streamed bodies too: Content-Length is not present on every request.
function boundedResponse(req: Request, maximum: number) {
  if (!req.body) throw new HttpError(400, "The request body is empty.");
  let received = 0;
  const stream = req.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        received += chunk.byteLength;
        if (received > maximum)
          throw new HttpError(413, "The request exceeds the size limit.");
        controller.enqueue(chunk);
      },
    }),
  );
  return new Response(stream, {
    headers: {
      "Content-Type": req.headers.get("Content-Type") ?? "application/json",
    },
  });
}
async function upload(req: Request, user: User, kind: string) {
  await admin(user);
  await limit(`${user.id}:upload`, 20);
  const map: Record<string, { bucket: string; max: number }> = {
    audio: { bucket: "music", max: 20 * 1024 * 1024 },
    cover: { bucket: "covers", max: 2 * 1024 * 1024 },
    advert: { bucket: "adverts", max: 30 * 1024 * 1024 },
  };
  const rules = map[kind];
  if (!rules) throw new HttpError(400, "Unknown upload type.");
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > rules.max + 65536) {
    throw new HttpError(413, "File exceeds the upload size limit.");
  }
  const form = await boundedResponse(req, rules.max + 65536).formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > rules.max) {
    throw new HttpError(
      413,
      `Choose a file smaller than ${rules.max / 1024 / 1024} MB.`,
    );
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ascii = (s: string, at = 0) =>
    s.split("").every((c, i) => bytes[at + i] === c.charCodeAt(0));
  let type = "",
    extension = "";
  if (
    kind === "audio" &&
    (ascii("ID3") || (bytes[0] === 255 && (bytes[1] & 224) === 224))
  ) {
    type = "audio/mpeg";
    extension = "mp3";
  }
  if (kind === "cover") {
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
      type = "image/jpeg";
      extension = "jpg";
    } else if (ascii("\x89PNG\r\n\x1a\n")) {
      type = "image/png";
      extension = "png";
    } else if (ascii("RIFF") && ascii("WEBP", 8)) {
      type = "image/webp";
      extension = "webp";
    }
  }
  if (kind === "advert") {
    if (ascii("ftyp", 4)) {
      type = "video/mp4";
      extension = "mp4";
    } else if (
      bytes[0] === 26 &&
      bytes[1] === 69 &&
      bytes[2] === 223 &&
      bytes[3] === 163
    ) {
      type = "video/webm";
      extension = "webm";
    }
  }
  if (!type) {
    throw new HttpError(
      415,
      "The file signature does not match an allowed format. Use MP3, JPEG/PNG/WebP, or MP4/WebM.",
    );
  }
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  check(
    await service.storage.from(rules.bucket).upload(path, bytes, {
      contentType: type,
      cacheControl: "3600",
      upsert: false,
    }),
  );
  return { path };
}
async function handle(req: Request) {
  const url = new URL(req.url);
  if (req.method !== "POST") {
    throw new HttpError(405, "Use POST for this endpoint.");
  }
  if (url.searchParams.has("upload")) {
    return await upload(
      req,
      await authenticate(req),
      url.searchParams.get("upload")!,
    );
  }
  if (Number(req.headers.get("content-length") ?? 0) > 32768) {
    throw new HttpError(413, "Request body too large.");
  }
  const body = await boundedResponse(req, 32768)
    .json()
    .catch((error) => {
      if (error instanceof HttpError) throw error;
      throw new HttpError(400, "Invalid JSON request.");
    });
  const action = required(body.action, 50);
  if (action === "catalog" || action === "status") {
    const address =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0] ??
      "unknown";
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(address),
    );
    const hash = Array.from(new Uint8Array(digest))
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    await limit(`catalog:${hash}`, 90);
    if (action === "status") {
      const [tracks, adverts, settings, playlistSchema, followSchema] =
        await Promise.all([
          service
            .from("tracks")
            .select("id,track_media!inner(track_id)", {
              count: "exact",
              head: true,
            })
            .eq("published", true),
          service
            .from("adverts")
            .select("id,advert_media!inner(advert_id)", {
              count: "exact",
              head: true,
            })
            .eq("active", true),
          service.from("settings").select("listening_minutes").single(),
          service.from("playlists").select("description").limit(1),
          service.from("artist_follows").select("user_id").limit(1),
        ]);
      check(tracks);
      check(adverts);
      check(playlistSchema);
      check(followSchema);
      const configured = rows(settings);
      return {
        database: true,
        tracks: tracks.count ?? 0,
        activeAdverts: adverts.count ?? 0,
        listeningMinutes: configured.listening_minutes,
      };
    }
    const [tracks, artists, albums, settings] = await Promise.all([
      catalogue(),
      service.from("artists").select("*").order("name"),
      service.from("albums").select("*"),
      service.from("settings").select("listening_minutes").single(),
    ]);
    return {
      tracks,
      artists: rows(artists).map((a, i) => ({
        ...a,
        cover: "/art/artist-placeholder.svg",
      })),
      albums: rows(albums),
      minutes: rows(settings).listening_minutes,
    };
  }
  const user = await authenticate(req);
  await limit(`${user.id}:requests`, 180);
  if (action.startsWith("admin_")) {
    await admin(user);
    await limit(`${user.id}:admin`, 90);
  }
  if (action === "library") {
    const [roles, favs, lists, events, pass, follows] = await Promise.all([
      service
        .from("admin_roles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle(),
      service.from("favourites").select("track_id").eq("user_id", user.id),
      service
        .from("playlists")
        .select(
          "id,name,description,playlist_tracks(track_id,added_at,position)",
        )
        .eq("user_id", user.id)
        .order("created_at"),
      service
        .from("play_events")
        .select("track_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      service
        .from("listening_passes")
        .select("expires_at")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle(),
      service.from("artist_follows").select("artist_id").eq("user_id", user.id),
    ]);
    return {
      admin: !!check(roles),
      followedArtists: rows(follows).map((f) => f.artist_id),
      favourites: rows(favs).map((x) => x.track_id),
      playlists: rows(lists).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        trackIds: p.playlist_tracks
          .sort(
            (a, b) =>
              a.position - b.position || a.added_at.localeCompare(b.added_at),
          )
          .map((t) => t.track_id),
      })),
      recent: [...new Set(rows(events).map((e) => e.track_id))].slice(0, 30),
      passUntil: check(pass) ? Date.parse(pass.data!.expires_at) : 0,
    };
  }
  if (action === "play") {
    await limit(`${user.id}:play`, 45);
    const pass = check(
      await service
        .from("listening_passes")
        .select("expires_at")
        .eq("user_id", user.id)
        .gt("expires_at", new Date(Date.now() + 1000).toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    );
    if (!pass) {
      throw new HttpError(
        402,
        "Watch a short ad to unlock 30 minutes of music.",
      );
    }
    const trackId = uuid(body.trackId);
    const track = check(
      await service
        .from("tracks")
        .select("id,track_media(audio_path)")
        .eq("id", trackId)
        .eq("published", true)
        .maybeSingle(),
    );
    if (!track || !one(track.track_media)?.audio_path) {
      throw new HttpError(404, "This track is no longer available.");
    }
    const expires = Math.max(
      1,
      Math.min(
        60,
        Math.floor((Date.parse(pass.expires_at) - Date.now()) / 1000),
      ),
    );
    const link = await signed(
      "music",
      one(track!.track_media)!.audio_path,
      expires,
    );
    check(
      await service.from("play_events").insert({
        user_id: user.id,
        track_id: trackId,
      }),
    );
    return { url: link, passUntil: Date.parse(pass.expires_at) };
  }
  if (action === "ad_start") {
    await limit(`${user.id}:ad_start`, 8);
    const ad = check(
      await service
        .from("adverts")
        .select("id,title,duration,active,position,advert_media(video_path)")
        .eq("active", true)
        .order("position")
        .order("created_at")
        .limit(1)
        .maybeSingle(),
    );
    if (!ad || !one(ad.advert_media)?.video_path) {
      throw new HttpError(
        404,
        "No active adverts are available. Please try again later; you can still browse the catalogue.",
      );
    }
    const settings = rows(
      await service.from("settings").select("listening_minutes").single(),
    );
    const session = rows(
      await service
        .from("advert_sessions")
        .insert({
          user_id: user.id,
          advert_id: ad.id,
          duration: ad.duration,
          pass_minutes: settings.listening_minutes,
        })
        .select("id")
        .single(),
    );
    return {
      sessionId: session.id,
      advert: {
        id: ad.id,
        title: ad.title,
        duration: Number(ad.duration),
        active: true,
        position: ad.position,
        url: await signed("adverts", one(ad!.advert_media)!.video_path, 600),
      },
    };
  }
  if (action === "ad_progress") {
    await limit(`${user.id}:ad_progress`, 80);
    check(
      await service.rpc("record_ad_progress", {
        p_user: user.id,
        p_session: uuid(body.sessionId),
        p_position: finite(body.position, 0, 121),
      }),
    );
    return { ok: true };
  }
  if (action === "ad_complete") {
    await limit(`${user.id}:ad_complete`, 8);
    const expiry = check(
      await service.rpc("complete_ad_session", {
        p_user: user.id,
        p_session: uuid(body.sessionId),
      }),
    );
    return { passUntil: Date.parse(expiry) };
  }
  if (action === "favourite") {
    member(user);
    const trackId = uuid(body.trackId);
    if (typeof body.enabled !== "boolean") {
      throw new HttpError(400, "Expected a boolean.");
    }
    if (body.enabled) {
      const track = check(
        await service
          .from("tracks")
          .select("id")
          .eq("id", trackId)
          .eq("published", true)
          .maybeSingle(),
      );
      if (!track) throw new HttpError(404, "This track is unavailable.");
      check(
        await service.from("favourites").upsert({
          user_id: user.id,
          track_id: trackId,
        }),
      );
    } else {
      check(
        await service
          .from("favourites")
          .delete()
          .eq("user_id", user.id)
          .eq("track_id", trackId),
      );
    }
    return { ok: true };
  }
  if (action === "follow_artist") {
    member(user);
    const artistId = uuid(body.artistId);
    if (typeof body.enabled !== "boolean")
      throw new HttpError(400, "Expected a boolean.");
    if (body.enabled) {
      const artist = check(
        await service
          .from("artists")
          .select("id")
          .eq("id", artistId)
          .maybeSingle(),
      );
      if (!artist) throw new HttpError(404, "This artist is unavailable.");
      check(
        await service
          .from("artist_follows")
          .upsert({ user_id: user.id, artist_id: artistId }),
      );
    } else
      check(
        await service
          .from("artist_follows")
          .delete()
          .eq("user_id", user.id)
          .eq("artist_id", artistId),
      );
    return { ok: true };
  }
  if (action === "edit_playlist" || action === "reorder_playlist") {
    member(user);
    const id = uuid(body.id);
    const owned = check(
      await service
        .from("playlists")
        .select("id")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
    );
    if (!owned)
      throw new HttpError(
        404,
        "This playlist does not belong to your account.",
      );
    if (action === "edit_playlist")
      check(
        await service
          .from("playlists")
          .update({
            name: required(body.name, 80),
            description: text(body.description, 300),
          })
          .eq("id", id)
          .eq("user_id", user.id),
      );
    else {
      if (!Array.isArray(body.trackIds) || body.trackIds.length > 1000)
        throw new HttpError(400, "Invalid playlist order.");
      const ids = body.trackIds.map(uuid);
      if (new Set(ids).size !== ids.length)
        throw new HttpError(400, "The playlist order contains duplicates.");
      check(
        await service.rpc("reorder_playlist", {
          p_user: user.id,
          p_playlist: id,
          p_tracks: ids,
        }),
      );
    }
    return { ok: true };
  }
  if (action === "create_playlist") {
    member(user);
    await limit(`${user.id}:create_playlist`, 10);
    const data = rows(
      await service
        .from("playlists")
        .insert({
          user_id: user.id,
          name: required(body.name, 80),
        })
        .select("id,name")
        .single(),
    );
    return { ...data, trackIds: [] };
  }
  if (action === "playlist_track" || action === "delete_playlist") {
    member(user);
    const id = uuid(action === "playlist_track" ? body.playlistId : body.id);
    const owned = check(
      await service
        .from("playlists")
        .select("id")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
    );
    if (!owned) {
      throw new HttpError(
        404,
        "This playlist does not belong to your account.",
      );
    }
    if (action === "delete_playlist") {
      check(
        await service
          .from("playlists")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id),
      );
    } else {
      const tid = uuid(body.trackId);
      if (typeof body.enabled !== "boolean") {
        throw new HttpError(400, "Expected a boolean.");
      }
      check(
        await service.rpc("set_playlist_track", {
          p_user: user.id,
          p_playlist: id,
          p_track: tid,
          p_enabled: body.enabled,
        }),
      );
    }
    return { ok: true };
  }
  if (action === "admin_health") {
    const [buckets, schema] = await Promise.all([
      service.storage.listBuckets(),
      service.from("artist_follows").select("user_id").limit(1),
    ]);
    check(schema);
    const all = rows(buckets);
    const names = ["music", "covers", "adverts"];
    if (
      !names.every((name) =>
        all.some((b) => b.id === name && b.public === false),
      )
    )
      throw new HttpError(
        503,
        "Private storage is not configured correctly. Keep all three media buckets private.",
      );
    return { database: "ok", storage: "private", buckets: names };
  }
  if (action === "admin_overview") {
    const [tracks, ads, songs, users, plays, completions] = await Promise.all([
      catalogue(true),
      service
        .from("adverts")
        .select("*,advert_media(video_path)")
        .order("position"),
      service.from("tracks").select("id", { count: "exact", head: true }),
      service
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_anonymous", false),
      service.from("play_events").select("id", { count: "exact", head: true }),
      service
        .from("advert_sessions")
        .select("id", {
          count: "exact",
          head: true,
        })
        .not("completed_at", "is", null),
    ]);
    check(songs);
    check(users);
    check(plays);
    check(completions);
    return {
      tracks,
      adverts: await Promise.all(
        rows(ads).map(async (a) => {
          const { advert_media, ...rest } = a;
          return {
            ...rest,
            url: advert_media?.video_path
              ? await signed("adverts", advert_media.video_path, 3600)
              : undefined,
          };
        }),
      ),
      stats: {
        songs: songs.count,
        users: users.count,
        plays: plays.count,
        completions: completions.count,
      },
    };
  }
  if (action === "admin_save_track" || action === "admin_update_track") {
    const t = body.track ?? {};
    const releaseDate = date(t.release_date);
    const artistId = await artistByName(required(t.artist, 100));
    const albumId = await albumByName(
      text(t.album, 120),
      artistId,
      releaseDate,
    );
    const fields = {
      title: required(t.title, 120),
      artist_id: artistId,
      album_id: albumId,
      genre: required(t.genre, 50),
      release_date: releaseDate,
      description: text(t.description),
      published: t.published === true,
    };
    if (action === "admin_update_track") {
      check(await service.from("tracks").update(fields).eq("id", uuid(t.id)));
      return { ok: true };
    }
    const audioPath = await validateStoredPath(
      body.audioPath,
      "music",
      user.id,
    );
    const coverPath = body.coverPath
      ? await validateStoredPath(body.coverPath, "covers", user.id)
      : null;
    const track = rows(
      await service
        .from("tracks")
        .insert({
          ...fields,
          published: false,
          duration: finite(t.duration, 0.1, 1800),
          original: t.original === true,
        })
        .select("id")
        .single(),
    );
    try {
      check(
        await service.from("track_media").insert({
          track_id: track.id,
          audio_path: audioPath,
          cover_path: coverPath,
        }),
      );
      if (fields.published) {
        check(
          await service
            .from("tracks")
            .update({ published: true })
            .eq("id", track.id),
        );
      }
    } catch (e) {
      await service.from("tracks").delete().eq("id", track.id);
      throw e;
    }
    return { id: track.id };
  }
  if (action === "admin_delete_track") {
    const id = uuid(body.id);
    const media = check(
      await service
        .from("track_media")
        .select("*")
        .eq("track_id", id)
        .maybeSingle(),
    );
    check(await service.from("tracks").delete().eq("id", id));
    if (media) {
      check(await service.storage.from("music").remove([media.audio_path]));
      if (media.cover_path) {
        check(await service.storage.from("covers").remove([media.cover_path]));
      }
    }
    return { ok: true };
  }
  if (action === "admin_save_advert") {
    const path = await validateStoredPath(body.path, "adverts", user.id);
    const advert = rows(
      await service
        .from("adverts")
        .insert({
          title: required(body.title, 120),
          duration: finite(body.duration, 4, 120),
          active: false,
          position: finite(body.position, 0, 999),
        })
        .select("id")
        .single(),
    );
    try {
      check(
        await service.from("advert_media").insert({
          advert_id: advert.id,
          video_path: path,
        }),
      );
      if (body.active === true) {
        check(
          await service
            .from("adverts")
            .update({ active: true })
            .eq("id", advert.id),
        );
      }
    } catch (e) {
      await service.from("adverts").delete().eq("id", advert.id);
      throw e;
    }
    return { id: advert.id };
  }
  if (action === "admin_update_advert") {
    const a = body.advert ?? {};
    check(
      await service
        .from("adverts")
        .update({
          title: required(a.title, 120),
          active: a.active === true,
          position: Math.floor(finite(a.position, 0, 999)),
        })
        .eq("id", uuid(a.id)),
    );
    return { ok: true };
  }
  if (action === "admin_delete_advert") {
    const id = uuid(body.id);
    const media = check(
      await service
        .from("advert_media")
        .select("video_path")
        .eq("advert_id", id)
        .maybeSingle(),
    );
    check(await service.from("adverts").delete().eq("id", id));
    if (media) {
      check(await service.storage.from("adverts").remove([media.video_path]));
    }
    return { ok: true };
  }
  if (action === "admin_settings") {
    check(
      await service
        .from("settings")
        .update({
          listening_minutes: Math.floor(finite(body.minutes, 1, 120)),
        })
        .eq("id", true),
    );
    return { ok: true };
  }
  if (action === "admin_save_entity") {
    const kind = body.kind;
    if (kind !== "artist" && kind !== "album") {
      throw new HttpError(400, "Unknown entry type.");
    }
    const r = body.record ?? {};
    const record =
      kind === "artist"
        ? { id: uuid(r.id), name: required(r.name, 100), bio: text(r.bio) }
        : {
            id: uuid(r.id),
            title: required(r.title, 120),
            artist_id: uuid(r.artist_id),
            release_date: date(r.release_date),
          };
    check(
      await service
        .from(kind === "artist" ? "artists" : "albums")
        .upsert(record),
    );
    return { ok: true };
  }
  if (action === "admin_delete_entity") {
    if (body.kind !== "artist" && body.kind !== "album") {
      throw new HttpError(400, "Unknown entry type.");
    }
    check(
      await service
        .from(body.kind === "artist" ? "artists" : "albums")
        .delete()
        .eq("id", uuid(body.id)),
    );
    return { ok: true };
  }
  throw new HttpError(400, "Unknown action.");
}
export async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get("Origin");
  const cors = {
    "Access-Control-Allow-Origin":
      origin && allowed.includes(origin)
        ? origin
        : (allowed[0] ?? "http://localhost:5173"),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    Vary: "Origin",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (origin && !allowed.includes(origin)) {
    return new Response(
      JSON.stringify({ error: "This website origin is not allowed." }),
      { status: 403, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  try {
    return new Response(JSON.stringify(await handle(req)), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    const error =
      e instanceof HttpError
        ? e
        : new HttpError(
            500,
            "The server could not complete this request. Please try again.",
          );
    if (!(e instanceof HttpError)) {
      console.error(
        "music-api request failed",
        e instanceof Error ? e.message : "Unknown error",
      );
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}
