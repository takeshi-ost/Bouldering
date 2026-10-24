#!/bin/sh
set -eu

# Xcode runs this AFTER Copy Bundle Resources. Only the configuration-specific
# product is modified; shared source assets are never rewritten by this phase.
input_file="${SRCROOT}/App/public/js/game.js"
output_file="${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/public/js/game.js"
manifest_file="${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/ascent-build-configuration.txt"
firebase_mode="${ASCENT_FIREBASE_MODE:-offline}"
case "$firebase_mode" in offline|read-only|auto-sync) ;; *) echo 'Invalid Firebase mode' >&2; exit 1 ;; esac
if ! grep -q "\"mode\":\"$firebase_mode\"" "$SRCROOT/App/public/native-firebase-mode.json"; then
    echo 'Firebase assets/build mode mismatch; refusing build' >&2
    exit 1
fi

case "${CONFIGURATION}" in
    Debug|Release) ;;
    *) echo "Unsupported ASCENT build configuration" >&2; exit 1 ;;
esac
if [ "$(grep -c '^let debugMode = false;$' "$input_file")" != 1 ]; then
    echo "Expected exactly one neutral debug declaration; refusing unverified build" >&2
    exit 1
fi
if [ "$CONFIGURATION" = Release ]; then
    sed 's/^let debugMode = false;$/const debugMode = false;/' "$input_file" > "$output_file"
else
    cp "$input_file" "$output_file"
fi
printf '%s\n' "$CONFIGURATION" > "$manifest_file"
