import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "out", "RemotePad");

function run(command) {
  execSync(command, { cwd: root, stdio: "inherit", shell: true });
}

console.log("Syncing brand assets…");
run("node scripts/sync-brand.mjs");

console.log("Building packages…");
run("npm run build");

console.log("Staging portable layout…");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

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

writeFileSync(
  join(outDir, "start.cmd"),
  `@echo off\r\ncd /d "%~dp0"\r\nnode dist\\index.js\r\n`,
);

writeFileSync(
  join(outDir, "change-password.cmd"),
  `@echo off\r\ncd /d "%~dp0"\r\nnode dist\\change-password.js %*\r\npause\r\n`,
);

writeFileSync(
  join(outDir, "setup-firewall.cmd"),
  readFileSync(join(root, "setup-firewall.cmd"), "utf8"),
);

console.log("Installing production dependencies (native modules may take a minute)…");
execSync("npm install --omit=dev --no-audit --no-fund", {
  cwd: outDir,
  stdio: "inherit",
  shell: true,
});

console.log("");
console.log(`Portable build ready: ${outDir}`);
console.log("Requires Node.js 18+ on the target PC.");
console.log("Run out\\RemotePad\\start.cmd to launch.");
