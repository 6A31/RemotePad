import { DEFAULT_PORT, parseHostInfo, type HostInfo } from "@remotepad/protocol";

export async function fetchHostInfo(baseUrl = ""): Promise<HostInfo | null> {
  try {
    const res = await fetch(`${baseUrl}/api/info`);
    if (!res.ok) return null;
    return parseHostInfo(await res.json());
  } catch {
    return null;
  }
}

export function currentOrigin(): string {
  return window.location.origin;
}

export function hostLabel(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
}

export function normalizeOrigin(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).origin;
    } catch {
      return null;
    }
  }

  const withPort = trimmed.includes(":") ? trimmed : `${trimmed}:${DEFAULT_PORT}`;
  try {
    return new URL(`http://${withPort}`).origin;
  } catch {
    return null;
  }
}
