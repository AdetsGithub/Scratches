export type ThemeMode = "light" | "dark";

export interface ScratchTab {
  id: string;
  title: string;
  content: string;
  autoTitle: boolean;
}

export interface AppPersistedState {
  version: 1;
  tabs: ScratchTab[];
  activeTabId: string;
  theme: ThemeMode;
  statusBarVisible: boolean;
}

export type SaveStatus = "saved" | "saving" | "idle";
