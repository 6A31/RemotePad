export type MouseMode = "absolute" | "relative";

const STORAGE_KEY = "remotepad_mouse_mode";

export function getStoredMouseMode(): MouseMode {
  const value = sessionStorage.getItem(STORAGE_KEY);
  return value === "relative" ? "relative" : "absolute";
}

export function storeMouseMode(mode: MouseMode): void {
  sessionStorage.setItem(STORAGE_KEY, mode);
}
