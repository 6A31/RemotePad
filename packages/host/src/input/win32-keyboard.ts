import koffi from "koffi";

const INPUT_KEYBOARD = 1;
const KEYEVENTF_KEYUP = 0x0002;
const INPUT_SIZE = 40;

let sendInput: ((count: number, inputs: Buffer, size: number) => number) | null = null;

function getSendInput(): ((count: number, inputs: Buffer, size: number) => number) | null {
  if (process.platform !== "win32") return null;
  if (!sendInput) {
    const user32 = koffi.load("user32.dll");
    sendInput = user32.func("unsigned int SendInput(unsigned int cInputs, void *pInputs, int cbSize)");
  }
  return sendInput;
}

const VK: Record<string, number> = {
  w: 0x57,
  a: 0x41,
  s: 0x53,
  d: 0x44,
  space: 0x20,
  enter: 0x0d,
  escape: 0x1b,
  shift: 0xa0,
  ctrl: 0xa2,
  alt: 0xa4,
  tab: 0x09,
  up: 0x26,
  down: 0x28,
  left: 0x25,
  right: 0x27,
  backspace: 0x08,
  delete: 0x2e,
  home: 0x24,
  end: 0x23,
  pageup: 0x21,
  pagedown: 0x22,
  insert: 0x2d,
  minus: 0xbd,
  equal: 0xbb,
  comma: 0xbc,
  period: 0xbe,
  slash: 0xbf,
  semicolon: 0xba,
  quote: 0xde,
  backslash: 0xdc,
  leftbracket: 0xdb,
  rightbracket: 0xdd,
  grave: 0xc0,
};

export function resolveKeyToVk(key: string): number | null {
  const normalized = key.toLowerCase();
  if (VK[normalized] !== undefined) {
    return VK[normalized];
  }
  if (normalized.length === 1 && normalized >= "0" && normalized <= "9") {
    return normalized.charCodeAt(0);
  }
  if (normalized.length === 1 && normalized >= "a" && normalized <= "z") {
    return normalized.toUpperCase().charCodeAt(0);
  }
  return null;
}

function sendKeyEvent(vk: number, keyUp: boolean): void {
  const inject = getSendInput();
  if (!inject) return;

  const input = Buffer.alloc(INPUT_SIZE);
  input.writeUInt32LE(INPUT_KEYBOARD, 0);
  input.writeUInt16LE(vk, 8);
  input.writeUInt16LE(0, 10);
  input.writeUInt32LE(keyUp ? KEYEVENTF_KEYUP : 0, 12);
  input.writeUInt32LE(0, 16);
  input.writeBigUInt64LE(0n, 24);

  inject(1, input, INPUT_SIZE);
}

export function keyDownWin32(key: string): boolean {
  const vk = resolveKeyToVk(key);
  if (vk === null) return false;
  sendKeyEvent(vk, false);
  return true;
}

export function keyUpWin32(key: string): boolean {
  const vk = resolveKeyToVk(key);
  if (vk === null) return false;
  sendKeyEvent(vk, true);
  return true;
}

export function keyUpVk(vk: number): void {
  sendKeyEvent(vk, true);
}
