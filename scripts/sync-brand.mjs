import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconSrc = join(root, "assets", "icon.svg");

const targets = [
  join(root, "packages", "web", "public", "icon.svg"),
  join(root, "packages", "host", "assets", "icon.svg"),
];

for (const target of targets) {
  mkdirSync(dirname(target), { recursive: true });
  cpSync(iconSrc, target);
}

console.log("Synced assets/icon.svg to web and host packages.");
