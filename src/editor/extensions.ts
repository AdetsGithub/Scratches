import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  keymap,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { syntaxTree, HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorSelection, Prec, type Extension, type Range } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { tags } from "@lezer/highlight";
import { GFM } from "@lezer/markdown";
import { openUrl } from "@tauri-apps/plugin-opener";

class CheckboxWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly from: number,
    readonly to: number,
  ) {
    super();
  }

  eq(other: CheckboxWidget) {
    return this.checked === other.checked && this.from === other.from && this.to === other.to;
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement("span");
    wrap.className = "cm-checkbox-widget";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = this.checked;
    box.setAttribute("aria-label", "Toggle task");
    box.addEventListener("mousedown", (e) => e.preventDefault());
    box.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const next = this.checked ? "[ ]" : "[x]";
      view.dispatch({
        changes: { from: this.from, to: this.to, insert: next },
      });
    });
    wrap.appendChild(box);
    return wrap;
  }

  ignoreEvent() {
    return false;
  }
}

function selectionOverlaps(view: EditorView, from: number, to: number): boolean {
  for (const range of view.state.selection.ranges) {
    if (range.from <= to && range.to >= from) return true;
  }
  return false;
}

function hideOrMark(builder: Range<Decoration>[], from: number, to: number, reveal: boolean) {
  if (from >= to) return;
  if (reveal) {
    builder.push(Decoration.mark({ class: "cm-md-mark" }).range(from, to));
  } else {
    builder.push(Decoration.replace({}).range(from, to));
  }
}

function styleInner(
  builder: Range<Decoration>[],
  from: number,
  to: number,
  marks: { from: number; to: number }[],
  className: string,
  reveal: boolean,
) {
  for (const mark of marks) hideOrMark(builder, mark.from, mark.to, reveal);
  let cursor = from;
  const sorted = [...marks].sort((a, b) => a.from - b.from);
  for (const mark of sorted) {
    if (cursor < mark.from) {
      builder.push(Decoration.mark({ class: className }).range(cursor, mark.from));
    }
    cursor = Math.max(cursor, mark.to);
  }
  if (cursor < to) {
    builder.push(Decoration.mark({ class: className }).range(cursor, to));
  }
}

function buildLivePreviewDecorations(view: EditorView): DecorationSet {
  const widgets: Range<Decoration>[] = [];
  const tree = syntaxTree(view.state);

  tree.iterate({
    enter(node) {
      const name = node.name;
      const from = node.from;
      const to = node.to;
      const reveal = selectionOverlaps(view, from, to);

      if (
        name === "ATXHeading1" ||
        name === "ATXHeading2" ||
        name === "ATXHeading3" ||
        name === "ATXHeading4" ||
        name === "ATXHeading5" ||
        name === "ATXHeading6"
      ) {
        const level = Number(name.slice(-1));
        const mark = node.node.getChild("HeaderMark");
        if (mark) {
          const spaceEnd = Math.min(mark.to + (view.state.doc.sliceString(mark.to, mark.to + 1) === " " ? 1 : 0), to);
          hideOrMark(widgets, mark.from, spaceEnd, reveal);
          if (spaceEnd < to) {
            widgets.push(Decoration.mark({ class: `cm-md-h${level}` }).range(spaceEnd, to));
          }
        } else {
          widgets.push(Decoration.mark({ class: `cm-md-h${level}` }).range(from, to));
        }
        return;
      }

      if (name === "StrongEmphasis") {
        styleInner(widgets, from, to, node.node.getChildren("EmphasisMark"), "cm-md-strong", reveal);
        return;
      }

      if (name === "Emphasis") {
        styleInner(widgets, from, to, node.node.getChildren("EmphasisMark"), "cm-md-emphasis", reveal);
        return;
      }

      if (name === "Strikethrough") {
        styleInner(
          widgets,
          from,
          to,
          node.node.getChildren("StrikethroughMark"),
          "cm-md-strikethrough",
          reveal,
        );
        return;
      }

      if (name === "InlineCode") {
        styleInner(widgets, from, to, node.node.getChildren("CodeMark"), "cm-md-inline-code", reveal);
        return;
      }

      if (name === "Blockquote") {
        const marks = node.node.getChildren("QuoteMark");
        for (const child of marks) {
          hideOrMark(widgets, child.from, child.to, reveal);
        }
        // Style non-mark segments only to avoid overlapping replace ranges.
        let cursor = from;
        for (const child of [...marks].sort((a, b) => a.from - b.from)) {
          if (cursor < child.from) {
            widgets.push(Decoration.mark({ class: "cm-md-blockquote" }).range(cursor, child.from));
          }
          cursor = Math.max(cursor, child.to);
        }
        if (cursor < to) {
          widgets.push(Decoration.mark({ class: "cm-md-blockquote" }).range(cursor, to));
        }
        return;
      }

      if (name === "FencedCode") {
        const marks = node.node.getChildren("CodeMark");
        const info = node.node.getChild("CodeInfo");
        const hideRanges = [...marks];
        if (info) hideRanges.push(info);
        styleInner(widgets, from, to, hideRanges, "cm-md-codeblock", reveal);
        return;
      }

      if (name === "Link") {
        const marks = node.node.getChildren("LinkMark");
        const url = node.node.getChild("URL");
        const hideRanges = [...marks];
        if (url) hideRanges.push(url);
        styleInner(widgets, from, to, hideRanges, "cm-md-link", reveal);
        return;
      }

      if (name === "TaskMarker") {
        const text = view.state.doc.sliceString(from, to);
        const match = text.match(/^\[([ xX])\]$/);
        if (match) {
          const checked = match[1].toLowerCase() === "x";
          if (!reveal) {
            widgets.push(
              Decoration.replace({
                widget: new CheckboxWidget(checked, from, to),
              }).range(from, to),
            );
          } else {
            widgets.push(Decoration.mark({ class: "cm-md-mark" }).range(from, to));
          }
          if (checked) {
            const parent = node.node.parent;
            if (parent && to < parent.to) {
              widgets.push(Decoration.mark({ class: "cm-task-done" }).range(to, parent.to));
            }
          }
        }
        return;
      }

      if (name === "ListMark") {
        widgets.push(Decoration.mark({ class: "cm-md-list-mark" }).range(from, to));
      }
    },
  });

  return Decoration.set(widgets, true);
}

const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildLivePreviewDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildLivePreviewDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

const listContinueKeymap = Prec.high(
  keymap.of([
    {
      key: "Enter",
      run(view) {
        const { state } = view;
        const pos = state.selection.main.head;
        const line = state.doc.lineAt(pos);
        const text = line.text;

        const taskMatch = text.match(/^(\s*)([-*+])\s+\[([ xX])\]\s+(.*)$/);
        if (taskMatch) {
          const [, indent, bullet, , content] = taskMatch;
          if (!content.trim()) {
            view.dispatch({
              changes: { from: line.from, to: line.to, insert: "" },
              selection: EditorSelection.cursor(line.from),
            });
            return true;
          }
          const insert = `\n${indent}${bullet} [ ] `;
          view.dispatch({
            changes: { from: pos, to: pos, insert },
            selection: EditorSelection.cursor(pos + insert.length),
          });
          return true;
        }

        const listMatch = text.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if (listMatch) {
          const [, indent, marker, content] = listMatch;
          if (!content.trim()) {
            view.dispatch({
              changes: { from: line.from, to: line.to, insert: "" },
              selection: EditorSelection.cursor(line.from),
            });
            return true;
          }
          let nextMarker = marker;
          const numbered = marker.match(/^(\d+)([.)])$/);
          if (numbered) {
            nextMarker = `${Number(numbered[1]) + 1}${numbered[2]}`;
          }
          const insert = `\n${indent}${nextMarker} `;
          view.dispatch({
            changes: { from: pos, to: pos, insert },
            selection: EditorSelection.cursor(pos + insert.length),
          });
          return true;
        }

        return false;
      },
    },
  ]),
);

const linkClickHandler = EditorView.domEventHandlers({
  click(event, view) {
    const meta = event.metaKey || event.ctrlKey;
    if (!meta) return false;
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos == null) return false;
    const tree = syntaxTree(view.state);
    let current = tree.resolveInner(pos, 1) as {
      name: string;
      getChild: (type: string) => { from: number; to: number } | null;
      parent: typeof current | null;
    } | null;
    while (current) {
      if (current.name === "Link") {
        const urlNode = current.getChild("URL");
        if (urlNode) {
          const url = view.state.doc.sliceString(urlNode.from, urlNode.to);
          void openUrl(url).catch(() => {
            window.open(url, "_blank", "noopener,noreferrer");
          });
          return true;
        }
      }
      current = current.parent;
    }
    return false;
  },
});

const markdownHighlightStyle = HighlightStyle.define([
  { tag: tags.heading, fontWeight: "bold" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.link, color: "var(--accent)" },
  { tag: tags.monospace, fontFamily: "var(--font-mono)" },
  { tag: tags.comment, color: "var(--text-muted)" },
  { tag: tags.keyword, color: "#0f766e" },
  { tag: tags.string, color: "#b45309" },
  { tag: tags.number, color: "#0369a1" },
]);

const baseTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    color: "var(--text)",
  },
  ".cm-content": {
    caretColor: "var(--accent)",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "var(--accent)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "color-mix(in srgb, var(--accent) 28%, transparent)",
  },
});

export function createEditorExtensions(): Extension[] {
  return [
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    listContinueKeymap,
    markdown({ codeLanguages: languages, extensions: [GFM] }),
    syntaxHighlighting(markdownHighlightStyle),
    livePreviewPlugin,
    linkClickHandler,
    baseTheme,
    EditorView.lineWrapping,
  ];
}
