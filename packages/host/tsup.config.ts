import { defineConfig } from "tsup";

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
  ],
});
