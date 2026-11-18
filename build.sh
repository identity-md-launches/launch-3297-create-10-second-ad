#!/usr/bin/env bash
# Rebuilds artifacts/video.mp4 from source. Needs node (>=18) and ffmpeg with libx264 + drawtext.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build artifacts
node src/synth.mjs build/audio.wav
node src/render.mjs | ffmpeg -y -hide_banner -loglevel error \
  -f rawvideo -pix_fmt rgb24 -s 1280x720 -r 30 -i pipe:0 \
  -i build/audio.wav \
  -filter_script:v src/overlay.txt \
  -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 19 -profile:v high -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 44100 \
  -movflags +faststart -t 10 artifacts/video.mp4
echo "wrote artifacts/video.mp4"
