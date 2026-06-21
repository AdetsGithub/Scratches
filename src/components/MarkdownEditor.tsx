import { useEffect, useMemo, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { createEditorExtensions } from "../editor/extensions";

interface MarkdownEditorProps {
  tabId: string;
  content: string;
  onChange: (content: string) => void;
}

export function MarkdownEditor({ tabId, content, onChange }: MarkdownEditorProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const extensions = useMemo(() => createEditorExtensions(), []);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!parentRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: content,
      extensions: [...extensions, updateListener],
    });

    const view = new EditorView({
      state,
      parent: parentRef.current,
    });
    viewRef.current = view;
    view.focus();

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Remount when switching tabs so each scratch keeps independent undo/history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId, extensions]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content },
      });
    }
  }, [content, tabId]);

  return <div ref={parentRef} className="h-full w-full overflow-hidden" />;
}
