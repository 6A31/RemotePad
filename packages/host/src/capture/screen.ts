import { Monitor } from "node-screenshots";
import sharp from "sharp";
import { MAX_STREAM_MAX_WIDTH, type StreamQuality } from "@remotepad/protocol";
import { getPrimaryMonitorInfo } from "./monitor-info.js";

export interface QualitySettings {
  maxWidth: number;
  jpegQuality: number;
  fps: number;
}

export const QUALITY_PRESETS: Record<StreamQuality, QualitySettings> = {
  low: { maxWidth: 1280, jpegQuality: 55, fps: 24 },
  medium: { maxWidth: 1920, jpegQuality: 72, fps: 30 },
  high: { maxWidth: 2560, jpegQuality: 85, fps: 45 },
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

export class ScreenCapture implements ScreenCaptureLike {
  private subscribers = new Set<FrameListener>();
  private seq = 0;
  private monitor: Monitor | null = null;
  private quality: StreamQuality = "medium";
  private clientMaxWidth: number | undefined;
  private settings: QualitySettings = resolveStreamSettings("medium");
  private loopActive = false;
  private loopTimer: ReturnType<typeof setTimeout> | null = null;

  subscribe(listener: FrameListener): () => void {
    this.subscribers.add(listener);
    this.ensureLoop();
    return () => {
      this.subscribers.delete(listener);
      if (this.subscribers.size === 0) {
        this.stopLoop();
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

  /** Schedule the next frame after the previous one finishes (avoids piling up work). */
  private async runCaptureLoop(): Promise<void> {
    const intervalMs = Math.floor(1000 / this.settings.fps);

    while (this.loopActive && this.subscribers.size > 0) {
      const started = performance.now();
      await this.captureAndBroadcast();
      if (!this.loopActive || this.subscribers.size === 0) break;

      const elapsed = performance.now() - started;
      const waitMs = Math.max(0, intervalMs - elapsed);
      await new Promise<void>((resolve) => {
        this.loopTimer = setTimeout(resolve, waitMs);
      });
      this.loopTimer = null;
    }

    this.loopActive = false;
  }

  private getPrimaryMonitor(): Monitor {
    if (!this.monitor) {
      const monitors = Monitor.all();
      if (monitors.length === 0) {
        throw new Error("No monitors found");
      }
      this.monitor = monitors[0];
    }
    return this.monitor;
  }

  private async captureAndBroadcast(): Promise<void> {
    if (this.subscribers.size === 0) return;

    try {
      const monitor = this.getPrimaryMonitor();
      const image = await monitor.captureImage();
      const width = image.width;
      const height = image.height;
      const source = getPrimaryMonitorInfo();

      let jpeg: Buffer;
      let outWidth: number;
      let outHeight: number;

      if (width <= this.settings.maxWidth) {
        jpeg = Buffer.from(await image.toJpeg(false));
        outWidth = width;
        outHeight = height;
      } else {
        const rgba = Buffer.from(await image.toRaw(false));
        let pipeline = sharp(rgba, {
          raw: { width, height, channels: 4 },
        });
        const scaledHeight = Math.round((height * this.settings.maxWidth) / width);
        pipeline = pipeline.resize(this.settings.maxWidth, scaledHeight, { fit: "inside" });

        const { data, info } = await pipeline
          .jpeg({ quality: this.settings.jpegQuality, mozjpeg: true })
          .toBuffer({ resolveWithObject: true });
        jpeg = data;
        outWidth = info.width;
        outHeight = info.height;
      }

      const frame: FramePayload = {
        jpeg,
        width: outWidth,
        height: outHeight,
        sourceWidth: source.inputWidth,
        sourceHeight: source.inputHeight,
        seq: ++this.seq,
      };

      for (const listener of this.subscribers) {
        listener(frame);
      }
    } catch (err) {
      console.error("[capture] frame error:", err);
    }
  }

  async getNativeResolution(): Promise<{ width: number; height: number }> {
    const monitor = this.getPrimaryMonitor();
    const image = await monitor.captureImage();
    return { width: image.width, height: image.height };
  }
}
