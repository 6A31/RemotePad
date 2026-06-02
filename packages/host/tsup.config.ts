import { defineConfig } from "tsup";
import { cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "change-password": "scripts/change-password.ts",
    "encode-worker": "src/capture/encode-worker.ts",
  },
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  external: [
    "@nut-tree-fork/nut-js",
    "node-screenshots",
    "windows-desktop-duplication",
    "sharp",
    "systray2",
    "bcrypt",
    "to-ico",
  ],
  onSuccess() {
    const distAssets = join("dist", "assets");
    mkdirSync(distAssets, { recursive: true });
    cpSync(join("..", "..", "assets", "icon.svg"), join(distAssets, "icon.svg"));
  },
});
