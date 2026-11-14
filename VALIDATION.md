# Validation — 14 November 2026

## Passed

- Production TypeScript check and Vite build. Static output is approximately 2.1 MB including all original music, illustrations, cover exports, video and app code.
- Production preview returns HTTP 200. The 18 demo browser tests ran against this production bundle.
- **23 browser tests passed**: original artwork/media loading, title/artist/genre search, missing results, incomplete advert rejection, full real-time demo advert completion, actual audio playback and navigation continuity, seek/volume/transport/shuffle/repeat/queue controls, favourites and playlists across reloads, artist/song detail navigation, local MP3 and PNG uploads and playback, edit/publish/delete, advert uploads/activation/settings, missing advert recovery, 320/360/390/768 px overflow checks, mobile expanded player, invalid file rejection, pass expiry, and local artist/album management. Five of these tests explicitly mock Supabase HTTP responses to check cloud sign-in guards, a protected studio, auth error display and the absence of silent demo fallback.
- **28 PostgreSQL checks passed**: actual migration applied in PGlite, all application tables have RLS, profile creation, public catalogue filtering, private media and storage visibility, prevention of admin self-promotion, protected profile fields, denied listener writes, personal library ownership, anonymous library restrictions, authorised admin visibility, premature/expired/foreign/reused advert rejection, progress gap checks, single-use completion, rate limits and private bucket configuration.
- **13 Edge request-handler tests passed**: allowed/disallowed origins, method/JSON/body limits, unauthenticated admin/upload rejection, invalid user tokens, non-admin rejection, fabricated client pass denial, rate limits, no-cache responses and test cleanup. Supabase HTTP responses are explicit mocks.
- Deno type checking passes for the actual Edge Function entrypoint and its imported handler.
- Cloud seed JavaScript and Python media generator syntax checks pass.
- `npm audit`: **0 known vulnerabilities** with the committed dependency lockfile.
- Original audio and video are bundled local files, generated reproducibly with the included script. No external music hotlinks or API keys are needed for demo playback.

## Requires your own Supabase project

No cloud credentials were supplied. Live email confirmation/delivery, deployed Supabase gateway/CORS, real Storage HTTP upload/download policies, real user sessions and end-to-end signed streaming against a hosted project remain unverified. Local PostgreSQL tests use Supabase auth/storage schema doubles; request and cloud UI tests use explicit HTTP mocks. They are useful checks of the implementation, not a claim that a cloud project is connected.

Follow README.md to apply the migration, deploy `music-api`, configure Auth/redirects/origins, fill `.env.local`, register and confirm your own account, and grant its administrator role through `scripts/first-admin.sql`. The seed script then imports the bundled original media through the protected admin API.

The private hosted demo is a static deployment. Your future private music uploads and account data belong to your Supabase project; they are not created by publishing the demo.
