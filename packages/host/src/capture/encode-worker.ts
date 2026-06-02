import { parentPort } from "node:worker_threads";
import { downscaleJpeg, encodeRgbaStreamJpeg } from "./encode-frame.js";

export interface EncodeJpegWorkerRequest {
  kind: "jpeg";
  id: number;
  fullJpeg: Buffer;
  width: number;
  height: number;
  maxWidth: number;
  jpegQuality: number;
}

export interface EncodeRgbaWorkerRequest {
  kind: "rgba";
  id: number;
  rgba: Buffer;
  width: number;
  height: number;
  maxWidth: number;
  jpegQuality: number;
}

export type EncodeWorkerRequest = EncodeJpegWorkerRequest | EncodeRgbaWorkerRequest;

export interface EncodeWorkerResponse {
  id: number;
  jpeg: Buffer;
  width: number;
  height: number;
}

if (parentPort) {
  parentPort.on("message", (message: EncodeWorkerRequest) => {
    void (async () => {
      const settings = { maxWidth: message.maxWidth, jpegQuality: message.jpegQuality };
      const result =
        message.kind === "rgba"
          ? await encodeRgbaStreamJpeg(message.rgba, message.width, message.height, settings)
          : await downscaleJpeg(message.fullJpeg, message.width, message.height, settings);

      const response: EncodeWorkerResponse = {
        id: message.id,
        ...result,
      };
      parentPort!.postMessage(response);
    })();
  });
}
