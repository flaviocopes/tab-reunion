#!/bin/sh
# Zips the extension into dist/TabMerger-<version>.zip, a folder ready for Load unpacked.
set -e
cd "$(dirname "$0")/.."
export TZ=UTC

version=$(node -p "require('./manifest.json').version")
icons=$(node -p "[...new Set(Object.values(require('./manifest.json').icons))].join(' ')")
name="TabMerger-$version"
stage="dist/$name"

rm -rf dist
mkdir -p "$stage/icons"
cp manifest.json background.js LICENSE "$stage/"
for icon in $icons; do cp "$icon" "$stage/icons/"; done

# Fixed timestamps, so the same commit always produces the same zip
find "$stage" -exec touch -t 202601010000 {} +
(cd dist && zip -qrX "$name.zip" "$name")
rm -rf "$stage"

shasum -a 256 "dist/$name.zip"
