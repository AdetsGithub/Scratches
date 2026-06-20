# Product Specification: Scratches

**Application Type:** Cross-Platform Desktop Application (Standalone Executable)

---

## 1. Executive Summary

**Scratches** is a lightweight, high-speed desktop scratchpad designed for rapid note-taking, temporary task tracking, code snippets, and clipboard storage. It combines the seamless live Markdown rendering of Obsidian's "Live Preview" mode with a browser-style tabbed layout for fluid context switching.

### Core Philosophy

* **Instant Startup:** Opens immediately without splash screens or indexing lag.
* **Frictionless Capture:** Zero setup required to start typing.
* **Visual Clarity:** Markdown elements format inline as you type, keeping the interface uncluttered.
* **Local-First:** All notes reside on the local filesystem as standard Markdown files or unified application state.

---

## 2. Recommended Technology Stack

| Layer | Primary Recommendation | Alternative Option | Rationale |
| --- | --- | --- | --- |
| **Framework** | **Tauri (v2)** | Electron | Native performance, minimal memory footprint (~30–50 MB RAM vs Electron's 200+ MB), builds small standalone binaries. |
| **Frontend UI** | React + TypeScript | Svelte / Vue | Large ecosystem for tab managers and rich-text editors. |
| **Markdown Engine** | CodeMirror 6 + `@codemirror/lang-markdown` | Milkdown / TipTap | CodeMirror 6 provides state-of-the-art live Markdown syntax highlighting and inline replacement parsing. |
| **Styling** | Tailwind CSS | CSS Modules | Fast creation of dark/light modern tabbed interfaces. |
| **Iconography** | Lucide Icons | Heroicons | Clean, lightweight UI icons for close buttons, settings, and tab management. |

---

## 3. Core Functional Requirements

### 3.1 Live Markdown Editor Engine

* **Hybrid/WYSIWYG View Mode:**
* Renders formatting (headings, bold, italics, checklists, blockquotes, code blocks) in place.
* When the text cursor enters a formatted element, the underlying Markdown syntax (e.g., `##`, `**`, ```) is revealed for precise editing.
* When the cursor exits, the text converts back to formatted visual rich text.


* **Supported Elements:**
* Headings (H1 through H6)
* Bold (`**bold**`), Italic (`*italic*`), Strikethrough (`~~text~~`)
* Interactive Checklists (`- [ ] task`, `- [x] completed`)
* Fenced Code Blocks with language syntax highlighting
* Inline Code (`code`)
* Hyperlinks (`[Title](URL)`) clickable via `Cmd/Ctrl + Click`
* Ordered and Unordered Lists


* **Auto-Formatting Triggers:**
* Hitting `Enter` inside a list or checklist creates a new item automatically.
* Hitting `Space` after `- [ ]` creates an interactive checkbox.



### 3.2 Tabbed Navigation System

* **Tab Operations:**
* **Create:** `Cmd/Ctrl + T` or click the `+` button in the tab bar creates a new scratch tab.
* **Close:** `Cmd/Ctrl + W` or click the `x` icon on the tab closes the active tab.
* **Rename:** Double-click the tab header to edit its display name directly inline.
* **Reorder:** Drag-and-drop tabs horizontally to resequence.
* **Switching:** `Cmd/Ctrl + [1-9]` switches to the corresponding tab; `Ctrl + Tab` cycles through tabs.


* **Default Tab Naming:**
* New tabs default to `Scratch 1`, `Scratch 2`, etc., or derive their name automatically from the first non-empty heading/line of text.



### 3.3 State Persistence & Data Storage

* **Auto-Save:**
* Changes save continuously on every keystroke or debounced by 300 ms. No manual saving required.


* **Storage Modes:**
* **App State Storage (Default):** Stores scratch contents and tab configurations in a local SQLite database or JSON file inside the user application data directory (`%APPDATA%` on Windows, `~/Library/Application Support` on macOS).
* **Export/Save As:** Users can export any scratch tab as a standard `.md` file to any directory.



---

## 4. Interface & User Experience Design

```
+-----------------------------------------------------------------------+
|  [ Scratch 1 x ]  [ Code Snippets x ]  [ Today's Todo x ]  [ + ]      |
+-----------------------------------------------------------------------+
|                                                                       |
|  # Today's Todo                                                       |
|                                                                       |
|  - [x] Fix login endpoint bug                                         |
|  - [ ] Refactor tab manager logic                                     |
|                                                                       |
|  ```ts                                                                |
|  const scratch = new Scratchpad({ livePreview: true });               |
|  ```                                                                  |
|                                                                       |
+-----------------------------------------------------------------------+
|  Tabs: 3 | Words: 42 | Saved                                          |
+-----------------------------------------------------------------------+

```

### Key UI Elements

1. **Top Bar:** Sleek, minimal tab bar styled natively to fit macOS / Windows window frames.
2. **Editor Canvas:** Max-width padded editing region with generous line height and clear typography.
3. **Status Bar (Optional/Collapsible):** Displays tab count, word/character count, and auto-save status.

---

## 5. Keyboard Shortcuts Specification

| Action | macOS Shortcut | Windows / Linux Shortcut |
| --- | --- | --- |
| New Scratch Tab | `Cmd + T` | `Ctrl + T` |
| Close Active Tab | `Cmd + W` | `Ctrl + W` |
| Next / Previous Tab | `Cmd + Shift + ]` / `[` | `Ctrl + Tab` / `Ctrl + Shift + Tab` |
| Jump to Tab 1-9 | `Cmd + 1` through `9` | `Ctrl + 1` through `9` |
| Clear Scratch Content | `Cmd + Shift + K` | `Ctrl + Shift + K` |
| Toggle Dark/Light Theme | `Cmd + Shift + L` | `Ctrl + Shift + L` |

---

## 6. Non-Functional Requirements

* **Launch Time:** Cold start under **500 ms**.
* **Memory Footprint:** Idle RAM consumption under **60 MB**.
* **Binary Size:** Portable standalone executable build size under **15 MB** (using Tauri).
* **Cross-Platform:** Single codebase compiling to Windows `.exe` / installer, macOS `.app` / `.dmg`, and Linux AppImage.

---

## 7. Packaging & Distribution Requirements

1. **Executable Generation:**
* Single-file executable (or installer package) generated via automated build pipelines.


2. **Auto-Updater (Phase 2):**
* Background version checking via GitHub releases or custom update server.


3. **System Tray Options:**
* Option to keep application minimized in the system tray / menu bar for instant invocation via a global hotkey (`Ctrl + Alt + `s`) - ensure that any hotkeys used don't conflict with existing/system hotkeys.
