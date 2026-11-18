#!/usr/bin/env bash
# Build the 3D platformer cut and its 10-second original soundtrack.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build/platformer-frames artifacts
blender -b --python src/render3d.py -- --render > build/render3d.log 2>&1
node src/synth.mjs build/audio.wav
tools/bin/ffmpeg -y -hide_banner -loglevel error \
  -framerate 24 -i build/platformer-frames/frame_%04d.png \
  -i build/audio.wav -frames:v 240 -t 10 \
  -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 44100 \
  -movflags +faststart artifacts/video-v2.mp4
tools/bin/ffprobe -v error -show_entries format=duration,size \
  -show_entries stream=codec_name,codec_type,width,height,r_frame_rate \
  -of json artifacts/video-v2.mp4
