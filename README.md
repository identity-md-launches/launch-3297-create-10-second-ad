# Super Donkey Kart of Time: 10-second ad

Output: `artifacts/video.mp4` (video/mp4). It is built from this repository by `./build.sh`.

## What the ad shows

| Time | Scene | Nod to | Caption |
|------|-------|--------|---------|
| 0.0–2.5 s | A kart racing down a curving sunset track toward a floating castle with a clock tower. Spinning coins and time crystals fly past. | kart racing | RACE THROUGH THE AGES |
| 2.5–5.0 s | A side-scrolling jungle. The hero hops across platforms, grabs bananas and passes a star. | ape platforming / 3D platformer collecting | LEAP. SWING. COLLECT. |
| 5.0–7.5 s | A swirling time vortex, a giant clock whose hands spin backward, and music notes in orbit. | time-bending adventure with a magic song | PLAY THE SONG. BEND TIME. |
| 7.5–10.0 s | Title card on a rotating sunburst with a checkered-flag strip. | all four | SUPER DONKEY / KART OF TIME / RACE. CLIMB. EXPLORE. REWIND. / COMING SOON |

The scenes are separated by white flash cuts. The hero is an original character: an ape adventurer in a green pointed cap and red scarf. It combines the four sources without copying any of them.

## Technical record

| Property | Value |
|----------|-------|
| Container | MP4, `+faststart` (moov atom at the front) |
| Video | H.264 High profile, yuv420p, 1280×720, 30 fps, 300 frames, CRF 19 |
| Audio | AAC-LC, 44.1 kHz stereo, 192 kb/s |
| Duration | 10.000 s |
| Size | about 3.1 MB |
| Loudness (measured) | mean about −13.5 dB, peak −0.8 dBFS, even across all four scenes |

Audio choices: an original chiptune score synthesized in `src/synth.mjs` from square, triangle, sine and noise voices.
- Race scene: a driving theme in C with a rising engine rev and coin-pickup sparkles.
- Jungle scene: a bouncy theme in F with jump "boings" and banana-pickup blips.
- Vortex scene: a slow, vibrato, ocarina-like sine melody over A-minor arpeggios, with a backward swoop and a reverse-cymbal riser.
- Title card: a fanfare and crash, then a held chord that fades out.

There is also a short whoosh on each cut and a light stereo echo. No melody from any existing game is used.

## How it was made

- `src/render.mjs`: Node renders every frame in code (gradients, a pseudo-3D road projection, polygons, polar-coordinate vortex and sunburst patterns) and pipes raw RGB to ffmpeg.
- `src/synth.mjs`: writes the soundtrack as a 16-bit WAV.
- `src/overlay.txt`: the ffmpeg `drawtext` filter graph for captions and the animated title (DejaVu Sans Bold).
- `build.sh`: synth → render → `ffmpeg -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart`.

Rebuild: `./build.sh`. It needs Node ≥ 18 and ffmpeg with libx264 and drawtext, and expects `/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`. On this machine the build takes about 8 s.

## Limitations

- **Procedural 2D art, not AI or 3D footage.** The AI image service did produce a test image, but this machine's shell has no outbound network, so the output file could not be downloaded. Every pixel was therefore rendered locally in code. The look is flat vector cartoon, not real low-poly 3D gameplay.
- **No Nintendo characters, art, logos, music or sound effects are used.** The ad only suggests the four source games through their genres: kart racing, ape platforming, collecting coins, stars and bananas, and a clock/song time mechanic. "Super Donkey Kart of Time" is the requester's mash-up title. It is not an actual Nintendo product, and anyone releasing this commercially should clear the title name for trademark issues.
- No voice-over. The ad uses on-screen captions only.
- Structural checks passed: codec, dimensions, duration and audio were confirmed with ffprobe, and preview frames from each scene were inspected by eye. No separate visual-quality review was run.
