import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import type { ScratchTab } from "../types";

interface TabBarProps {
  tabs: ScratchTab[];
  activeTabId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function TabBar({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onCreate,
  onRename,
  onReorder,
}: TabBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function startRename(tab: ScratchTab) {
    setEditingId(tab.id);
    setDraft(tab.title);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function commitRename(id: string) {
    const next = draft.trim();
    if (next) onRename(id, next);
    setEditingId(null);
  }

  function onDragStart(index: number) {
    setDragIndex(index);
  }

  function onDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    onReorder(dragIndex, index);
    setDragIndex(index);
  }

  function onDragEnd() {
    setDragIndex(null);
  }

  function onRenameKey(e: KeyboardEvent<HTMLInputElement>, id: string) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename(id);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  }

  return (
    <div className="flex items-stretch gap-1 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-2 pt-2">
      <div className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto">
        {tabs.map((tab, index) => {
          const active = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              draggable={editingId !== tab.id}
              onDragStart={() => onDragStart(index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDragEnd={onDragEnd}
              onClick={() => onSelect(tab.id)}
              onDoubleClick={() => startRename(tab)}
              className={[
                "group relative flex max-w-[14rem] min-w-[7rem] cursor-pointer items-center gap-1 rounded-t-lg border border-b-0 px-3 py-1.5 text-sm transition-colors",
                active
                  ? "border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                  : "border-transparent bg-transparent text-[var(--text-muted)] hover:bg-[var(--bg-muted)]",
              ].join(" ")}
            >
              {editingId === tab.id ? (
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commitRename(tab.id)}
                  onKeyDown={(e) => onRenameKey(e, tab.id)}
                  className="w-full bg-transparent text-sm outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate">{tab.title}</span>
              )}
              <button
                type="button"
                aria-label={`Close ${tab.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                className="ml-auto rounded p-0.5 text-[var(--text-muted)] opacity-0 transition-opacity hover:bg-[var(--bg-muted)] hover:text-[var(--danger)] group-hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="New scratch"
        onClick={onCreate}
        className="mb-1 flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)]"
      >
        <Plus size={18} />
      </button>
    </div>
  );
}
