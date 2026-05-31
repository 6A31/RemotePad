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
  private timer: NodeJS.Timeout | null = null;
  private seq = 0;
  private monitor: Monitor | null = null;
  private quality: StreamQuality = "medium";
  private clientMaxWidth: number | undefined;
  private settings: QualitySettings = resolveStreamSettings("medium");
  private inFlight = false;

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
    if (this.timer && this.subscribers.size > 0) {
      this.stopLoop();
      this.ensureLoop();
    }
  }

  private ensureLoop(): void {
    if (this.timer) return;
    const intervalMs = Math.floor(1000 / this.settings.fps);
    this.timer = setInterval(() => {
      void this.captureAndBroadcast();
    }, intervalMs);
  }

  private stopLoop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
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
    if (this.subscribers.size === 0 || this.inFlight) return;

    this.inFlight = true;
    try {
      const monitor = this.getPrimaryMonitor();
      const image = await monitor.captureImage();
      const width = image.width;
      const height = image.height;
      const rgba = Buffer.from(await image.toRaw(false));

      let pipeline = sharp(rgba, {
        raw: { width, height, channels: 4 },
      });

      if (width > this.settings.maxWidth) {
        const scaledHeight = Math.round((height * this.settings.maxWidth) / width);
        pipeline = pipeline.resize(this.settings.maxWidth, scaledHeight, { fit: "inside" });
      }

      const { data, info } = await pipeline
        .jpeg({ quality: this.settings.jpegQuality, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });

      const frame: FramePayload = {
        jpeg: data,
        width: info.width,
        height: info.height,
        sourceWidth: getPrimaryMonitorInfo().inputWidth,
        sourceHeight: getPrimaryMonitorInfo().inputHeight,
        seq: ++this.seq,
      };

      for (const listener of this.subscribers) {
        listener(frame);
      }
    } catch (err) {
      console.error("[capture] frame error:", err);
    } finally {
      this.inFlight = false;
    }
  }

  async getNativeResolution(): Promise<{ width: number; height: number }> {
    const monitor = this.getPrimaryMonitor();
    const image = await monitor.captureImage();
    return { width: image.width, height: image.height };
  }
}
