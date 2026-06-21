import { Download, PanelBottom } from "lucide-react";
import type { SaveStatus } from "../types";

interface StatusBarProps {
  tabCount: number;
  words: number;
  chars: number;
  saveStatus: SaveStatus;
  visible: boolean;
  onToggle: () => void;
  onExport: () => void;
}

export function StatusBar({
  tabCount,
  words,
  chars,
  saveStatus,
  visible,
  onToggle,
  onExport,
}: StatusBarProps) {
  if (!visible) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="absolute bottom-2 right-2 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] p-1.5 text-[var(--text-muted)] shadow-sm hover:text-[var(--text)]"
        aria-label="Show status bar"
      >
        <PanelBottom size={16} />
      </button>
    );
  }

  const statusLabel =
    saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Ready";

  return (
    <div className="flex items-center gap-4 border-t border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs text-[var(--text-muted)]">
      <span>Tabs: {tabCount}</span>
      <span>Words: {words}</span>
      <span>Chars: {chars}</span>
      <span className="ml-auto flex items-center gap-1">
        <span
          className={[
            "inline-block h-1.5 w-1.5 rounded-full",
            saveStatus === "saving" ? "bg-amber-500" : "bg-teal-600",
          ].join(" ")}
        />
        {statusLabel}
      </span>
      <button
        type="button"
        onClick={onExport}
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-[var(--bg-muted)] hover:text-[var(--text)]"
      >
        <Download size={12} />
        Export
      </button>
      <button
        type="button"
        onClick={onToggle}
        className="rounded px-1.5 py-0.5 hover:bg-[var(--bg-muted)] hover:text-[var(--text)]"
        aria-label="Hide status bar"
      >
        Hide
      </button>
    </div>
  );
}
