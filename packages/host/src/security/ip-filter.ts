export function normalizeIp(ip: string): string {
  if (ip.startsWith("::ffff:")) {
    return ip.slice(7);
  }
  return ip;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    value = (value << 8) + n;
  }
  return value >>> 0;
}

function inRange(value: number, start: number, end: number): boolean {
  return value >= start && value <= end;
}

export function isPrivateOrLocalIp(rawIp: string): boolean {
  const ip = normalizeIp(rawIp);

  if (ip === "::1" || ip === "localhost") {
    return true;
  }

  if (ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) {
    return true;
  }

  const value = ipv4ToInt(ip);
  if (value === null) {
    return false;
  }

  return (
    inRange(value, 0x7f000000, 0x7fffffff) ||
    inRange(value, 0x0a000000, 0x0affffff) ||
    inRange(value, 0xac100000, 0xac1fffff) ||
    inRange(value, 0xc0a80000, 0xc0a8ffff) ||
    inRange(value, 0xa9fe0000, 0xa9feffff)
  );
}

export function rejectReason(ip: string): string {
  return `Blocked connection from ${ip}`;
}
