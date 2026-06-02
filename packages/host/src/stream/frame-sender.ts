import { encodeFrameBinary, type BinaryFrame } from "@remotepad/protocol";
import type { FramePayload } from "../capture/screen.js";

export const MAX_WS_BUFFER_BYTES = 1024 * 1024;
export const SKIPPED_FRAMES_BEFORE_WARN = 5;

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

export interface FrameSendGuard {
  skippedInRow: number;
  congested: boolean;
}

export function createFrameSendGuard(): FrameSendGuard {
  return { skippedInRow: 0, congested: false };
}

export function resetFrameSendGuard(guard: FrameSendGuard): void {
  guard.skippedInRow = 0;
  guard.congested = false;
}

/** Returns true when the frame should be sent; invokes callbacks when congestion starts or clears. */
export function canSendFrame(
  socket: { bufferedAmount: number; readyState: number },
  openState: number,
  guard: FrameSendGuard,
  onCongested: () => void,
  onRecovered: () => void,
): boolean {
  if (!shouldSendFrame(socket, openState)) {
    guard.skippedInRow += 1;
    if (guard.skippedInRow >= SKIPPED_FRAMES_BEFORE_WARN && !guard.congested) {
      guard.congested = true;
      onCongested();
    }
    return false;
  }

  guard.skippedInRow = 0;
  if (guard.congested) {
    guard.congested = false;
    onRecovered();
  }
  return true;
}
