import { getMessageExtraInfo, INPUT_SIZE, sendInput } from "./win32-user32.js";

const INPUT_MOUSE = 0;
const MOUSEEVENTF_MOVE = 0x0001;

let pendingDx = 0;
let pendingDy = 0;

export function moveMouseRelativeWin32(dx: number, dy: number): void {
  pendingDx += dx;
  pendingDy += dy;

  const roundedX = Math.trunc(pendingDx);
  const roundedY = Math.trunc(pendingDy);
  if (roundedX === 0 && roundedY === 0) return;

  pendingDx -= roundedX;
  pendingDy -= roundedY;

  const input = Buffer.alloc(INPUT_SIZE);
  input.writeUInt32LE(INPUT_MOUSE, 0);
  input.writeInt32LE(roundedX, 8);
  input.writeInt32LE(roundedY, 12);
  input.writeUInt32LE(0, 16);
  input.writeUInt32LE(MOUSEEVENTF_MOVE, 20);
  input.writeUInt32LE(0, 24);
  input.writeBigUInt64LE(getMessageExtraInfo(), 28);

  sendInput(1, input);
}

export function resetMouseRelativeAccumulator(): void {
  pendingDx = 0;
  pendingDy = 0;
}
