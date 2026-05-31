const STORAGE_KEY = "remotepad_mouse_sensitivity";
export const DEFAULT_MOUSE_SENSITIVITY = 1.5;
export const MIN_MOUSE_SENSITIVITY = 0.5;
export const MAX_MOUSE_SENSITIVITY = 4;

export function getStoredMouseSensitivity(): number {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_MOUSE_SENSITIVITY;
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return DEFAULT_MOUSE_SENSITIVITY;
  return Math.min(MAX_MOUSE_SENSITIVITY, Math.max(MIN_MOUSE_SENSITIVITY, value));
}

export function storeMouseSensitivity(value: number): void {
  sessionStorage.setItem(STORAGE_KEY, String(value));
}
