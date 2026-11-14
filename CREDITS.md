# Horicx Music — media provenance

All music, cover illustrations, fictional artist illustrations, the featured landscape, the brand mark and the sample advert were created specifically for this project. No commercial recordings, scraped music, external brand assets, artist photos, or third-party music hotlinks are included.

## Original generated demo audio

`scripts/generate-media.py` composes and synthesizes six original instrumental excerpts using Python's standard library. Each has its own tempo, key, chord progression and lead melody. The synthesizer combines sine harmonics, amplitude envelopes, a low bass voice, synthesized kick drums, seeded noise percussion, a quiet delay, soft limiting and fades. Audio is rendered at 24 kHz and encoded by FFmpeg to mono 96 kbps MP3.

| Track | Fictional artist | Tempo | Approximate duration |
| --- | --- | --- | --- |
| After Hours | Luna Vale | 92 BPM | 21 s |
| Golden Hour | Sol Theory | 104 BPM | 18 s |
| City Lights | Neon Atlas | 116 BPM | 17 s |
| Slow Mornings | Juno Bloom | 78 BPM | 25 s |
| Wildflower | Milo Rivers | 100 BPM | 19 s |
| Ocean Drive | Coastline | 110 BPM | 17 s |

These are original generated demo audio, not commercial releases. The artists are fictional. All melody, harmony, synthesis and rhythm generation is in the reproducible source. No input recordings, samples, or musical datasets were used.

## Original artwork

The same script creates SVG illustrations from geometric shapes, original paths, gradients and deterministic procedural textures. Covers are also exported as PNG for the production upload allowlist. The six portraits are stylized drawings of fictional characters. The hero is an original twilight landscape. No AI image service or external stock images are used.

## Demo advert

`public/demo-advert.mp4` is an eight-second 960×540 H.264/AAC MP4, rendered locally with FFmpeg. It uses project branding, a charcoal/lime title card and part of the original Golden Hour instrumental. “DEMO ADVERT” is visible in the video. FFmpeg uses the system DejaVu font; see https://dejavu-fonts.github.io/License.html for the font licence. The advert does not represent a paid placement or an advertising network.

## Dependencies

Lucide icons (ISC): https://lucide.dev/license
React (MIT): https://github.com/facebook/react/blob/main/LICENSE
Vite (MIT): https://github.com/vitejs/vite/blob/main/LICENSE
Tailwind CSS (MIT): https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE
Supabase JS (MIT): https://github.com/supabase/supabase-js/blob/master/LICENSE

The interface uses the device's system sans-serif font. Generated demo media may be used, modified and redistributed as part of Horicx Music. You must have distribution rights to any additional music or adverts you upload.
