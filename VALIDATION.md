# Validation — 17 November 2026

## Passed

- Production TypeScript check and Vite build. Static output is approximately 2.1 MB including all original music, illustrations, cover exports, video and app code.
- Production preview returns HTTP 200. The 26 demo browser tests ran against this production bundle; six cloud UI checks used explicit HTTP mocks.
- **32 browser tests passed**: original artwork/media loading, title/artist/genre search, missing results, incomplete advert rejection, full real-time demo advert completion, actual audio playback and navigation continuity, seek/volume/transport/shuffle/repeat/queue controls, favourites and playlists across reloads, artist/song detail navigation, local MP3 and PNG uploads and playback, edit/publish/delete, advert uploads/activation/settings, missing advert recovery, 320/360/390/768 px overflow checks, mobile expanded player, invalid file rejection, pass expiry, and local artist/album management. Six of these tests explicitly mock Supabase HTTP responses to check cloud sign-in guards, a protected studio, auth error display and the absence of silent demo fallback.
- **39 PostgreSQL checks passed**: actual migration applied in PGlite, all application tables have RLS, profile creation, public catalogue filtering, private media and storage visibility, prevention of admin self-promotion, protected profile fields, denied listener writes, personal library ownership, anonymous library restrictions, authorised admin visibility, premature/expired/foreign/reused advert rejection, progress gap checks, single-use completion, rate limits and private bucket configuration.
- **16 Edge request-handler tests passed**: allowed/disallowed origins, method/JSON/body limits, unauthenticated admin/upload rejection, invalid user tokens, non-admin rejection, fabricated client pass denial, rate limits, no-cache responses and test cleanup. Supabase HTTP responses are explicit mocks.
- Deno type checking passes for the actual Edge Function entrypoint and its imported handler.
- Cloud seed JavaScript and Python media generator syntax checks pass.
- `npm audit`: **0 known vulnerabilities** with the committed dependency lockfile.
- Original audio and video are bundled local files, generated reproducibly with the included script. No external music hotlinks or API keys are needed for demo playback.

## New feature verification

- Daily mixes respond to an actual favourite and start their recommended playback queue.
- Following and unfollowing artists persists across reloads and appears in the personal library.
- Playlist names, descriptions and custom track order persist; collection search and duration sorting work.
- Play next and manual queue movement determine the actual next playing track.
- End-of-track sleep timers stop playback even with repeat enabled; timed deadlines pause playback; small-phone timer setup and cancellation work.
- Media Session metadata and playback state match the actual audio player in Chromium. Physical lock-screen/hardware controls depend on the browser/OS and were not tested on a physical device.
- New artist-follow privacy, guest restrictions, playlist-owner edits, atomic reorder, duplicate/stale-order rejection and service-only RPC permissions pass against the actual SQL migration in embedded PostgreSQL.
- The advert toggle now shows its pending state immediately, and queue reorder buttons have separate click targets.

## Requires your own Supabase project

No cloud credentials were supplied. Live email confirmation/delivery, deployed Supabase gateway/CORS, real Storage HTTP upload/download policies, real user sessions and end-to-end signed streaming against a hosted project remain unverified. Local PostgreSQL tests use Supabase auth/storage schema doubles; request and cloud UI tests use explicit HTTP mocks. They are useful checks of the implementation, not a claim that a cloud project is connected.

Follow README.md to apply the migration, deploy `music-api`, configure Auth/redirects/origins, fill `.env.local`, register and confirm your own account, and grant its administrator role through `scripts/first-admin.sql`. The seed script then imports the bundled original media through the protected admin API.

The private hosted demo is a static deployment. Your future private music uploads and account data belong to your Supabase project; they are not created by publishing the demo.

For an existing connected project, apply `supabase/migrations/202611170001_listening_features.sql` and redeploy `music-api` before deploying this frontend. New local demo features are fully usable without Supabase credentials.
