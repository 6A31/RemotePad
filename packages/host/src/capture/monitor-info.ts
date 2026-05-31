import { Monitor } from "node-screenshots";

export interface PrimaryMonitorInfo {
  originX: number;
  originY: number;
  inputWidth: number;
  inputHeight: number;
}

let cached: PrimaryMonitorInfo | null = null;

export function getPrimaryMonitorInfo(): PrimaryMonitorInfo {
  if (cached) return cached;

  const monitors = Monitor.all();
  if (monitors.length === 0) {
    throw new Error("No monitors found");
  }

  const monitor = monitors.find((item) => item.isPrimary()) ?? monitors[0];
  const scale = monitor.scaleFactor() || 1;

  cached = {
    originX: monitor.x(),
    originY: monitor.y(),
    inputWidth: Math.round(monitor.width() / scale),
    inputHeight: Math.round(monitor.height() / scale),
  };

  return cached;
}

export function resetPrimaryMonitorInfo(): void {
  cached = null;
}
