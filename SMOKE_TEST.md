# MVP smoke test, 2026-11-07

Target identity was checked immediately before installation: `Google TV Streamer`, Android API 34, isolated ADB port 5038. Package `ch.cri.hackertube`, version 0.1.0.

## Build checks

- Debug APK assembly passed with JDK 17, Android SDK 36, Gradle 8.14.5, and AGP 8.11.1.
- Android lint passed with no errors. The final offline run reported one advisory warning for additional icon density variants.
- Three Node tests passed: aligned D-pad navigation, no reverse-direction wrap at edges, and diagonal fallback.
- JavaScript syntax check passed.

## Physical Streamer checks

- Installation succeeded and MainActivity became the focused activity.
- The live site rendered a three-column video grid with 36 cards and initial focus on a video.
- Remote direction events moved focus; OK opened a watch page and focused its poster.
- A second OK opened PlayerActivity. YouTube's official API reported ready=true, playing state 1, and advancing playback time. A TV screenshot showed the video rendered in the player screen.
- OK paused the video at 22.535691 seconds, state 2.
- Right moved the paused position to 32.535691 seconds, exactly 10 seconds forward.
- OK resumed; the player later reported state 1 at 43.744933 seconds.
- Back returned to the same watch page, with focus on the poster. Another Back returned to browsing.
- Up navigation reached Search; OK displayed the Android TV keyboard. Submitting `linux` navigated to `/search/linux`, rendered 30 results, and focused a result.

- The player action buttons launched the native YouTube TV app. HackerTube's background player reported paused state 2.

## Final installation

The final repository-built APK was installed and its on-device SHA-256 matched the local APK: `a0209038a1e72024d63869473fa02985ad767b50491d6af659f602a0d1aa43fe`. The final launch displayed 36 cards, focused a video, and left MainActivity in the foreground.

## Limits of verification

Remote events were submitted through serial-pinned ADB on the physical device. Human remote feel and audible sound were not independently checked. Offline recovery and every video/category were not exhaustively tested. The website can reshuffle Home on return, so a previously selected card may no longer be present; the adapter then focuses an available card.


# No-scroll update, version 0.2.0, 2026-11-07

- All browse screens use six-card pages with fixed Previous/Next controls. Descriptions and discussions are split into measured text pages instead of hidden overflow.
- On the physical Streamer, the WebView viewport was 960 x 540 CSS pixels. Root scroll height was 540, and horizontal/vertical scroll positions remained zero.
- Seven Home page advances crossed the first 36-item batch and loaded 72 items. Content changed, with no scrolling.
- Longs, Liked, History, Watch later, Categories, Playlists, and Settings all had zero out-of-viewport controls and zero scroll position. Categories exposed 170 entries through pages; Playlists exposed 27.
- Filters exposed 26 options over five pages.
- A video's details and comments produced 11 text pages. The first three pages each had content height equal to the 270-pixel reader height, with different text and no overflow.
- Search opened the TV keyboard. The reduced 960 x 300 viewport still had no out-of-viewport controls or scrolling. Searching linux produced 30 results.
- Build and lint passed; all four focused tests passed, including coverage of the last partial page and empty-list bounds.

- Final 0.2.0 remote OK opened a video and started playback (ready=true, state=1, time=14.74 seconds). Back returned through the watch page to Home. Both screens had zero scroll offset.
- Final installed APK matches the repository build SHA-256: `990819f97859369559d8f76dce0b949fae36c2345e79ef4795746041eb6901ab`.


# Configurable scrolling, version 0.3.0, 2026-11-07

- Settings exposes a remote-selectable Scrolling switch with On/Off labels and matching accessibility state. Fresh installs default to Off.
- On the physical Streamer, remote OK switched both ways. Both values survived cold launches.
- In scrolling mode, Home rendered all 36 loaded cards. Three remote Down events moved the content pane to 579 pixels while the root stayed at zero.
- Reaching the end fetched 72 cards. After fixing focus restoration, the content offset remained at 2290 pixels throughout the batch refresh.
- A long details panel rendered 1991 pixels of text. Remote Down moved the focused reader by 203 pixels.
- Switching Off restored six cards, a 270-pixel pane with exactly 270 pixels of content, and a 540-pixel root with exactly 540 pixels of content. Both scroll offsets were zero.
- The final cold launch retained Off, showed six cards, and was visually checked from a physical-device screenshot.
- The final offline build, lint, JavaScript syntax checks, and four focused tests passed.
- The installed APK SHA-256 matches the local build: `6f9078aadfcbd1e7bd36651223228b95aaba72a6168b77476c702b140a2c3ac0`.


# Paging focus, version 0.3.1, 2026-11-07

- Next and Previous retain focus after replacing cards or text. The pager uses guarded ARIA disabled states so reaching a page limit or loading videos does not remove focus.
- Seven consecutive remote OK presses on Next reached Home page 8 and loaded 72 videos. Focus remained on Next, including throughout the asynchronous request.
- Seven remote Previous presses returned to page 1, with focus on Previous. Another OK kept the same page and focus.
- Playlists reached page 5 of 5 with Next still focused. Another OK did not advance past the final page.
- A nine-page details panel retained Next after advancing and Previous when returning to its first page. Root scroll offset remained zero.
- The user's pre-test Scrolling On preference was restored after verification.
- Offline build, Android lint, JavaScript syntax checks, and all four focused tests passed. Installed APK matches the local SHA-256: `06476b284358bf9852a61b49b3ad41948fea0494653a4161564b0a23afb01532`.


# Compact navigation, version 0.3.2, 2026-11-07

- Removed the extra top brand row and redundant Home title. The live Home cards gained height: the content pane measured 420 CSS pixels in paged mode, compared with 270 before this update.
- The left menu fits all 11 buttons inside the 540-pixel viewport, with About, Search, Filters, and Settings at the bottom in that order. Root scroll height remained 540 pixels.
- Remote OK on Search revealed and focused the field and opened the Google TV keyboard. Search for `linux` returned 30 results and hid the field. Back closed the revealed field and returned focus to Search.
- About opened its page. Filters opened 26 options from Settings, returning through Home when necessary.
- With scrolling Off, the pane and content both measured 420 pixels, six cards were visible, and root and pane scroll offsets were zero. The user's Scrolling On preference was restored after testing.
- Final offline build, lint, JavaScript syntax check, and four focused tests passed. The installed APK matched the local SHA-256: `6b2c6a4b015e3a47217657c9451c115edeed640c4cacbad244c64038f1f2a12c`.


# Single focus border and text sizes, version 0.3.3, 2026-11-07

- The physical Streamer showed one 2-pixel orange border on the selected video card, with no CSS outline.
- The new Small default rendered video titles at 14 CSS pixels and subtitles at 11, each two pixels below the previous version. The long-text reader rendered at 17 pixels.
- Remote OK on Settings, Video text size cycled Small, Medium, Large while retaining focus. Medium matched the former sizes, and Large rendered video titles at 18 pixels and subtitles at 15.
- Large survived a cold app restart. The test restored Small and the user's Scrolling On preference.
- With scrolling temporarily Off, a six-page details view fitted its 330-pixel reader exactly, with zero root scroll and no clipped page content.
- Offline build, lint, JavaScript syntax check, and all four focused tests passed. Installed APK SHA-256 matched the build: `3eb7215b480ab217c4c08456cf91b1a9b9b90318c143784f353519914ea4ab43`.
