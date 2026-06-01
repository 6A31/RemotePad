import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import toIco from "to-ico";

const moduleDir = dirname(fileURLToPath(import.meta.url));

async function resolveAssetsDir(): Promise<string> {
  const candidates = [join(moduleDir, "assets"), join(moduleDir, "../assets")];
  for (const dir of candidates) {
    try {
      await access(join(dir, "icon.svg"));
      return dir;
    } catch {
      // try next
    }
  }
  throw new Error("Tray icon source missing (expected assets/icon.svg next to the host package).");
}

export async function ensureTrayIcon(): Promise<string> {
  const assetsDir = await resolveAssetsDir();
  const svgPath = join(assetsDir, "icon.svg");
  const icoPath = join(assetsDir, "icon.ico");

  await mkdir(assetsDir, { recursive: true });

  const svgStat = await stat(svgPath);
  try {
    const icoStat = await stat(icoPath);
    if (icoStat.mtimeMs >= svgStat.mtimeMs) {
      return icoPath;
    }
  } catch {
    // icon.ico missing; generate below
  }

  const svg = await readFile(svgPath);
  const sizes = [16, 32, 48];
  const pngs = await Promise.all(
    sizes.map((size) => sharp(svg).resize(size, size).png().toBuffer()),
  );
  await writeFile(icoPath, await toIco(pngs));
  return icoPath;
}
