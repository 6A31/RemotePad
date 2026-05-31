export const FRAME_BINARY_TYPE = 1;
export const FRAME_HEADER_SIZE = 21;

export interface BinaryFrame {
  jpeg: Uint8Array;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  seq: number;
}

export function decodeFrameBinary(data: ArrayBuffer | ArrayBufferView): BinaryFrame | null {
  const buffer: ArrayBuffer =
    data instanceof ArrayBuffer
      ? data
      : (data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);

  if (buffer.byteLength < FRAME_HEADER_SIZE) return null;

  const view = new DataView(buffer);
  if (view.getUint8(0) !== FRAME_BINARY_TYPE) return null;

  return {
    seq: view.getUint32(1, true),
    width: view.getUint32(5, true),
    height: view.getUint32(9, true),
    sourceWidth: view.getUint32(13, true),
    sourceHeight: view.getUint32(17, true),
    jpeg: new Uint8Array(buffer, FRAME_HEADER_SIZE),
  };
}

export function encodeFrameBinary(frame: BinaryFrame): Uint8Array {
  const out = new Uint8Array(FRAME_HEADER_SIZE + frame.jpeg.length);
  const view = new DataView(out.buffer, out.byteOffset, FRAME_HEADER_SIZE);
  view.setUint8(0, FRAME_BINARY_TYPE);
  view.setUint32(1, frame.seq, true);
  view.setUint32(5, frame.width, true);
  view.setUint32(9, frame.height, true);
  view.setUint32(13, frame.sourceWidth, true);
  view.setUint32(17, frame.sourceHeight, true);
  out.set(frame.jpeg, FRAME_HEADER_SIZE);
  return out;
}
