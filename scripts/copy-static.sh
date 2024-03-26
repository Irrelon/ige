#!/bin/bash

# Define source and destination directories
SRC_DIR="./src"
DIST_DIR="./dist/esm"

# Ensure these are absolute paths to avoid issues with sed and path manipulation
ABS_SRC_DIR=$(realpath "$SRC_DIR")
ABS_DIST_DIR=$(realpath "$DIST_DIR")

# Find and copy all files except .ts and .tsx, maintaining the directory structure
find "$ABS_SRC_DIR" -type f ! \( -name '*.ts' -o -name '*.tsx' \) -exec bash -c '
  ABS_SRC_DIR="${1}";
  ABS_DIST_DIR="${2}";
  file="{}";
  rel_path="${file#$ABS_SRC_DIR/}";
  dest="$ABS_DIST_DIR/$rel_path";
  echo $dest
  mkdir -p "$(dirname "$dest")" && cp "$file" "$dest"
' bash "$ABS_SRC_DIR" "$ABS_DIST_DIR" \;
