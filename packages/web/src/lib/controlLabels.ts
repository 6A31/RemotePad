import type { StreamQuality } from "@remotepad/protocol";
import type { MouseMode } from "./mouseMode";
import type { ViewMode } from "../App";

export const MOUSE_MODE_OPTIONS: {
  value: MouseMode;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    value: "absolute",
    label: "Work",
    shortLabel: "Work",
    description: "Move the pointer on screen (apps, browser, desktop)",
  },
  {
    value: "relative",
    label: "Game",
    shortLabel: "Game",
    description: "Swipe to look around (first-person and camera games)",
  },
];

export const QUALITY_OPTIONS: { value: StreamQuality; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function layoutSwitchTarget(current: ViewMode): ViewMode {
  return current === "mobile" ? "desktop" : "mobile";
}

export function layoutSwitchLabel(current: ViewMode): string {
  return current === "mobile" ? "Screen view" : "Touch controls";
}

export function layoutSwitchDescription(current: ViewMode): string {
  return current === "mobile"
    ? "Full-screen stream with keyboard and mouse"
    : "WASD and touchpad on your phone";
}
