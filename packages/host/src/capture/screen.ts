import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Monitor } from "node-screenshots";
import { MAX_STREAM_MAX_WIDTH, type StreamQuality } from "@remotepad/protocol";
import { encodeStreamJpeg } from "./encode-frame.js";
import { getPrimaryMonitorInfo } from "./monitor-info.js";
import { createDxgiBackend, type DxgiBackend } from "./dxgi-backend.js";
import type { EncodeWorkerRequest, EncodeWorkerResponse } from "./encode-worker.js";

export interface QualitySettings {
  maxWidth: number;
  jpegQuality: number;
  fps: number;
}

/** Tuned for real-time LAN streaming (fast encode, reasonable size). */
export const QUALITY_PRESETS: Record<StreamQuality, QualitySettings> = {
  low: { maxWidth: 1280, jpegQuality: 50, fps: 24 },
  medium: { maxWidth: 1600, jpegQuality: 62, fps: 30 },
  high: { maxWidth: 1920, jpegQuality: 75, fps: 36 },
};

export function resolveStreamSettings(
  quality: StreamQuality,
  clientMaxWidth?: number,
): QualitySettings {
  const preset = QUALITY_PRESETS[quality];
  if (!clientMaxWidth) return preset;
  const capped = Math.min(Math.round(clientMaxWidth), MAX_STREAM_MAX_WIDTH);
  return {
    ...preset,
    maxWidth: Math.min(preset.maxWidth, capped),
  };
}

export interface FramePayload {
  jpeg: Buffer;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  seq: number;
}

type FrameListener = (frame: FramePayload) => void;

export interface ScreenCaptureLike {
  subscribe(listener: (frame: FramePayload) => void): () => void;
  setQuality?(quality: StreamQuality, clientMaxWidth?: number): void;
}

const captureDir = dirname(fileURLToPath(import.meta.url));
const encodeWorkerPath = join(captureDir, "encode-worker.js");

function toTransferable(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

interface PendingJpegEncode {
  kind: "jpeg";
  id: number;
  fullJpeg: Buffer;
  width: number;
  height: number;
}

interface PendingRgbaEncode {
  kind: "rgba";
  id: number;
  rgba: Buffer;
  width: number;
  height: number;
}

type PendingEncode = PendingJpegEncode | PendingRgbaEncode;

export class ScreenCapture implements ScreenCaptureLike {
  private subscribers = new Set<FrameListener>();
  private seq = 0;
  private monitor: Monitor | null = null;
  private dxgi: DxgiBackend | null = null;
  private useDxgi = false;
  private quality: StreamQuality = "medium";
  private clientMaxWidth: number | undefined;
  private settings: QualitySettings = resolveStreamSettings("medium");
  private loopActive = false;
  private loopTimer: ReturnType<typeof setTimeout> | null = null;
  private encodeWorker: Worker | null = null;
  private encodeJobId = 0;
  private encodeWorkerBusy = false;
  private pendingEncode: PendingEncode | null = null;

  constructor() {
    this.tryInitDxgi();
  }

  private tryInitDxgi(): void {
    if (process.platform !== "win32") return;

    try {
      const backend = createDxgiBackend(0);
      if (!backend) return;
      backend.initialize();
      this.dxgi = backend;
      this.useDxgi = true;
      console.log("[capture] using DXGI Desktop Duplication (primary monitor)");
    } catch (err) {
      console.warn("[capture] DXGI init failed, falling back to node-screenshots:", err);
      this.dxgi = null;
      this.useDxgi = false;
    }
  }

  subscribe(listener: FrameListener): () => void {
    this.subscribers.add(listener);
    this.ensureEncodeWorker();
    this.ensureLoop();
    return () => {
      this.subscribers.delete(listener);
      if (this.subscribers.size === 0) {
        this.stopLoop();
        this.shutdownEncodeWorker();
      }
    };
  }

  setQuality(quality: StreamQuality, clientMaxWidth?: number): void {
    this.quality = quality;
    if (clientMaxWidth !== undefined) {
      this.clientMaxWidth = clientMaxWidth;
    }
    this.settings = resolveStreamSettings(this.quality, this.clientMaxWidth);
    if (this.loopActive && this.subscribers.size > 0) {
      this.stopLoop();
      this.ensureLoop();
    }
  }

  private ensureEncodeWorker(): void {
    if (this.encodeWorker) return;

    try {
      this.encodeWorker = new Worker(encodeWorkerPath);
      this.encodeWorker.on("message", (message: EncodeWorkerResponse) => {
        this.onEncodeComplete(message);
      });
      this.encodeWorker.on("error", (err) => {
        console.error("[capture] encode worker error:", err);
        this.encodeWorkerBusy = false;
        this.pendingEncode = null;
        this.shutdownEncodeWorker();
      });
    } catch (err) {
      console.error("[capture] encode worker unavailable:", err);
      this.encodeWorker = null;
    }
  }

  private shutdownEncodeWorker(): void {
    if (this.encodeWorker) {
      void this.encodeWorker.terminate();
      this.encodeWorker = null;
    }
    this.encodeWorkerBusy = false;
    this.pendingEncode = null;
  }

  private onEncodeComplete(message: EncodeWorkerResponse): void {
    this.encodeWorkerBusy = false;

    const source = getPrimaryMonitorInfo();
    const frame: FramePayload = {
      jpeg: message.jpeg,
      width: message.width,
      height: message.height,
      sourceWidth: source.inputWidth,
      sourceHeight: source.inputHeight,
      seq: ++this.seq,
    };

    for (const listener of this.subscribers) {
      listener(frame);
    }

    this.flushPendingEncode();
  }

  private flushPendingEncode(): void {
    if (!this.pendingEncode || !this.encodeWorker || this.encodeWorkerBusy) return;

    const job = this.pendingEncode;
    this.pendingEncode = null;
    this.postEncodeJob(job);
  }

  private postEncodeJob(job: PendingEncode): void {
    if (!this.encodeWorker) return;

    this.encodeWorkerBusy = true;
    const base = {
      id: job.id,
      width: job.width,
      height: job.height,
      maxWidth: this.settings.maxWidth,
      jpegQuality: this.settings.jpegQuality,
    };

    if (job.kind === "rgba") {
      const request: EncodeWorkerRequest = {
        kind: "rgba",
        ...base,
        rgba: job.rgba,
      };
      this.encodeWorker.postMessage(request, [toTransferable(job.rgba)]);
      return;
    }

    const request: EncodeWorkerRequest = {
      kind: "jpeg",
      ...base,
      fullJpeg: job.fullJpeg,
    };
    this.encodeWorker.postMessage(request, [toTransferable(job.fullJpeg)]);
  }

  private queueEncode(job: PendingEncode): void {
    if (!this.encodeWorkerBusy) {
      this.postEncodeJob(job);
      return;
    }
    this.pendingEncode = job;
  }

  private ensureLoop(): void {
    if (this.loopActive) return;
    this.loopActive = true;
    void this.runCaptureLoop();
  }

  private stopLoop(): void {
    this.loopActive = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
  }

  private async runCaptureLoop(): Promise<void> {
    if (this.useDxgi && this.dxgi) {
      await this.runDxgiCaptureLoop();
      return;
    }
    await this.runLegacyCaptureLoop();
  }

  /** DXGI: always grab the latest frame; encode on a worker thread when available. */
  private async runDxgiCaptureLoop(): Promise<void> {
    const dxgi = this.dxgi!;

    while (this.loopActive && this.subscribers.size > 0) {
      try {
        const frame = dxgi.getFrame();

        if (!this.encodeWorker) {
          const { encodeRgbaStreamJpeg } = await import("./encode-frame.js");
          const encoded = await encodeRgbaStreamJpeg(
            frame.data,
            frame.width,
            frame.height,
            this.settings,
          );
          this.broadcastFrame(encoded);
          continue;
        }

        const job: PendingRgbaEncode = {
          kind: "rgba",
          id: ++this.encodeJobId,
          rgba: Buffer.from(frame.data),
          width: frame.width,
          height: frame.height,
        };

        if (!this.encodeWorkerBusy) {
          this.postEncodeJob(job);
        } else {
          this.pendingEncode = job;
          await this.sleep(4);
        }
      } catch (err) {
        console.error("[capture] DXGI frame error:", err);
        await this.sleep(50);
      }
    }

    this.loopActive = false;
  }

  private async runLegacyCaptureLoop(): Promise<void> {
    const intervalMs = Math.floor(1000 / this.settings.fps);

    while (this.loopActive && this.subscribers.size > 0) {
      const started = performance.now();
      await this.captureLegacyFrame();
      if (!this.loopActive || this.subscribers.size === 0) break;

      const elapsed = performance.now() - started;
      const waitMs = Math.max(0, intervalMs - elapsed);
      await this.sleep(waitMs);
    }

    this.loopActive = false;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      this.loopTimer = setTimeout(resolve, ms);
    });
    this.loopTimer = null;
  }

  private broadcastFrame(encoded: { jpeg: Buffer; width: number; height: number }): void {
    const source = getPrimaryMonitorInfo();
    const frame: FramePayload = {
      ...encoded,
      sourceWidth: source.inputWidth,
      sourceHeight: source.inputHeight,
      seq: ++this.seq,
    };
    for (const listener of this.subscribers) {
      listener(frame);
    }
  }

  private getPrimaryMonitor(): Monitor {
    if (!this.monitor) {
      const monitors = Monitor.all();
      if (monitors.length === 0) {
        throw new Error("No monitors found");
      }
      this.monitor = monitors.find((m) => m.isPrimary()) ?? monitors[0];
    }
    return this.monitor;
  }

  private async captureLegacyFrame(): Promise<void> {
    if (this.subscribers.size === 0) return;

    try {
      const monitor = this.getPrimaryMonitor();
      const image = await monitor.captureImage();
      const width = image.width;
      const height = image.height;
      const settings = this.settings;

      if (width <= settings.maxWidth) {
        const jpeg = Buffer.from(await image.toJpeg(false));
        this.broadcastFrame({ jpeg, width, height });
        return;
      }

      const fullJpeg = Buffer.from(await image.toJpeg(false));

      if (this.encodeWorker) {
        this.queueEncode({
          kind: "jpeg",
          id: ++this.encodeJobId,
          fullJpeg,
          width,
          height,
        });
        return;
      }

      const encoded = await encodeStreamJpeg(image, settings);
      this.broadcastFrame(encoded);
    } catch (err) {
      console.error("[capture] frame error:", err);
    }
  }

  async getNativeResolution(): Promise<{ width: number; height: number }> {
    if (this.useDxgi && this.dxgi) {
      const frame = this.dxgi.getFrame();
      return { width: frame.width, height: frame.height };
    }
    const monitor = this.getPrimaryMonitor();
    const image = await monitor.captureImage();
    return { width: image.width, height: image.height };
  }
}
