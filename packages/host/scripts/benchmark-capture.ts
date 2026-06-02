#!/usr/bin/env tsx
/**
 * Measures screen capture pipeline stages on this PC.
 * Run: npm run benchmark:capture -w @remotepad/host
 */
import { performance } from "node:perf_hooks";
import { Monitor } from "node-screenshots";
import sharp from "sharp";
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
  const rawToSharpJpeg: number[] = [];
  const productionPath: number[] = [];

  for (let i = 0; i < WARMUP + FRAMES; i++) {
    const image = await monitor.captureImage();
    const width = image.width;
    const height = image.height;

    if (i >= WARMUP) {
      let t0 = performance.now();
      await monitor.captureImage();
      captureOnly.push(performance.now() - t0);

      t0 = performance.now();
      await image.toJpeg();
      nativeJpeg.push(performance.now() - t0);

      t0 = performance.now();
      const rgba = Buffer.from(await image.toRaw(false));
      let pipeline = sharp(rgba, { raw: { width, height, channels: 4 } });
      if (width > settings.maxWidth) {
        const scaledHeight = Math.round((height * settings.maxWidth) / width);
        pipeline = pipeline.resize(settings.maxWidth, scaledHeight, { fit: "inside" });
      }
      await pipeline.jpeg({ quality: settings.jpegQuality, mozjpeg: true }).toBuffer();
      rawToSharpJpeg.push(performance.now() - t0);
    }

    const t0 = performance.now();
    const fresh = await monitor.captureImage();
    const w = fresh.width;
    const h = fresh.height;
    const rgba = Buffer.from(await fresh.toRaw(false));
    let pipeline = sharp(rgba, { raw: { width: w, height: h, channels: 4 } });
    if (w > settings.maxWidth) {
      const scaledHeight = Math.round((h * settings.maxWidth) / w);
      pipeline = pipeline.resize(settings.maxWidth, scaledHeight, { fit: "inside" });
    }
    await pipeline.jpeg({ quality: settings.jpegQuality, mozjpeg: true }).toBuffer();
    if (i >= WARMUP) {
      productionPath.push(performance.now() - t0);
    }
  }

  summarize("1) captureImage() only", captureOnly);
  summarize("2) toJpeg() on captured frame (native, full resolution)", nativeJpeg);
  summarize("3) toRaw(false) + sharp resize/jpeg (current encode path)", rawToSharpJpeg);
  summarize("4) full production path (capture + raw + sharp)", productionPath);

  const prodAvg = productionPath.reduce((a, b) => a + b, 0) / productionPath.length;
  console.log("\nNotes:");
  console.log(`  Target stream interval: ${(1000 / settings.fps).toFixed(1)} ms (${settings.fps} fps)`);
  console.log(
    `  If production avg exceeds that, the host skips frames (inFlight) or you see low effective fps.`,
  );
  console.log("  WiFi/WebSocket backpressure can cap fps even when capture is fast enough.");
  console.log("  Alternatives: DXGI duplication, Windows Graphics Capture, hardware H.264 (WebRTC).");
}

await main();
