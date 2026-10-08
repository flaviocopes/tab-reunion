# Tab Reunion

A Chrome extension that moves the tabs of every open window into the current one, from the toolbar button or `Alt+Shift+M`. It's plain JavaScript with no build step.

## Files

- `manifest.json`: Manifest V3. The only permission is `tabGroups`. The shortcut is the `_execute_action` command, so it fires the same `action.onClicked` event as the toolbar button.
- `background.js`: the service worker. `mergeInto(windowId)` walks every other normal window with the same incognito state, moves runs of ungrouped tabs with `chrome.tabs.move`, moves each group whole with `chrome.tabGroups.move`, then re-pins the tabs that were pinned.
- `icons/`: `icon.svg` is the source, and the PNGs are rendered from it.
- `scripts/test.mjs`: loads the extension into Playwright's Chromium and checks a real merge.
- `scripts/build-release.sh`: zips the extension into `dist/Tab-Reunion-<version>.zip`.
- `scripts/banner.html` and `scripts/render-banner.mjs`: the README banner, rendered to `docs/banner.png`.

## Build and run

```sh
npm install                          # Playwright, for the test
npx playwright install chromium      # the browser the test runs in
npm test                             # merges three windows in Chromium and checks the result
node scripts/test.mjs <folder>       # the same test on another copy, like an unzipped release
scripts/build-release.sh             # dist/Tab-Reunion-<version>.zip and its SHA-256
node scripts/render-banner.mjs       # docs/banner.png at 2x
```

To try a change in your own Chrome, open `chrome://extensions`, turn on Developer mode, click **Load unpacked** and pick this folder. After editing, click the reload arrow on the Tab Reunion card.

## Rules

- Run `npm test` after every change to `background.js` or `manifest.json`, and add a check to `scripts/test.mjs` for any new behavior.
- Chrome unpins a tab moved to another window, so keep the re-pinning. Groups move with `chrome.tabGroups.move`, so they keep their name, color and collapsed state.
- Don't add permissions the merge doesn't need. Reading tab URLs or titles would need `tabs`, which shows people a warning at install.
- The version in `manifest.json` must equal the release tag without the `v`. Releases attach the zip from `scripts/build-release.sh`, built from the tagged commit.
- The showreel video lives on flaviocopes.com, not in this repo. A local copy at `/tab-reunion-showreel.mp4` is ignored by git.
