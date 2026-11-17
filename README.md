# Horicx Music

React, Vite, TypeScript, Tailwind and Lucide frontend with Supabase PostgreSQL, Auth, private Storage and Edge Functions. Production has no sample catalogue, fictional artists, browser-local administrator or sample advert. Music is uploaded by a real administrator and stays in private cloud storage.

## Current project and deployment status

The supplied public project URL and publishable key are connected in `src/lib/public-project.json`. These are public client identifiers, not administrator credentials. Environment variables can override them. The ignored `.env.local` also contains only these public values.

Project: `https://ayadtlwmoqcpqxkrmpvb.supabase.co`.
Intended administrator: **lordsimonpro@gmail.com**.

Live checks confirmed that email authentication is enabled. The music tables and `music-api` function have not yet been deployed, and anonymous sign-ins are disabled. **The cloud backend and administrator account are not provisioned yet.** The supplied masked secret key cannot authorise setup. Complete project-owner authentication through the Supabase integration or your local Supabase CLI to deploy the backend.

Until that is complete, the production site displays an honest setup screen and never falls back to local uploads or sample music. A passing frontend build does not mean a cloud service has been provisioned.

## Run and build

Use Node 22.12+; Node 24 is recommended.

```bash
npm ci
npm run dev
```

Open http://localhost:5173. Default development and production use the real cloud project. No account is authenticated by hardcoded email/password comparisons.

```bash
npm run build
npm run preview
```

`dist/` is the deployable static frontend. Production packaging removes all generated sample audio, sample advert videos and fictional cover/artist artwork. API and SDK code is split into cached chunks.

## Deploy the cloud backend

From this checkout, sign into the Supabase account that owns the project:

```bash
npx supabase login
npx supabase link --project-ref ayadtlwmoqcpqxkrmpvb
npx supabase db push
npx supabase secrets set ALLOWED_ORIGINS="http://localhost:5173,https://horicx-music.thoughtfulhoopoe1.chatgpt.site"
npx supabase functions deploy music-api --no-verify-jwt
```

`db push` applies both committed migrations in filename order. If using the SQL Editor instead, apply `202611140001_horicx.sql`, then `202611170001_listening_features.sql`, once each. They create the relational catalogue, protected admin roles, personal libraries, advert sessions, listening passes, events, private storage buckets and RLS policies.

The function permits unauthenticated catalogue/status reads, then independently verifies user tokens and administrator roles for protected actions. Therefore `verify_jwt=false` is deliberate. Server credentials are read only in the Edge runtime: `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`, with `SUPABASE_URL`. Supabase supplies server credentials to its Edge Functions. The existing backend uses `@supabase/supabase-js`; an additional server wrapper is not required for its verified-token flow.

In the Supabase dashboard:

1. Enable **Email** and **Anonymous Sign-Ins** under Authentication providers. Guests need anonymous sessions for advert verification and listening; cloud favourites/playlists/follows require a registered account.
2. Set the Auth Site URL to your real frontend URL and allow that origin plus local development in Auth redirect URLs. This is required for confirmation and password-reset links.
3. Configure an email sender for production confirmations and recovery. The built-in development mail service has limits.
4. Keep the `music`, `covers` and `adverts` buckets private. Browser uploads are forbidden by policy; the protected Edge upload endpoint validates file signatures and sizes first.

Update `ALLOWED_ORIGINS` and Auth redirects if you deploy to another domain.

## Provision the requested administrator

Run this only after the migrations and private buckets exist:

```bash
npm run setup:admin
```

The helper is configured for **lordsimonpro@gmail.com**. It prompts for the project's secret/service-role key and your chosen account password using hidden terminal input. Password spaces are preserved. **No password or privileged key is saved in the source, frontend bundle or environment example. Do not paste server keys into chat.**

The helper checks the schema and private buckets, creates the administrator through the Supabase Auth admin API, then writes and verifies the protected `admin_roles` record. As an owner-controlled bootstrap, it creates a confirmed account directly. This is not proof of email inbox ownership; only a trusted project owner with the server key can run it.

If the account already exists, the helper verifies the supplied existing password and never silently replaces it. It refuses to promote an account when that verification fails. For an account created and confirmed using the normal sign-up page, `scripts/first-admin.sql` is an alternative role-grant procedure in the project owner's SQL Editor. It grants no role based on frontend metadata.

After setup, sign in through the website. **Admin studio** appears only after a server-verified role check. Password recovery is available in the sign-in dialog; verified recovery sessions can choose a new password.

## Upload real music and adverts

1. In Admin studio, select **Upload a song**. Choose an MP3 up to **20 MB** and optional JPEG/PNG/WebP artwork up to **2 MB**.
2. Enter title, artist, album, genre, release date and optional description. Existing artists/albums are suggested; new entries are created when needed. Publish immediately or save as a draft.
3. Edit, publish/unpublish and delete releases from the catalogue. Use Artists and Albums to manage metadata. Reassign dependent tracks before deleting an artist/album.
4. In Adverts, add an MP4 or WebM between **4 and 120 seconds**, up to **30 MB**. H.264/AAC MP4 works well across Android browsers. Activate it and set its priority; lower numbers are selected first.
5. Configure listening passes in Settings, between **1 and 120 minutes**, initially **30**. Existing passes keep their original expiry.
6. Publish at least one song and activate an advert before opening listening to users.

PostgreSQL stores metadata and relationships. Supabase Storage stores the actual media bytes, not SQL rows or browser-local files. Songs receive signed links only after the server verifies a valid listening pass.

## Launch check

```bash
npm run build
npm run check:production
```

The read-only launch gate verifies that sample media is absent from the production package, calls the real deployed status endpoint, and requires a published song plus an active advert. It intentionally returns **NOT READY TO LAUNCH** while the backend or real content is missing. It never creates accounts, seeds music or pretends a public key grants administrative access.

## Listener features

- Discover, genre/title/artist search, track and artist detail pages.
- One audio player across navigation; seek, volume, next/previous, shuffle, repeat and editable queue.
- Server-verified advert completion unlocks a listening period; cancelling an advert grants no pass.
- Account-owned favourites, playlists, artist follows and recent listening.
- Daily mixes based on actual likes, follows and recent history; mood mixes and listening shortcuts.
- Playlist names/descriptions, cover mosaics, search, sorting and saved track ordering.
- Play next, queue reordering, sleep timers and optional Media Session device controls.
- Responsive navigation, keyboard shortcuts, reduced-motion support, loading states and clear errors.

Media Session hardware/lock-screen controls depend on the browser and device. Sleep timers belong to the open tab; a suspended browser may process a deadline after resuming. See [Media Session](https://www.w3.org/TR/mediasession/).

## Deployment

Cloudflare Pages: build `npm run build`, output `dist`, Node 24. Use the directory containing `package.json` as the build root. The configured project identifiers are already public defaults; to use another project, set both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the build environment, then rebuild. Use only a publishable/anon key. The build rejects secret/service-role keys.

The hosted site retains its existing private audience at https://horicx-music.thoughtfulhoopoe1.chatgpt.site. Publishing a frontend does not deploy Supabase SQL or Edge Functions. Deploy and verify those separately with project-owner access.

## Security and practical limits

All 17 application tables use RLS. Admin roles are separate protected records; email matches in frontend code cannot grant admin access. Private object paths are separate from the public catalogue. Uploads have strict limits and practical file-signature checks; these are not full antivirus/media decoding. SVG/HTML uploads are rejected.

Advert sessions belong to an authenticated listener, expire after ten minutes, check plausible elapsed time and progress, and complete atomically once. Playback links expire within 60 seconds or the remaining listening-pass duration. These measures reduce bypassing but cannot prove human attention or prevent recording/copying. An already buffered stream cannot be recalled.

Sensitive requests have database-backed rate limits. Registered user counts exclude anonymous sessions. Play counts mean authorised links issued, not proof that a whole song was heard. Account libraries are private to their owner; stale/duplicate/foreign playlist reorder requests are rejected.

Review unreferenced objects after interrupted uploads. Database backups do not include storage-object backups. Monitor storage and egress: a four-minute 128 kbps MP3 is about 3.84 MB, so 1,000 full listens is about 3.84 GB before artwork/ad traffic. Individual upload caps are not a spending cap. Check current quotas in your provider dashboard. Before growing beyond the 500-entry catalogue limit, add pagination/caching and a retention policy for events/anonymous accounts.

## Verification and isolated development fixtures

```bash
npm run build
npx playwright install chromium
npm test
npm run test:security
node --test tests/admin-setup.test.mjs
npx deno check --no-config --node-modules-dir=none supabase/functions/music-api/index.ts
npx deno test --no-config --node-modules-dir=none --allow-env tests/edge.test.ts
npm audit
```

The browser suite has a separate, explicit local fixture server for playback regression tests, a cloud UI server with mocked HTTP responses, and a production server that checks sample exclusion and access guards. `npm run dev:demo` starts only the isolated development fixture mode. It is never the default and cannot be enabled in production mode with a browser flag.

PostgreSQL tests apply the actual migrations in PGlite with auth/storage schema doubles. Edge and bootstrap tests use explicit local HTTP fixtures. These are meaningful implementation checks, not evidence that the live Supabase backend was provisioned. See `VALIDATION.md` for current live checks and remaining blockers.

The optional generated development media and its provenance remain in `CREDITS.md`; none are bundled in production, and the production catalogue starts with your real uploads. No external music scraping, third-party advert network or OpenAI API is used.

References: [Supabase private downloads](https://supabase.com/docs/guides/storage/serving/downloads), [storage RLS](https://supabase.com/docs/guides/storage/security/access-control), [project access tokens](https://supabase.com/docs/guides/platform/personal-access-tokens), [Auth user administration](https://supabase.com/docs/guides/auth/users).
