# HackerTube for Google TV Streamer

A small Android TV wrapper around https://hackertube.org. Browse the live site in fixed screens with a D-pad, search, and play videos in the native YouTube TV app by default. Its audio/video synchronization was confirmed on the Streamer; the built-in WebView player exhibited delayed sound. Settings lets you choose either player. Scrolling defaults to Off: lists show six cards per page and long text is split into measured pages. On uses continuous lists and scrollable text while keeping navigation and the menu fixed. This MVP targets the Google TV Streamer only.

## Remote controls

The focus highlight uses one orange border. Small is the default text size for video titles, subtitles, and long text, two CSS pixels below the previous version. Medium restores the previous size, and Large adds two more pixels.

The HackerTube logo sits above the left menu and opens Home when selected. The menu ends with Search, Filters, Settings, and About. Search remains hidden until selected, and Home uses the freed space for larger video cards.

| Screen | Controls |
| --- | --- |
| Browse | Arrows move the highlighted selection. With scrolling off, Right from the video grid's right edge opens the next page, and Left from its left edge opens the previous page. Focus lands on the opposite edge in the matching row. Left from page one's left edge returns to the selected orange menu item, or Home when the route has no selected section. Previous and Next remain available and keep focus when pressed. With scrolling on, moving focus scrolls the list and loads more videos near the end. OK opens the selection, and Back returns to the previous view. |
| Details, filters, topics | With scrolling off, use Previous and Next. With scrolling on, use Up/Down to read text or move through lists. Back closes the panel. |
| Settings | Select Player to switch between YouTube, the default, and Built-in. Scrolling and Built-in captions toggle On or Off. Video text size cycles Small, Medium, and Large. All choices survive app restarts. Built-in captions default to Off; native YouTube uses its own caption settings. |
| Search | Select Search near the bottom of the left menu. The hidden field appears and opens the TV keyboard. Submit with the keyboard or Go; Back hides the field. |
| Watch page | Select the poster or Play in YouTube to start with the default player. With Built-in selected, the action is Play fullscreen. Open in YouTube is always available. |
| Native YouTube player | Uses YouTube's own remote controls, overlays, captions, and Back navigation. Back first opens YouTube's screens, rather than returning directly to HackerTube. Reopening HackerTube restores the watch page with Play focused. |
| Built-in player | The video fills the screen with no app buttons or instructions. OK toggles play/pause, Left/Right seek 10 seconds, and Back returns directly to the watch page. |

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

Package: `ch.cri.hackertube`, version `0.3.12` (code 15). This is a development APK signed with the local Android debug key, not a Play Store release. WebView debugging is available only in debug builds.

## Implementation

- `MainActivity.java` hosts the real HTTPS site, handles loading errors, Back, and external links. Playback explicitly targets the native YouTube TV package by default, falling back to the built-in player with a notice if YouTube TV is unavailable.
- `tv.js` presents the live site in a fixed TV shell, with paginated cards and measured text pages. The original DOM remains an offscreen data source for its router, preferences, and actions. The batch loader supports explicit Next requests in paged mode and automatic loading near the end in scrolling mode.
- `navigation.js` contains the small geometry function tested by `tests/navigation.test.cjs`.
- `PlayerActivity.java` and `player.html` use YouTube's official iframe API in a bundled document. The package-name base URL provides the app's referrer identity.

HackerTube's Content Security Policy blocks third-party scripts in its own page. The separate player avoids changing that policy. No JavaScript-to-Java bridge, stream extraction, or website copy is used. The site's local preferences, liked videos, and history stay in its WebView storage. No credentials or API key are required.

## MVP limits

Internet access is required. Videos may be unavailable, restricted, or disallowed in embedded players. The navigation adapter depends on the site's current DOM and may need updates if it changes. The built-in player still has a known audio synchronization issue on this Streamer; selecting native YouTube avoids that playback path rather than correcting WebView's audio clock. Native YouTube controls and captions are managed by YouTube, so the minimal built-in overlay and app caption toggle do not apply there.

Built-in captions require an available YouTube caption track. On uses YouTube's [caption load policy](https://developers.google.com/youtube/player_parameters#cc_load_policy). Off clears the active caption track when the player advertises that option, including after caption modules load. The track option is not part of YouTube's documented stable API and may need maintenance if YouTube changes it. External apps opened through links have their own layouts; the browsing mode preference applies to HackerTube itself.

The smoke-test record is in `SMOKE_TEST.md`.
