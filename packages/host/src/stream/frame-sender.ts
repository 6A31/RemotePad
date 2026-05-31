import { encodeFrameBinary, type BinaryFrame } from "@remotepad/protocol";
import type { FramePayload } from "../capture/screen.js";

export const MAX_WS_BUFFER_BYTES = 512 * 1024;

export function frameToBinaryPacket(frame: FramePayload): Buffer {
  const binary: BinaryFrame = {
    jpeg: frame.jpeg,
    width: frame.width,
    height: frame.height,
    sourceWidth: frame.sourceWidth,
    sourceHeight: frame.sourceHeight,
    seq: frame.seq,
  };
  return Buffer.from(encodeFrameBinary(binary));
}

export function shouldSendFrame(socket: { bufferedAmount: number; readyState: number }, openState: number): boolean {
  return socket.readyState === openState && socket.bufferedAmount <= MAX_WS_BUFFER_BYTES;
}
