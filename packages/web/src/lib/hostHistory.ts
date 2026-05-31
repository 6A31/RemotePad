import { DEFAULT_PORT } from "@remotepad/protocol";

const STORAGE_KEY = "remotepad_host_history";
const MAX_ENTRIES = 12;

export interface SavedHost {
  origin: string;
  hostname: string;
  lastSeen: number;
}

function readAll(): SavedHost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedHost[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries: SavedHost[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function rememberHost(origin: string, hostname: string): void {
  const now = Date.now();
  const existing = readAll().filter((entry) => entry.origin !== origin);
  const updated: SavedHost[] = [
    { origin, hostname, lastSeen: now },
    ...existing,
  ].slice(0, MAX_ENTRIES);
  writeAll(updated);
}

export function listRecentHosts(currentOrigin: string): SavedHost[] {
  return readAll()
    .filter((entry) => entry.origin !== currentOrigin)
    .sort((a, b) => b.lastSeen - a.lastSeen);
}

export function removeHost(origin: string): void {
  writeAll(readAll().filter((entry) => entry.origin !== origin));
}

export function formatSavedHostAddress(origin: string): string {
  try {
    const url = new URL(origin);
    if (url.port) return url.host;
    return `${url.hostname}:${DEFAULT_PORT}`;
  } catch {
    return origin;
  }
}
