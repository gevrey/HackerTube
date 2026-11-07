#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# Prefer explicit caller settings; these fallbacks match Christophe's Mac toolchain.
if [ -z "${JAVA_HOME:-}" ] && [ -d /opt/homebrew/opt/openjdk@17 ]; then
    export JAVA_HOME=/opt/homebrew/opt/openjdk@17
fi
if [ -z "${ANDROID_HOME:-}" ] && [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
fi
node --test tests/navigation.test.cjs
node --check app/src/main/assets/tv.js
./gradlew :app:assembleDebug :app:lintDebug --console=plain "$@"
