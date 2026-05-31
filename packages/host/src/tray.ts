import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import SysTrayModule from "systray2";

const SysTray =
  (SysTrayModule as unknown as { default: typeof SysTrayModule }).default ??
  SysTrayModule;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, "../assets");
const ICON_PATH = join(ASSETS_DIR, "icon.ico");

// Minimal 16x16 ICO (single color)
const ICON_BASE64 =
  "AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A";

export interface TrayOptions {
  urls: string[];
  username: string;
  firstRunPassword: string | null;
  onQuit: () => void;
}

async function ensureIcon(): Promise<string> {
  await mkdir(ASSETS_DIR, { recursive: true });
  try {
    await writeFile(ICON_PATH, Buffer.from(ICON_BASE64, "base64"));
  } catch {
    // icon may already exist
  }
  return ICON_PATH;
}

export async function startTray(options: TrayOptions): Promise<{ kill: () => void }> {
  const icon = await ensureIcon();
  const primaryUrl = options.urls.find((u) => !u.includes("127.0.0.1")) ?? options.urls[0];
  const tooltip = options.firstRunPassword
    ? `RemotePad password: ${options.firstRunPassword}`
    : `RemotePad ${primaryUrl}`;

  const systray = new SysTray({
    menu: {
      icon,
      title: "RemotePad",
      tooltip,
      items: [
        {
          title: primaryUrl,
          tooltip: "Open in browser",
          checked: false,
          enabled: true,
        },
        SysTray.separator,
        {
          title: "Quit",
          tooltip: "Stop RemotePad",
          checked: false,
          enabled: true,
        },
      ],
    },
    debug: false,
    copyDir: false,
  });

  systray.onClick((action) => {
    if (action.seq_id === 0) {
      import("node:child_process").then(({ exec }) => {
        exec(`start ${primaryUrl}`);
      });
    } else if (action.seq_id === 2) {
      options.onQuit();
    }
  });

  return {
    kill: () => systray.kill(false),
  };
}
