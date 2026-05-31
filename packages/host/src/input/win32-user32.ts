import koffi from "koffi";

export const INPUT_SIZE = 40;

const MAPVK_VK_TO_VSC_EX = 4;

let sendInputFn: ((count: number, inputs: Buffer, size: number) => number) | null = null;
let mapVirtualKeyExFn: ((code: number, mapType: number) => number) | null = null;
let getMessageExtraInfoFn: (() => number | bigint) | null = null;

function loadUser32(): void {
  if (sendInputFn) return;
  const user32 = koffi.load("user32.dll");
  sendInputFn = user32.func("unsigned int SendInput(unsigned int cInputs, void *pInputs, int cbSize)");
  mapVirtualKeyExFn = user32.func("unsigned int MapVirtualKeyW(unsigned int uCode, unsigned int uMapType)");
  getMessageExtraInfoFn = user32.func("intptr_t GetMessageExtraInfo()");
}

export function sendInput(count: number, inputs: Buffer): number {
  if (process.platform !== "win32") return 0;
  loadUser32();
  return sendInputFn!(count, inputs, INPUT_SIZE);
}

export function getMessageExtraInfo(): bigint {
  if (process.platform !== "win32") return 0n;
  loadUser32();
  const raw = getMessageExtraInfoFn!();
  return typeof raw === "bigint" ? raw : BigInt(raw);
}

/** Scan code + extended prefix flag for SendInput KEYEVENTF_SCANCODE. */
export function vkToScanCode(vk: number): { scan: number; extended: boolean } {
  if (process.platform !== "win32") {
    return { scan: 0, extended: false };
  }
  loadUser32();
  const mapped = mapVirtualKeyExFn!(vk, MAPVK_VK_TO_VSC_EX);
  const extended = (mapped >>> 8) === 0xe0;
  return { scan: mapped & 0xff, extended };
}
