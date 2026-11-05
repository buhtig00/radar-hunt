#!/usr/bin/env bash
# Genera la película Eye Universe en HLS adaptativo (2160/1080/720/480) desde el máster.
# Uso: scripts/radar-hunt/make-eye-hls.sh RH_EYE_S01-S04_MASTER_v4_2160p24_ProRes422HQ.mov salida/
# Después, sube la carpeta a la CDN y apunta VITE_EYE_VIDEO_URL a salida/master.m3u8.
set -euo pipefail
IN="$1"; OUT="${2:-eye-hls}"; mkdir -p "$OUT"
ffmpeg -y -i "$IN" -filter_complex \
  "[0:v]split=4[a][b][c][d];[a]scale=3840:2160[v0];[b]scale=1920:1080[v1];[c]scale=1280:720[v2];[d]scale=854:480[v3]" \
  -map "[v0]" -c:v:0 libx264 -b:v:0 16M -maxrate:v:0 18M -bufsize:v:0 32M \
  -map "[v1]" -c:v:1 libx264 -b:v:1 6M  -maxrate:v:1 7M  -bufsize:v:1 12M \
  -map "[v2]" -c:v:2 libx264 -b:v:2 3M  -maxrate:v:2 3.5M -bufsize:v:2 6M \
  -map "[v3]" -c:v:3 libx264 -b:v:3 1.2M -maxrate:v:3 1.5M -bufsize:v:3 2.4M \
  -preset slow -profile:v high -pix_fmt yuv420p -g 48 -keyint_min 48 -sc_threshold 0 -r 24 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -f hls -hls_time 4 -hls_playlist_type vod -hls_flags independent_segments \
  -master_pl_name master.m3u8 -var_stream_map "v:0 v:1 v:2 v:3" \
  -hls_segment_filename "$OUT/v%v/seg_%03d.ts" "$OUT/v%v/index.m3u8"
echo "HLS listo: $OUT/master.m3u8"
