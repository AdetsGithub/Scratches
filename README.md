# Scratches

Lightweight desktop scratchpad with Obsidian-style live Markdown preview and browser-style tabs.

## Stack

- Tauri v2
- React + TypeScript
- Tailwind CSS v4
- CodeMirror 6 (`@codemirror/lang-markdown`)

## Develop

```bash
npm install
npm run tauri dev
```

Frontend-only (browser):

```bash
npm run dev
```

### Linux prerequisites

Tauri needs WebKitGTK and related packages before `tauri dev` / `tauri build` will link:

```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf pkg-config
```

See https://tauri.app/start/prerequisites/ for other platforms.
## Build

```bash
npm run tauri build
```

Produces platform installers / executables under `src-tauri/target/release/bundle/`.

## Shortcuts

| Action | macOS | Windows / Linux |
| --- | --- | --- |
| New tab | ⌘T | Ctrl+T |
| Close tab | ⌘W | Ctrl+W |
| Jump to tab 1–9 | ⌘1–9 | Ctrl+1–9 |
| Cycle tabs | ⌘⇧]/[ or Ctrl+Tab | Ctrl+Tab / Ctrl+Shift+Tab |
| Clear scratch | ⌘⇧K | Ctrl+Shift+K |
| Toggle theme | ⌘⇧L | Ctrl+Shift+L |

## Notes

- Scratches auto-save (300 ms debounce) via Tauri Store + localStorage fallback.
- Export the active tab as `.md` from the status bar.
- Double-click a tab title to rename; drag tabs to reorder.
