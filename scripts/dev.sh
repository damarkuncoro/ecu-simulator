#!/bin/bash
# Start TypeScript watch mode for all packages in parallel.
# This script starts `tsc --watch` in each package directory concurrently.
# Press Ctrl+C to stop all.

set -e

echo "Starting TypeScript watch for all packages..."

# Find all package directories with src folder
PACKAGES=$(find packages -name package.json -not -path "*/node_modules/*" | while read pkg; do
  dir=$(dirname "$pkg")
  if [ -d "$dir/src" ]; then
    echo "$pkg"
  fi
done | sort)

# Start watch in background for each
for pkg_json in $PACKAGES; do
  PKG_DIR=$(dirname "$pkg_json")
  PKG_NAME=$(node -p "require('$pkg_json').name" 2>/dev/null || echo "unknown")
  echo "[$PKG_NAME] $PKG_DIR"
  (cd "$PKG_DIR" && exec pnpm exec tsc -p tsconfig.json --watch) &
done

# Wait for all (until Ctrl+C)
trap "echo 'Stopping all...'; kill 0; exit" INT TERM
wait
