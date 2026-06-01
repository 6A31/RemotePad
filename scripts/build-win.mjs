import {
  cpSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { pipeline } from "node:stream/promises";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "out", "RemotePad");
const nodeCacheDir = join(root, "out", ".node-cache");

/** Must match the Node ABI used when native modules are compiled in out/RemotePad. */
const NODE_VERSION = "22.14.0";
const NODE_DIST = `node-v${NODE_VERSION}-win-x64`;
const NODE_ZIP = `${NODE_DIST}.zip`;
const NODE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ZIP}`;

function run(command, options = {}) {
  execSync(command, { cwd: root, stdio: "inherit", shell: true, ...options });
}

async function downloadFile(url, dest) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  mkdirSync(dirname(dest), { recursive: true });
  await pipeline(response.body, createWriteStream(dest));
}

async function ensureBundledNode(targetNodeDir) {
  const zipPath = join(nodeCacheDir, NODE_ZIP);
  const extractRoot = join(nodeCacheDir, NODE_DIST);

  if (!existsSync(zipPath)) {
    console.log(`Downloading Node.js ${NODE_VERSION} for Windows x64…`);
    await downloadFile(NODE_URL, zipPath);
  } else {
    console.log(`Using cached Node.js ${NODE_VERSION} (${zipPath})`);
  }

  if (!existsSync(join(extractRoot, "node.exe"))) {
    rmSync(extractRoot, { recursive: true, force: true });
    mkdirSync(extractRoot, { recursive: true });
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${nodeCacheDir.replace(/'/g, "''")}' -Force"`,
      { stdio: "inherit" },
    );
  }

  rmSync(targetNodeDir, { recursive: true, force: true });
  mkdirSync(targetNodeDir, { recursive: true });

  const extractedDir = join(nodeCacheDir, NODE_DIST);
  for (const entry of readdirSync(extractedDir)) {
    cpSync(join(extractedDir, entry), join(targetNodeDir, entry), { recursive: true });
  }

  const nodeExe = join(targetNodeDir, "node.exe");
  if (!existsSync(nodeExe)) {
    throw new Error(`Bundled Node missing after extract: ${nodeExe}`);
  }

  return targetNodeDir;
}

function bundledNodeEnv(nodeDir) {
  return {
    ...process.env,
    PATH: `${nodeDir};${process.env.PATH ?? ""}`,
  };
}

console.log("Syncing brand assets…");
run("node scripts/sync-brand.mjs");

console.log("Building packages…");
run("npm run build");

console.log("Staging portable layout…");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const nodeDir = join(outDir, "node");
await ensureBundledNode(nodeDir);
const nodeExe = join(nodeDir, "node.exe");

cpSync(join(root, "packages", "host", "dist"), join(outDir, "dist"), { recursive: true });
cpSync(join(root, "packages", "web", "dist"), join(outDir, "web"), { recursive: true });

const hostPkg = JSON.parse(
  readFileSync(join(root, "packages", "host", "package.json"), "utf8"),
);
const protocolPkg = JSON.parse(
  readFileSync(join(root, "packages", "protocol", "package.json"), "utf8"),
);

const vendorProtocol = join(outDir, "vendor", "protocol");
mkdirSync(join(vendorProtocol, "dist"), { recursive: true });
cpSync(join(root, "packages", "protocol", "dist"), join(vendorProtocol, "dist"), {
  recursive: true,
});
writeFileSync(
  join(vendorProtocol, "package.json"),
  JSON.stringify(
    {
      name: protocolPkg.name,
      version: protocolPkg.version,
      type: "module",
      main: "./dist/index.js",
      exports: protocolPkg.exports,
      dependencies: protocolPkg.dependencies,
    },
    null,
    2,
  ),
);

const stagingPkg = {
  name: "remotepad",
  private: true,
  type: "module",
  main: "./dist/index.js",
  dependencies: {
    ...hostPkg.dependencies,
    "@remotepad/protocol": "file:./vendor/protocol",
  },
};

writeFileSync(join(outDir, "package.json"), JSON.stringify(stagingPkg, null, 2));

const nodeRel = "%~dp0node\\node.exe";

writeFileSync(
  join(outDir, "start.cmd"),
  `@echo off\r\ncd /d "%~dp0"\r\n"${nodeRel}" dist\\index.js\r\nif errorlevel 1 pause\r\n`,
);

writeFileSync(
  join(outDir, "change-password.cmd"),
  `@echo off\r\ncd /d "%~dp0"\r\n"${nodeRel}" dist\\change-password.js %*\r\npause\r\n`,
);

writeFileSync(
  join(outDir, "setup-firewall.cmd"),
  readFileSync(join(root, "setup-firewall.cmd"), "utf8"),
);

console.log("Installing production dependencies (native modules may take a minute)…");
execSync(`"${join(nodeDir, "npm.cmd")}" install --omit=dev --no-audit --no-fund`, {
  cwd: outDir,
  stdio: "inherit",
  shell: true,
  env: bundledNodeEnv(nodeDir),
});

console.log("Trimming bundled Node to runtime only (dropping npm)…");
for (const entry of readdirSync(nodeDir)) {
  if (entry !== "node.exe") {
    rmSync(join(nodeDir, entry), { recursive: true, force: true });
  }
}

const bundledVersion = execSync(`"${nodeExe}" --version`, { encoding: "utf8" }).trim();
console.log("");
console.log(`Portable build ready: ${outDir}`);
console.log(`Bundled runtime: ${bundledVersion}`);
console.log("Copy the RemotePad folder to another Windows PC and run start.cmd.");
console.log("No Node.js, npm, or install step needed on the target PC.");
console.log("This is a folder, not a single .exe file.");
