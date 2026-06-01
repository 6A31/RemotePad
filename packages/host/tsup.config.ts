import { defineConfig } from "tsup";
import { cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  external: [
    "@nut-tree-fork/nut-js",
    "node-screenshots",
    "sharp",
    "systray2",
    "bcrypt",
    "to-ico",
  ],
  onSuccess() {
    const distAssets = join("dist", "assets");
    mkdirSync(distAssets, { recursive: true });
    cpSync("assets/icon.svg", join(distAssets, "icon.svg"));
  },
});
