const STORAGE_KEY = "remotepad-mobile-screen-preview";

export function getStoredMobileScreenPreview(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function storeMobileScreenPreview(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // ignore
  }
}
