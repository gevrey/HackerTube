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
# Keep the cross-app shortcut checks independent of Android and external test libraries.
session_test_dir=$(mktemp -d)
trap 'rm -rf "$session_test_dir"' EXIT HUP INT TERM
"${JAVA_HOME:+$JAVA_HOME/bin/}javac" -d "$session_test_dir" \
    app/src/main/java/ch/cri/hackertube/YouTubeBackSession.java tests/YouTubeBackSessionTest.java
"${JAVA_HOME:+$JAVA_HOME/bin/}java" -cp "$session_test_dir" ch.cri.hackertube.YouTubeBackSessionTest
./gradlew :app:assembleDebug :app:lintDebug --console=plain "$@"
