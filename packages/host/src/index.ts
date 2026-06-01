import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, getFirstRunPassword, clearFirstRunPassword, persistRobloxMode } from "./config.js";
import { createServer, getServerUrls } from "./server.js";
import { startTray } from "./tray.js";
import { ensureFirewallRule } from "./firewall.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webDistPath = join(__dirname, "../../web/dist");

async function main(): Promise<void> {
  const config = await loadConfig();
  const firstRunPassword = getFirstRunPassword();

  const { app, notifyConfigChange } = await createServer({ config, webDistPath });
  const urls = getServerUrls(config.port);

  const firewall = await ensureFirewallRule(config.port);
  if (firewall.message) {
    console.log(firewall.ok ? `[firewall] ${firewall.message}` : `[firewall] WARNING: ${firewall.message}`);
  }

  console.log("RemotePad host running:");
  for (const url of urls) {
    console.log(`  ${url}`);
  }
  const lanUrls = urls.filter((u) => !u.includes("127.0.0.1"));
  if (lanUrls.length > 0) {
    console.log("");
    console.log("On your phone/tablet, open:");
    console.log(`  ${lanUrls[0]}`);
  }

  if (firstRunPassword) {
    console.log("");
    console.log("First-run password (save this):");
    console.log(`  user: ${config.username}`);
    console.log(`  pass: ${firstRunPassword}`);
  }

  let tray: { kill: () => void } | null = null;
  try {
    tray = await startTray({
      urls,
      port: config.port,
      username: config.username,
      firstRunPassword,
      getRobloxMode: () => config.robloxMode,
      setRobloxMode: async (enabled) => {
        await persistRobloxMode(config, enabled);
        notifyConfigChange();
      },
      onQuit: async () => {
        await app.close();
        tray?.kill();
        process.exit(0);
      },
    });
    clearFirstRunPassword();
  } catch (err) {
    console.warn("[tray] Could not start system tray:", err);
    console.warn("[tray] Host continues without tray icon.");
  }

  const shutdown = async () => {
    await app.close();
    tray?.kill();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
