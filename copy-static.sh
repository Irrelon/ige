#!/bin/bash

# Define source and destination directories
SRC_DIR="./src"
DIST_DIR="./dist/esm"

# Find and copy all files except .ts and .tsx, maintaining the directory structure
find "$SRC_DIR" -type f ! \( -name '*.ts' -o -name '*.tsx' \) -exec sh -c '
  file="{}";
  # Remove the leading src directory from the path and prepend the destination directory
  dest="'$DIST_DIR'/${file#*/}";
  dest="${dest/'$SRC_DIR'//}"; # Ensure src directory is removed from the destination path
  mkdir -p "$(dirname "$dest")" && cp "$file" "$dest"
' \;
