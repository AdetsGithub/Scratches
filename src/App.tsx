import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TabBar } from "./components/TabBar";
import { StatusBar } from "./components/StatusBar";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { exportTabAsMarkdown } from "./lib/export";
import {
  countChars,
  countWords,
  createTab,
  deriveTitle,
  loadState,
  saveState,
} from "./lib/storage";
import type { AppPersistedState, SaveStatus, ScratchTab, ThemeMode } from "./types";

function nextScratchIndex(tabs: ScratchTab[]): number {
  const used = new Set(
    tabs
      .map((t) => t.title.match(/^Scratch (\d+)$/))
      .filter(Boolean)
      .map((m) => Number(m![1])),
  );
  let i = 1;
  while (used.has(i)) i += 1;
  return i;
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [tabs, setTabs] = useState<ScratchTab[]>([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [statusBarVisible, setStatusBarVisible] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimer = useRef<number | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    void (async () => {
      const state = await loadState();
      setTabs(state.tabs);
      setActiveTabId(state.activeTabId);
      setTheme(state.theme);
      setStatusBarVisible(state.statusBarVisible);
      applyTheme(state.theme);
      hydrated.current = true;
      setReady(true);
    })();
  }, []);

  const persist = useCallback((next: AppPersistedState) => {
    setSaveStatus("saving");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void saveState(next).then(() => setSaveStatus("saved"));
    }, 300);
  }, []);

  useEffect(() => {
    if (!hydrated.current || !ready) return;
    persist({
      version: 1,
      tabs,
      activeTabId,
      theme,
      statusBarVisible,
    });
  }, [tabs, activeTabId, theme, statusBarVisible, ready, persist]);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? tabs[0],
    [tabs, activeTabId],
  );

  const createScratch = useCallback(() => {
    const tab = createTab(nextScratchIndex(tabs));
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, [tabs]);

  const closeScratch = useCallback(
    (id: string) => {
      setTabs((prev) => {
        if (prev.length === 1) {
          const fresh = createTab(1);
          setActiveTabId(fresh.id);
          return [fresh];
        }
        const index = prev.findIndex((t) => t.id === id);
        const next = prev.filter((t) => t.id !== id);
        if (id === activeTabId) {
          const fallback = next[Math.max(0, index - 1)] ?? next[0];
          setActiveTabId(fallback.id);
        }
        return next;
      });
    },
    [activeTabId],
  );

  const updateContent = useCallback((content: string) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        const title = tab.autoTitle
          ? deriveTitle(content, tab.title.startsWith("Scratch ") ? tab.title : `Scratch`)
          : tab.title;
        return { ...tab, content, title: tab.autoTitle ? title : tab.title };
      }),
    );
  }, [activeTabId]);

  const renameTab = useCallback((id: string, title: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === id ? { ...tab, title, autoTitle: false } : tab)),
    );
  }, []);

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setTabs((prev) => {
      if (fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      applyTheme(next);
      return next;
    });
  }, []);

  const clearActive = useCallback(() => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === activeTabId ? { ...tab, content: "" } : tab)),
    );
  }, [activeTabId]);

  const cycleTab = useCallback(
    (direction: 1 | -1) => {
      if (!tabs.length) return;
      const index = tabs.findIndex((t) => t.id === activeTabId);
      const next = (index + direction + tabs.length) % tabs.length;
      setActiveTabId(tabs[next].id);
    },
    [tabs, activeTabId],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;

      if (event.key.toLowerCase() === "t" && !event.shiftKey) {
        event.preventDefault();
        createScratch();
        return;
      }

      if (event.key.toLowerCase() === "w" && !event.shiftKey) {
        event.preventDefault();
        if (activeTab) closeScratch(activeTab.id);
        return;
      }

      if (event.key.toLowerCase() === "k" && event.shiftKey) {
        event.preventDefault();
        clearActive();
        return;
      }

      if (event.key.toLowerCase() === "l" && event.shiftKey) {
        event.preventDefault();
        toggleTheme();
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        cycleTab(event.shiftKey ? -1 : 1);
        return;
      }

      if (event.code === "BracketRight" && event.shiftKey) {
        event.preventDefault();
        cycleTab(1);
        return;
      }

      if (event.code === "BracketLeft" && event.shiftKey) {
        event.preventDefault();
        cycleTab(-1);
        return;
      }

      if (/^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        if (tabs[index]) {
          event.preventDefault();
          setActiveTabId(tabs[index].id);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTab, clearActive, closeScratch, createScratch, cycleTab, tabs, toggleTheme]);

  async function handleExport() {
    if (!activeTab) return;
    try {
      await exportTabAsMarkdown(activeTab);
    } catch (error) {
      console.error("Export failed", error);
    }
  }

  if (!ready || !activeTab) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
        Loading Scratches…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[var(--bg)] text-[var(--text)]">
      <TabBar
        tabs={tabs}
        activeTabId={activeTab.id}
        onSelect={setActiveTabId}
        onClose={closeScratch}
        onCreate={createScratch}
        onRename={renameTab}
        onReorder={reorderTabs}
      />
      <main className="relative min-h-0 flex-1">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              theme === "dark"
                ? "radial-gradient(ellipse at top, rgba(45,212,191,0.08), transparent 55%)"
                : "radial-gradient(ellipse at top, rgba(15,118,110,0.08), transparent 55%)",
          }}
        />
        <MarkdownEditor
          key={activeTab.id}
          tabId={activeTab.id}
          content={activeTab.content}
          onChange={updateContent}
        />
      </main>
      <StatusBar
        tabCount={tabs.length}
        words={countWords(activeTab.content)}
        chars={countChars(activeTab.content)}
        saveStatus={saveStatus}
        visible={statusBarVisible}
        onToggle={() => setStatusBarVisible((v) => !v)}
        onExport={() => void handleExport()}
      />
    </div>
  );
}
