import { Store } from "@tauri-apps/plugin-store";
import type { AppPersistedState, ScratchTab } from "../types";

const STORE_FILE = "scratches-state.json";
const STORE_KEY = "app";
const LOCAL_KEY = "scratches:app-state";

export function createTab(index: number, content = ""): ScratchTab {
  return {
    id: crypto.randomUUID(),
    title: `Scratch ${index}`,
    content,
    autoTitle: true,
  };
}

export function defaultState(): AppPersistedState {
  const tab = createTab(1, "# Welcome to Scratches\n\nStart typing — Markdown formats as you go.\n\n- [ ] Capture a thought\n- [x] Open Scratches\n\n");
  return {
    version: 1,
    tabs: [tab],
    activeTabId: tab.id,
    theme: "light",
    statusBarVisible: true,
  };
}

export function deriveTitle(content: string, fallback: string): string {
  const lines = content.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) return truncate(heading[1].trim(), 40);
    const task = line.match(/^[-*+]\s+\[[ xX]\]\s+(.+)$/);
    if (task) return truncate(task[1].trim(), 40);
    const list = line.match(/^[-*+]\s+(.+)$/);
    if (list) return truncate(list[1].trim(), 40);
    return truncate(line.replace(/[*_`~\[\]]/g, ""), 40) || fallback;
  }
  return fallback;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function isValidState(value: unknown): value is AppPersistedState {
  if (!value || typeof value !== "object") return false;
  const s = value as AppPersistedState;
  return (
    s.version === 1 &&
    Array.isArray(s.tabs) &&
    s.tabs.length > 0 &&
    typeof s.activeTabId === "string" &&
    (s.theme === "light" || s.theme === "dark")
  );
}

async function getStore(): Promise<Store | null> {
  try {
    return await Store.load(STORE_FILE);
  } catch {
    return null;
  }
}

export async function loadState(): Promise<AppPersistedState> {
  try {
    const store = await getStore();
    if (store) {
      const value = await store.get<AppPersistedState>(STORE_KEY);
      if (isValidState(value)) return value;
    }
  } catch {
    // fall through to localStorage
  }

  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isValidState(parsed)) return parsed;
    }
  } catch {
    // ignore
  }

  return defaultState();
}

export async function saveState(state: AppPersistedState): Promise<void> {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  try {
    const store = await getStore();
    if (store) {
      await store.set(STORE_KEY, state);
      await store.save();
    }
  } catch {
    // localStorage already written
  }
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function countChars(text: string): number {
  return text.length;
}
