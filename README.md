# Horicx Music

A working music streaming app built with React, Vite, TypeScript, Tailwind CSS and Lucide. It starts immediately with six original instrumental demos, original artwork and an eight-second local advert. The production backend is provided as a Supabase migration and Edge Function. No OpenAI API, paid music API or third-party advert network is required.

## Run it locally

Install Node.js 22.12+ (Node 24 recommended), then open a terminal in this directory:

```bash
npm ci
npm run dev
```

Open **http://localhost:5173**. You do not need an account or environment file for demo mode. Press **Listen now**, play the demo advert to the end, and music starts. Space toggles playback when you are not typing; Alt + Left/Right changes tracks.

Production build:

```bash
npm run build
npm run preview
```

`dist/` is the complete static frontend and can be deployed to Cloudflare Pages. The live private Sites demo is https://horicx-music.thoughtfulhoopoe1.chatgpt.site (the final delivery message confirms deployment status).

## What works in each mode

| Feature | Local demo | Connected Supabase |
| --- | --- | --- |
| Discover, search, artist/song pages | Bundled original catalogue | Published database catalogue |
| Persistent player, queue, shuffle/repeat | Bundled MP3s and local uploads | Server-authorised signed playback URLs |
| Favourites and playlists | Browser-local storage; no account | Account-owned database records |
| Recent plays | Local browser history | Actual playback-link events |
| Advert unlock | Local MP4 and browser-local pass | Server sessions, progress checks and single-use completion |
| Sign up / sign in | Clearly explains no account is created | Real Supabase email/password authentication |
| Studio | Clearly labelled local demo, accessible for testing | Protected administrator role |
| Song and advert uploads | IndexedDB; stays on this browser | Private storage, server size/type validation |
| Statistics | Actual local starts/completions; no fake users | Actual table counts; plays count authorised links issued |

Demo state is scoped to the origin and browser. Clearing site data deletes local uploads, favourites, playlists and demo passes. Cloud mode never silently falls back to demo data when a network, key, auth or database error occurs. Supplying either Supabase variable selects cloud mode; incomplete configuration produces an explicit error. The included public demo files remain bundled examples; production uploads are stored separately in private Supabase buckets.

## Connect your own Supabase project

1. Create a Supabase project at https://supabase.com. Keep its database password and privileged keys private.
2. Install/use the Supabase CLI from this directory:

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   This applies `supabase/migrations/202611140001_horicx.sql`. Alternatively, paste that migration into the project's SQL Editor once. It creates the tables, indexes, policies, private buckets and server-only functions. Use a new project or review existing table names before applying.
3. In **Authentication → Sign In / Providers**, enable Email and **Anonymous Sign-Ins**. Anonymous sessions allow visitors to watch an advert and listen without creating an email account. Favourites and playlists still require a registered account. Supabase's built-in anonymous sign-in limits apply; configure CAPTCHA/rate limits for your expected audience as you scale.
4. In Auth URL configuration, set the Site URL to your frontend URL and add `http://localhost:5173` and your production frontend URL to allowed redirects. Enable email confirmation. For a public launch, configure your own SMTP sender in Supabase so confirmation emails are reliably delivered beyond the development email limits.
5. Configure the allowed frontend origins, then deploy the Edge Function:

   ```bash
   npx supabase secrets set ALLOWED_ORIGINS="http://localhost:5173,https://YOUR-SITE.pages.dev"
   npx supabase functions deploy music-api --no-verify-jwt
   ```

   List exact origins, with no trailing slash. Include the Sites URL if connecting the hosted demo. `verify_jwt=false` is deliberate: public catalogue browsing must work without login. The function independently verifies every protected request using `auth.getUser()`, and checks the protected admin role before administrative actions. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to its Edge runtime; never put the service-role key in frontend variables.
6. Copy `.env.example` to `.env.local` and fill in your project URL and **public anon/publishable key** (Project Settings → API):

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
   ```

7. Restart `npm run dev`. The header now says **Cloud mode**. A new cloud project has an empty catalogue until you upload or seed it. There is no automatic demo fallback.

## Make your first administrator

1. Use **Sign in → Create account** on your configured frontend. Register your own email and password, and confirm the email link. There is no default administrator password.
2. In your project's **SQL Editor**, open the contents of `scripts/first-admin.sql`. Replace `REPLACE_WITH_YOUR_CONFIRMED_EMAIL` with your email and run it. This grants the role only to an existing, confirmed, non-anonymous account.
3. Sign out and sign back in. **Admin studio** appears in the sidebar. You can also visit `/#/admin`.

Only the project owner, through the SQL Editor or another privileged backend, can grant administrator roles. User metadata and the frontend cannot promote an account.

## Seed the cloud with the bundled original demos

After granting yourself the administrator role:

```bash
npm run seed:cloud
```

The script reads `.env.local`, prompts for your confirmed administrator email and hidden password, and uploads the six MP3s, six PNG covers and short advert through the same validated admin API as the browser. It checks existing titles/artists to avoid duplicating a completed seed. It uses no service-role key and never prints access tokens or passwords. If you stop it mid-upload, use Storage to remove any unreferenced files before retrying. `HORICX_ADMIN_EMAIL` and `HORICX_ADMIN_PASSWORD` may be provided securely through your environment for unattended use; do not commit them.

The seeded songs and advert are explicitly original demos; the artist names are fictional. You can unpublish or delete them in the cloud studio.

## Upload your first song and advert

1. Open **Demo admin studio** to try the flow locally, or sign into your real **Admin studio**.
2. Select **Upload a song**. Choose an MP3 up to **20 MB** and optional JPG/PNG/WebP cover up to **2 MB**. Add title, artist, album, genre, release date and optional description. Existing artist/album names are suggested; new ones are created when needed.
3. Keep **Publish to the catalogue** checked to make it discoverable, or save a draft. Music rows have Edit, Publish/Unpublish and Delete controls. To replace an audio file, upload a replacement release and remove the old one. Bundled local demo files may be unpublished, but deletion is available only for local uploads; cloud songs are fully deletable.
4. Use the **Artists** and **Albums** tabs to create, edit or delete your entries. Reassign tracks/albums before deleting an artist or album that they still use. Bundled fictional demo artists are read-only in demo mode.
5. In **Adverts**, select **Add advert**. Use MP4 (H.264/AAC for broad Android compatibility) or WebM, **4–120 seconds**, up to **30 MB**. You can activate/deactivate adverts, edit priority, preview them, and delete uploaded videos. Lower priority numbers are served first. The first active advert is selected deterministically.
6. In **Settings**, choose a listening period between **1 and 120 minutes**, initially **30 minutes**. Existing passes retain their expiry.

When no active advert exists or a video fails, listeners get a useful error with retry and return-to-browse actions. Finishing an advert unlocks a period, rather than charging an advert for each track. Closing, seeking past, or prematurely reporting an advert does not grant a valid cloud pass. A prolonged pause in a cloud advert may require restarting its session.

## Deploy to Cloudflare Pages

1. Put this directory in a Git repository and connect it to a Cloudflare Pages project, or upload `dist/` through Pages Direct Upload.
2. Use **Build command:** `npm run build`, **Output directory:** `dist`, **Root directory:** the directory containing this `package.json`. Set Node 24 in the build environment.
3. For cloud mode, add the two `VITE_SUPABASE_*` variables in Pages build settings. Frontend variables are compiled at build time: rebuild after changing them. Leave both absent for the self-contained demo.
4. Add the exact Pages origin to the Edge Function's `ALLOWED_ORIGINS` and to Supabase Auth redirect URLs. Redeploy the Edge Function if its secrets change; deploy frontend changes separately.

Hash navigation works on any static host; `_redirects` also provides a Pages fallback. No Worker, server-side rendering service, D1, R2, Node server or OpenAI key is needed for the frontend.

## Security and its limits

- Every application table uses RLS. Registered users own their libraries. Anonymous sessions cannot create cloud favourites/playlists. Ordinary listeners cannot read private media paths, write play events, create passes, alter profiles' protected fields, call server-only advert RPCs, or grant admin roles.
- Roles live in a separate protected table. Admin UI checks are supplemented by server verification and database/storage policies. Never grant yourself a role using frontend code or public metadata.
- All three production buckets are private. Browser clients have no upload/overwrite/delete storage policies. Uploads pass the authenticated admin Edge Function, which enforces size limits, generates paths and checks file signatures; SVG/HTML and mismatched formats are rejected. Signature checks are a practical allowlist, not antivirus or full media decoding. Admin-entered media duration is trusted administrator metadata. The original demo SVGs are trusted bundled static assets.
- Media object paths live in private metadata tables, separate from public catalogue records. Cloud playback requires an unexpired server-side pass **before** a song link is issued. Music URLs expire in at most **60 seconds**, capped at the remaining pass lifetime. A buffered or already-open stream cannot be recalled; the player also pauses when its pass expires.
- Advert sessions snapshot duration and listening period, expire after ten minutes, belong to one authenticated listener, and require nondecreasing progress, plausible timing, repeated recent heartbeats and sufficient observed playback. Progress and completion lock the database row; completion is atomic and single-use. A client `ended` event or localStorage flag is never trusted in cloud mode.
- Sensitive requests use database-backed per-user fixed-window limits. Public catalogue calls use a hashed source address. Supabase Auth separately rate-limits sign-in. A server-verified video timeline reduces trivial bypassing but cannot prove human attention, defeat a determined client that simulates real-time playback, prevent screen/audio recording, or stop recipients copying an already obtained file. This is access control, not DRM or a third-party ad verification service.
- Statistics are labelled honestly. Cloud plays count signed playback URLs issued, not proof that an entire song was heard. Registered user counts exclude anonymous sessions. Local statistics describe only this browser.
- Uploads that finish but whose metadata save is interrupted can leave unreferenced storage files. Review Storage before removing them. Short-lived cover URLs expire after one hour; refresh the catalogue when returning to a long-lived tab. Demo queue and playback position are session state; favourites, playlists and recent history persist.

## Free-tier usage and maintenance

The bundled media totals less than 2 MB. Uploaded music bandwidth, not UI hosting, is likely the main cost: a 4-minute track at 128 kbps is about **3.84 MB per complete listen**; 1,000 complete listens is approximately **3.84 GB**, plus cover/ad traffic and retries. Transcode your own media to sensible bitrates before uploading. Server-side free-tier transcoding is intentionally absent.

Check the current Supabase and Cloudflare quotas in your dashboards; free-tier limits and pricing can change. Size caps protect individual uploads but are not a spending cap. Monitor storage and egress, remove unused files, and avoid very large videos. Cover links are signed in a catalogue request; a large catalogue should add pagination/caching before growth beyond this small-project limit of 500 catalogue entries.

Rate-limit rows older than ten minutes are pruned during new request windows. For production maintenance, schedule periodic deletion of expired unfinished advert sessions, review play-event retention and remove old anonymous accounts according to your policy. Keep completed advert sessions while you need their completion counts, and keep any session referenced by an active listening pass. Removing an advert does not revoke already earned passes. Deleting a user cascades their profile/library/pass records. Supabase database backups do not replace separate storage-object backups.

## Verification

```bash
npm run build
npx playwright install chromium
npm test
npm run test:security
npx deno check --no-config --node-modules-dir=none supabase/functions/music-api/index.ts
npx deno test --no-config --node-modules-dir=none --allow-env tests/edge.test.ts
npm audit
```

The browser suite exercises original media loading, real-time demo advert completion, interrupted adverts, playback continuity, seek/volume/transport controls, favourites/playlists, detail navigation, local MP3 and video uploads, publication/edit/deletion, listening settings, missing-ad recovery and 320/360/390/768 px layouts. `test:security` applies the actual migration to embedded PostgreSQL (PGlite), with test doubles for Supabase's `auth` and `storage` schemas, and tests RLS, private metadata, role escalation prevention, ownership, premature/expired/reused advert sessions, rate limits and private bucket constraints. The additional cloud UI tests use explicit mock responses to verify sign-in guards and honest cloud failure states. The Edge request-handler tests use mocked Supabase HTTP responses to verify CORS, body limits, authentication, admin rejection, rate limits and denial of fabricated client passes. These do not substitute for deployed Supabase integration tests.

**Requires your account configuration:** deployed Supabase Auth/email delivery, real Storage HTTP policies, Edge gateway/CORS, end-to-end signed playback and cloud uploads cannot be verified against your project without your Supabase project and credentials. No real cloud project or administrator account has been invented or provisioned. See `VALIDATION.md` for results from this build.

## Project map

- `src/App.tsx`: pages, navigation, collection views.
- `src/store.tsx`: shared audio player, catalogue and library state.
- `src/components/`: player, studio, advert and authentication dialogs.
- `src/lib/`: typed records, demo catalogue, IndexedDB and cloud API clients.
- `public/`: bundled original media, artwork and static-host configuration.
- `supabase/migrations/`: database, policies, buckets and server-only RPCs.
- `supabase/functions/music-api/`: authenticated API, upload validation, signed playback and admin actions.
- `scripts/`: reproducible media generation, first-admin SQL and cloud seed.
- `tests/`: browser and PostgreSQL security checks.
- `CREDITS.md`: media provenance and dependency credits.

To regenerate the bundled media, install Python 3 and FFmpeg with MP3/H.264/AAC and SVG support, then run `npm run generate:media`. The committed output is ready to play; regeneration is optional.

Supabase references: [private downloads](https://supabase.com/docs/guides/storage/serving/downloads), [storage access control](https://supabase.com/docs/guides/storage/security/access-control), [Edge Function authorization headers](https://supabase.com/docs/guides/functions/auth-headers).
