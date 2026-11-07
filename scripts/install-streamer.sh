#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
endpoint="${STREAMER_ENDPOINT:-192.168.1.50:5555}"
port="${STREAMER_ADB_PORT:-5038}"
apk="${1:-app/build/outputs/apk/debug/app-debug.apk}"
test -f "$apk" || { echo "Build the APK first: scripts/build.sh" >&2; exit 1; }
# Isolate ADB from phones and verify the target before every installation.
adb -P "$port" connect "$endpoint"
model=$(adb -P "$port" -s "$endpoint" shell getprop ro.product.model | tr -d '\r')
test "$model" = 'Google TV Streamer' || { echo "Unexpected device: $model" >&2; exit 1; }
adb -P "$port" -s "$endpoint" install -r "$apk"
adb -P "$port" -s "$endpoint" shell am start -W -n ch.cri.hackertube/.MainActivity
