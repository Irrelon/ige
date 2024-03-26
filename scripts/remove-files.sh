#!/bin/bash

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <glob-pattern>"
  exit 1
fi

glob_pattern="$1"

# Function to remove files based on the glob pattern
remove_files() {
  local folder="$1"
  local pattern="$2"

  find "$folder" -type f -name "$pattern" \( -path "*/node_modules/*" -o -path "*/tools/*" \) -prune -o -exec rm -f {} \;
}

# Main script
read -p "Enter the folder path (press Enter for current folder): " folder_path

if [ -z "$folder_path" ]; then
  folder_path="."
fi

if [ ! -d "$folder_path" ]; then
  echo "Error: The specified folder does not exist."
  exit 1
fi

echo "Removing files matching the pattern '$glob_pattern' in '$folder_path' and its sub-folders (excluding 'node_modules' and 'tools')..."
remove_files "$folder_path" "$glob_pattern"

echo "Done."
