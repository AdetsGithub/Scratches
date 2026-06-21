import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import type { ScratchTab } from "../types";

export async function exportTabAsMarkdown(tab: ScratchTab): Promise<boolean> {
  const suggested = `${sanitizeFilename(tab.title)}.md`;
  const path = await save({
    defaultPath: suggested,
    filters: [{ name: "Markdown", extensions: ["md"] }],
  });
  if (!path) return false;
  await writeTextFile(path, tab.content);
  return true;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").trim() || "scratch";
}
