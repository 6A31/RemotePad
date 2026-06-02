#!/usr/bin/env tsx
/**
 * Measures screen capture pipeline stages on this PC.
 * Run: npm run benchmark:capture -w @remotepad/host
 */
import { performance } from "node:perf_hooks";
import { Monitor } from "node-screenshots";
import sharp from "sharp";
import {
  downscaleJpeg,
  encodeRgbaStreamJpeg,
  encodeStreamJpeg,
} from "../src/capture/encode-frame.js";
import { createDxgiBackend } from "../src/capture/dxgi-backend.js";
import { QUALITY_PRESETS, resolveStreamSettings } from "../src/capture/screen.js";

const FRAMES = 60;
const WARMUP = 5;

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.floor((sorted.length * p) / 100));
  return sorted[idx]!;
}

function summarize(label: string, samplesMs: number[]): void {
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const avg = samplesMs.reduce((a, b) => a + b, 0) / samplesMs.length;
  const maxFps = 1000 / avg;
  console.log(`\n${label}`);
  console.log(`  frames:  ${samplesMs.length}`);
  console.log(`  avg:     ${avg.toFixed(1)} ms  (~${maxFps.toFixed(1)} fps max)`);
  console.log(`  p50:     ${percentile(sorted, 50).toFixed(1)} ms`);
  console.log(`  p95:     ${percentile(sorted, 95).toFixed(1)} ms`);
  console.log(`  max:     ${sorted[sorted.length - 1]!.toFixed(1)} ms`);
}

async function main(): Promise<void> {
  const monitors = Monitor.all();
  if (monitors.length === 0) {
    console.error("No monitors found.");
    process.exit(1);
  }

  const monitor = monitors.find((m) => m.isPrimary()) ?? monitors[0];
  const quality = (process.argv[2] as keyof typeof QUALITY_PRESETS) ?? "medium";
  const settings = resolveStreamSettings(
    quality in QUALITY_PRESETS ? quality : "medium",
    undefined,
  );

  console.log("RemotePad capture benchmark");
  console.log(`  monitor: ${monitor.width()}x${monitor.height()} @ scale ${monitor.scaleFactor()}`);
  console.log(`  preset:  ${quality} (maxWidth ${settings.maxWidth}, jpeg ${settings.jpegQuality}, target ${settings.fps} fps)`);

  const captureOnly: number[] = [];
  const nativeJpeg: number[] = [];
  const jpegDownscale: number[] = [];
  const rgbaDownscale: number[] = [];
  const productionPath: number[] = [];
  const dxgiCapture: number[] = [];
  const dxgiEncode: number[] = [];
  const dxgiProduction: number[] = [];

  let dxgi: ReturnType<typeof createDxgiBackend> = null;
  if (process.platform === "win32") {
    try {
      dxgi = createDxgiBackend(0);
      dxgi?.initialize();
      if (dxgi) {
        const probe = dxgi.getFrame();
        console.log(`  DXGI:    ${probe.width}x${probe.height} (Desktop Duplication API)`);
      }
    } catch {
      console.log("  DXGI:    unavailable");
      dxgi = null;
    }
  }

  for (let i = 0; i < WARMUP + FRAMES; i++) {
    const image = await monitor.captureImage();
    const width = image.width;
    const height = image.height;

    if (i >= WARMUP) {
      let t0 = performance.now();
      await monitor.captureImage();
      captureOnly.push(performance.now() - t0);

      t0 = performance.now();
      await image.toJpeg(false);
      nativeJpeg.push(performance.now() - t0);

      t0 = performance.now();
      const fullJpeg = Buffer.from(await image.toJpeg(false));
      await downscaleJpeg(fullJpeg, width, height, settings);
      jpegDownscale.push(performance.now() - t0);
    }

    const prodStart = performance.now();
    const fresh = await monitor.captureImage();
    await encodeStreamJpeg(fresh, settings);
    if (i >= WARMUP) {
      productionPath.push(performance.now() - prodStart);
    }

    if (dxgi && i >= WARMUP) {
      let t0 = performance.now();
      const dxgiFrame = dxgi.getFrame();
      dxgiCapture.push(performance.now() - t0);

      t0 = performance.now();
      await encodeRgbaStreamJpeg(dxgiFrame.data, dxgiFrame.width, dxgiFrame.height, settings);
      dxgiEncode.push(performance.now() - t0);

      const dxgiProdStart = performance.now();
      const fresh = dxgi.getFrame();
      await encodeRgbaStreamJpeg(fresh.data, fresh.width, fresh.height, settings);
      dxgiProduction.push(performance.now() - dxgiProdStart);
    }

    if (i === WARMUP) {
      const imageForRgba = await monitor.captureImage();
      const rgbaStart = performance.now();
        const rgba = Buffer.from(await imageForRgba.toRaw(false));
        let pipeline = sharp(rgba, {
          raw: { width: imageForRgba.width, height: imageForRgba.height, channels: 4 },
        });
        const scaledHeight = Math.round((imageForRgba.height * settings.maxWidth) / imageForRgba.width);
        pipeline = pipeline.resize(settings.maxWidth, scaledHeight, {
          fit: "inside",
          fastShrinkOnLoad: true,
        });
        await pipeline.jpeg({ quality: settings.jpegQuality, mozjpeg: false }).toBuffer();
      rgbaDownscale.push(performance.now() - rgbaStart);
    }
  }

  dxgi?.dispose();

  summarize("1) captureImage() only", captureOnly);
  summarize("2) toJpeg() on captured frame (native)", nativeJpeg);
  summarize("3) toJpeg + sharp downscale (new stream path)", jpegDownscale);
  if (rgbaDownscale.length > 0) {
    summarize("4) toRaw + sharp downscale (legacy path, one sample)", rgbaDownscale);
  }
  summarize("5) full legacy path (capture + encodeStreamJpeg)", productionPath);

  if (dxgiCapture.length > 0) {
    summarize("6) DXGI getFrame() only", dxgiCapture);
    summarize("7) DXGI encodeRgbaStreamJpeg (2-pass resize)", dxgiEncode);
    summarize("8) full DXGI path (capture + encodeRgbaStreamJpeg)", dxgiProduction);
  }

  console.log("\nNotes:");
  console.log(`  Target stream interval: ${(1000 / settings.fps).toFixed(1)} ms (${settings.fps} fps)`);
  console.log(
    `  If production avg exceeds that interval, effective stream fps will be lower.`,
  );
  console.log("  Windows host uses DXGI + background encode worker when available.");
  console.log("  WiFi/WebSocket backpressure can cap fps even when capture is fast enough.");
}

await main();
