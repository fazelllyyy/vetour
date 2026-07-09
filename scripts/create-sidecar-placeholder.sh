#!/bin/sh
# Create a placeholder sidecar binary for CI cargo check.
# Tauri's build script validates that the external binary exists.

set -e

mkdir -p src-tauri/binaries

case "$(uname -s),$(uname -m)" in
  Linux,x86_64)   name="ffmpeg-x86_64-unknown-linux-gnu" ;;
  Linux,aarch64)  name="ffmpeg-aarch64-unknown-linux-gnu" ;;
  Darwin,x86_64)  name="ffmpeg-x86_64-apple-darwin" ;;
  Darwin,arm64)   name="ffmpeg-aarch64-apple-darwin" ;;
  MINGW*|MSYS*)   name="ffmpeg-x86_64-pc-windows-msvc.exe" ;;
  *)              echo "Unknown platform"; exit 1 ;;
esac

touch "src-tauri/binaries/$name"
echo "Created placeholder: src-tauri/binaries/$name"