# HackerTube for Google TV Streamer

A small Android TV wrapper around https://hackertube.org. Browse the live site in fixed screens with a D-pad, search, open a video, and play it in an app-owned fullscreen YouTube player. Settings contains saved **Scrolling** and **Video text size** controls. Off is the default: lists show six cards per page and long text is split into measured pages. On uses continuous lists and scrollable text while keeping navigation and the menu fixed. This MVP targets the Google TV Streamer only.

## Remote controls

The focus highlight uses one orange border. Small is the default text size for video titles, subtitles, and long text, two CSS pixels below the previous version. Medium restores the previous size, and Large adds two more pixels.

The HackerTube logo sits above the left menu and opens Home when selected. The menu ends with Search, Filters, Settings, and About. Search remains hidden until selected, and Home uses the freed space for larger video cards.

| Screen | Controls |
| --- | --- |
| Browse | Arrows move the highlighted selection; OK opens it. With scrolling off, Previous and Next replace the six-card page and keep focus on the pressed button, including at page limits. With scrolling on, moving focus scrolls the list and loads more videos near the end. Back returns to the previous view. |
| Details, filters, topics | With scrolling off, use Previous and Next. With scrolling on, use Up/Down to read text or move through lists. Back closes the panel. |
| Settings | Select Scrolling to switch On or Off. Select Video text size to cycle Small, Medium, and Large. Both preferences survive app restarts. |
| Search | Select Search near the bottom of the left menu. The hidden field appears and opens the TV keyboard. Submit with the keyboard or Go; Back hides the field. |
| Watch page | Select the poster or Play fullscreen to start. Open in YouTube is available as a fallback. |
| Player | OK toggles play/pause; Left/Right seek 10 seconds; Down focuses the action buttons; Up returns to the player; Back returns to the watch page. |

## Build

Requires JDK 17, Android SDK platform 36, and Node.js for four small navigation and pagination tests. The Gradle wrapper pins Gradle 8.14.5 and Android Gradle Plugin 8.11.1. There are no third-party runtime dependencies.

```sh
./scripts/build.sh
```

The script discovers the existing Homebrew JDK and Mac Android SDK when environment variables are absent. Other machines should set `JAVA_HOME` and `ANDROID_HOME`. After dependencies are cached, `./scripts/build.sh --offline` also works.

APK: `app/build/outputs/apk/debug/app-debug.apk`

## Install and launch

This interrupts the current TV app. Use it when the Streamer is available for testing:

```sh
./scripts/install-streamer.sh
```

The script uses the isolated ADB server on port 5038 and verifies the exact `Google TV Streamer` model before installation. Override `STREAMER_ENDPOINT` if its address changes. The default is `192.168.1.50:5555`.

Package: `ch.cri.hackertube`, version `0.3.5` (code 8). This is a development APK signed with the local Android debug key, not a Play Store release. WebView debugging is available only in debug builds.

## Implementation

- `MainActivity.java` hosts the real HTTPS site, handles loading errors, Back, and external links.
- `tv.js` presents the live site in a fixed TV shell, with paginated cards and measured text pages. The original DOM remains an offscreen data source for its router, preferences, and actions. The batch loader supports explicit Next requests in paged mode and automatic loading near the end in scrolling mode.
- `navigation.js` contains the small geometry function tested by `tests/navigation.test.cjs`.
- `PlayerActivity.java` and `player.html` use YouTube's official iframe API in a bundled document. The package-name base URL provides the app's referrer identity.

HackerTube's Content Security Policy blocks third-party scripts in its own page. The separate player avoids changing that policy. No JavaScript-to-Java bridge, stream extraction, or website copy is used. The site's local preferences, liked videos, and history stay in its WebView storage. No credentials or API key are required.

## MVP limits

Internet access is required. Videos may be unavailable, restricted, or disallowed in embedded players; Open in YouTube is the explicit fallback. The navigation adapter depends on the site's current DOM and may need updates if it changes. Detailed YouTube settings, sign-in, captions, and quality selection are best handled in the YouTube TV app. External apps opened through links have their own layouts; the browsing mode preference applies to HackerTube itself.

The smoke-test record is in `SMOKE_TEST.md`.
