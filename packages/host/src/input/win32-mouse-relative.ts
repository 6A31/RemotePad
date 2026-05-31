import koffi from "koffi";

const INPUT_MOUSE = 0;
const MOUSEEVENTF_MOVE = 0x0001;
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

export function moveMouseRelativeWin32(dx: number, dy: number): void {
  const inject = getSendInput();
  if (!inject) return;

  const roundedX = Math.round(dx);
  const roundedY = Math.round(dy);
  if (roundedX === 0 && roundedY === 0) return;

  const input = Buffer.alloc(INPUT_SIZE);
  input.writeUInt32LE(INPUT_MOUSE, 0);
  input.writeInt32LE(roundedX, 8);
  input.writeInt32LE(roundedY, 12);
  input.writeUInt32LE(0, 16);
  input.writeUInt32LE(MOUSEEVENTF_MOVE, 20);
  input.writeUInt32LE(0, 24);
  input.writeBigUInt64LE(0n, 28);

  inject(1, input, INPUT_SIZE);
}
