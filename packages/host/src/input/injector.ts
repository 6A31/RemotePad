import {
  Button,
  Key,
  keyboard,
  mouse,
  Point,
} from "@nut-tree-fork/nut-js";
import type { MouseButton } from "@remotepad/protocol";
import { getPrimaryMonitorInfo } from "../capture/monitor-info.js";

mouse.config.mouseSpeed = 2000;

const KEY_MAP: Record<string, Key> = {
  w: Key.W,
  a: Key.A,
  s: Key.S,
  d: Key.D,
  space: Key.Space,
  enter: Key.Enter,
  escape: Key.Escape,
  shift: Key.LeftShift,
  ctrl: Key.LeftControl,
  alt: Key.LeftAlt,
  tab: Key.Tab,
  up: Key.Up,
  down: Key.Down,
  left: Key.Left,
  right: Key.Right,
  backspace: Key.Backspace,
  delete: Key.Delete,
  home: Key.Home,
  end: Key.End,
  pageup: Key.PageUp,
  pagedown: Key.PageDown,
  insert: Key.Insert,
  minus: Key.Minus,
  equal: Key.Equal,
  comma: Key.Comma,
  period: Key.Period,
  slash: Key.Slash,
  semicolon: Key.Semicolon,
  quote: Key.Quote,
  backslash: Key.Backslash,
  leftbracket: Key.LeftBracket,
  rightbracket: Key.RightBracket,
  grave: Key.Grave,
};

const heldKeys = new Set<Key>();

function toButton(button: MouseButton): Button {
  switch (button) {
    case "right":
      return Button.RIGHT;
    case "middle":
      return Button.MIDDLE;
    default:
      return Button.LEFT;
  }
}

function resolveKey(key: string): Key | null {
  const normalized = key.toLowerCase();
  if (KEY_MAP[normalized]) {
    return KEY_MAP[normalized];
  }
  if (normalized.length === 1 && normalized >= "0" && normalized <= "9") {
    return (Key as unknown as Record<string, Key>)[`Num${normalized}`] ?? null;
  }
  if (normalized.length === 1) {
    const upper = normalized.toUpperCase();
    const enumKey = (Key as unknown as Record<string, Key>)[upper];
    if (enumKey) return enumKey;
  }
  return null;
}

export async function moveMouseRelative(dx: number, dy: number): Promise<void> {
  const pos = await mouse.getPosition();
  await mouse.setPosition(new Point(pos.x + dx, pos.y + dy));
}

export async function moveMouseAbsolute(x: number, y: number): Promise<void> {
  const monitor = getPrimaryMonitorInfo();
  await mouse.setPosition(
    new Point(monitor.originX + Math.round(x), monitor.originY + Math.round(y)),
  );
}

export async function mouseDown(button: MouseButton): Promise<void> {
  await mouse.pressButton(toButton(button));
}

export async function mouseUp(button: MouseButton): Promise<void> {
  await mouse.releaseButton(toButton(button));
}

export async function mouseClick(button: MouseButton): Promise<void> {
  await mouse.click(toButton(button));
}

const SCROLL_PIXELS_PER_STEP = 12;

export async function scrollMouse(dx: number, dy: number): Promise<void> {
  const stepsY = Math.round(Math.abs(dy) / SCROLL_PIXELS_PER_STEP);
  const stepsX = Math.round(Math.abs(dx) / SCROLL_PIXELS_PER_STEP);

  if (stepsY >= 1) {
    if (dy > 0) await mouse.scrollDown(stepsY);
    else await mouse.scrollUp(stepsY);
  }
  if (stepsX >= 1) {
    if (dx > 0) await mouse.scrollRight(stepsX);
    else await mouse.scrollLeft(stepsX);
  }
}

export async function keyDown(key: string): Promise<void> {
  const resolved = resolveKey(key);
  if (!resolved || heldKeys.has(resolved)) return;
  heldKeys.add(resolved);
  await keyboard.pressKey(resolved);
}

export async function keyUp(key: string): Promise<void> {
  const resolved = resolveKey(key);
  if (!resolved || !heldKeys.has(resolved)) return;
  heldKeys.delete(resolved);
  await keyboard.releaseKey(resolved);
}

export async function releaseAllKeys(): Promise<void> {
  for (const key of [...heldKeys]) {
    await keyboard.releaseKey(key);
    heldKeys.delete(key);
  }
}
