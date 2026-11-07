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


# About menu order, version 0.3.4, 2026-11-07

- On the physical Google TV Streamer, the last four menu items were Search, Filters, Settings, About.
- A remote Down press from Settings focused About, and OK opened `/about`. Root scroll remained zero in the 540-pixel viewport.
- Offline build, lint, JavaScript syntax check, and four focused tests passed. Installed APK matched the local SHA-256: `538e174773a1fbd2330d29e9fbd3e844228147f49d2a477a93d7a82818a6667d`.


# Sidebar logo, version 0.3.5, 2026-11-07

- Restored the white and orange HackerTube wordmark above the left menu. Its sidebar-only placement keeps the Home video pane at 420 CSS pixels high.
- All 11 menu labels fit. Remote Up from Home focused the logo, and OK on the logo returned from About to Home.
- In the 300-pixel keyboard viewport, the logo and every menu button had no horizontal or vertical overflow. Root scroll offset stayed zero.
- Offline build, lint, JavaScript syntax check, and four focused tests passed. Installed APK matched SHA-256 `a82a7ef6f9f3e483e168cbb89fd380be7586d9314b620f49c6beae075b53c538`.


# About credit handles, version 0.3.6, 2026-11-07

- The physical Streamer showed About links in the order `@karpathy`, `@gevrey`, `@cri`, with matching `https://x.com/` profile destinations.
- Repeated renders did not duplicate the added handles. The About reader included `@karpathy, @gevrey and @cri`, and root scrolling remained zero.
- Offline build, lint, JavaScript syntax check, and four focused tests passed. Installed APK matched SHA-256 `038f578b0c009d2326049e7745c4a0833957d1857d7a13ce06a2e3f38b27afff`.


# Credits and footer cleanup, version 0.3.7, 2026-11-07

- About link cards showed only `@karpathy` and `@cri`. The reader contained `@karpathy and @cri` and no `@gevrey`.
- The bottom instructions element and its reserved layout row were removed. Home's video pane measured 450 CSS pixels, up from 420, with a 540-pixel root and zero root scroll.
- The final Home layout was visually checked on the physical Streamer. Offline build, lint, syntax check, and four focused tests passed.
- Installed APK matched SHA-256 `76767a9282047f6617383021fff63d71ac014b27d17ec837ab0135ed657fb9ca`.


# Left returns to selected menu, version 0.3.8, 2026-11-07

- Physical Google TV Streamer remote Left events from Home tiles 1, 2, 3, and 6 focused the selected Home menu button. Left from each of the first two Settings tiles focused Settings. All 12 checks passed across Scrolling Off and On.
- The current route, content scroll offset, and zero root scroll stayed unchanged when focus returned to the menu. Routes without a selected menu section use Home as a fallback.
- The current Scrolling Off preference was restored after testing. The app was left on Home.
- Offline build, Android lint, JavaScript syntax check, and all four focused tests passed. Installed APK matched SHA-256 `8d0e3447eb1bd5ea5cb523391d83e6848561028e18a89ef796bfd5a5d7c8e999`.


# Clean fullscreen player, version 0.3.9, 2026-11-07

- The physical Google TV Streamer showed the video across the complete 960 x 540 CSS-pixel viewport. The iframe bottom was exactly 540 pixels, with no unused strip.
- The player document contained zero buttons and zero status or instruction elements. A physical-device screenshot confirmed that no app controls or text appeared at the bottom.
- Remote OK paused at 30.472 seconds and resumed playback. Right advanced to 40.472 seconds, and Left returned to 30.472 seconds.
- Remote Back returned to the same HackerTube watch page in `MainActivity`, with Play fullscreen focused.
- Offline build, Android lint, JavaScript syntax check, and all four focused tests passed. Installed APK matched SHA-256 `d4ffe4a1926e43bd2357cb50395ff576e1dd0583bd5bed21f9695d7f31b55580`.


# Video-grid edge paging, version 0.3.10, 2026-11-07

- With Scrolling Off on the physical Google TV Streamer, remote Right from the top-row right edge changed page 1 to page 2 and focused the top-row first tile. Left returned to page 1 and focused its top-row right edge.
- The same test on the bottom row moved focus from index 5 to index 3 on the next page, then back to index 5 on the previous page.
- At the first loaded-batch boundary, one remote Right press loaded 36 more videos, changed page 6 to page 7, and focused the first tile. Left returned to the right edge of page 6.
- Within page 1, Left moved normally between adjacent thumbnails. Crossing its left edge focused the selected Home menu item. Root and content scroll offsets remained zero.
- Offline build, Android lint, JavaScript syntax check, and all four focused tests passed. Installed APK matched SHA-256 `f0e121fa484d2ae68f5dff58440cd92e67af83dff361657c78c2c7e02c5ee8ee`.


# Caption setting, version 0.3.11, 2026-11-07

- Settings contains a Captions On/Off switch, defaulting to Off. Remote OK toggled both ways, updated `aria-checked`, saved the preference, and retained focus on the switch.
- All five Settings cards fit on one page. Root scroll stayed zero, and the content pane's scroll height equalled its 410-pixel client height.
- Captions On survived a cold app restart. Scrolling Off and Small video text were preserved throughout testing.
- On the physical Google TV Streamer, the final APK showed English captions around 31 seconds in `gM95HHI4gLk` with On. After remote Back, switching Off in Settings, and reopening the same video, the same passage had no captions. No caption state was changed through the debugger during this final comparison.
- Testing found that `cc_load_policy=0` alone kept captions enabled by YouTube's preference. The implementation also clears the active track after the caption API becomes available. The live player advertises this option, but it is not a documented stable API; the code checks its availability and the README records the maintenance limitation.
- The fullscreen host still contains zero app buttons. Remote Back returns to browsing. The Streamer was left on Settings with Captions Off and the toggle focused.
- Offline build, Android lint, JavaScript syntax validation, and all four focused tests passed. Installed APK matched SHA-256 `e9c637a178792e271f1a56b0e0bd7a16bcb05bdc44b2303d0730e7b49f6ea88f`.


# Native playback option, version 0.3.12, 2026-11-07

- Christophe confirmed that the Salman Khan comparison video was synchronized in native YouTube. The built-in player's audio remained behind the picture, including during a temporary Web Audio experiment. That experiment was discarded and is not part of this build.
- The default Player setting is now YouTube, with Built-in available as an explicit alternative. This avoids the affected WebView playback path; it does not claim to repair WebView's audio clock.
- On the physical Streamer, remote OK switched both player choices, persisted the selection, and retained focus. Both YouTube and Built-in survived cold app restarts. Scrolling Off, Small text, and the saved caption preference were preserved.
- Six Settings cards fit on one page with zero root scroll. Content scroll height equalled the 410-pixel client height. The caption setting is explicitly labelled Built-in captions and explains that native YouTube has its own caption settings.
- With Built-in selected, Play fullscreen opened `PlayerActivity`, played the requested video, and remote Back returned to the watch page. With YouTube selected, remote OK on Play in YouTube opened `com.google.android.youtube.tv`; its active media session identified the correct Salman Khan video and reported PLAYING.
- Native YouTube owns its controls, caption settings, and Back navigation. Back opened YouTube's own screens. Reopening HackerTube restored the same watch page with Play focused. Direct one-press Back to browsing remains specific to the built-in player.
- The no-YouTube installation fallback is implemented but was not exercised by removing or disabling the installed app.
- Offline build, Android lint, JavaScript syntax checking, and all four focused tests passed. Installed APK matched SHA-256 `36cfcd5475cd0b22adbce692f448263ddc8a952489e65cad51c40346db204a88`. The Streamer was left on Settings with YouTube selected.
