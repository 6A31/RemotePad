import type { StreamQuality } from "@remotepad/protocol";

const STORAGE_KEY = "remotepad_stream_quality";

export function getStoredQuality(): StreamQuality {
  const value = sessionStorage.getItem(STORAGE_KEY);
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return "medium";
}

export function storeQuality(quality: StreamQuality): void {
  sessionStorage.setItem(STORAGE_KEY, quality);
}
