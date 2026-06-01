import SysTrayModule from "systray2";
import { ensureTrayIcon } from "./icon.js";
import { repairFirewallRule } from "./firewall.js";
import { resetLoginPassword, createLoginPassword } from "./tray-actions.js";
import { showInfoDialog, showPasswordCreateDialog } from "./win-dialog.js";

const SysTray =
  (SysTrayModule as unknown as { default: typeof SysTrayModule }).default ??
  SysTrayModule;

interface TrayMenuItem {
  title: string;
  tooltip: string;
  checked: boolean;
  enabled: boolean;
  click?: () => void;
  items?: TrayMenuItem[];
}

export interface TrayOptions {
  urls: string[];
  port: number;
  username: string;
  firstRunPassword: string | null;
  getRobloxMode: () => boolean;
  setRobloxMode: (enabled: boolean) => Promise<void>;
  onQuit: () => void;
}

export async function startTray(options: TrayOptions): Promise<{ kill: () => void }> {
  const icon = await ensureTrayIcon();
  const primaryUrl = options.urls.find((u) => !u.includes("127.0.0.1")) ?? options.urls[0];
  const tooltip = options.firstRunPassword
    ? `RemotePad password: ${options.firstRunPassword}`
    : `RemotePad ${primaryUrl}`;

  const openUrlItem: TrayMenuItem = {
    title: primaryUrl,
    tooltip: "Open in browser",
    checked: false,
    enabled: true,
    click: () => {
      void import("node:child_process").then(({ exec }) => {
        exec(`start ${primaryUrl}`);
      });
    },
  };

  const robloxModeItem: TrayMenuItem = {
    title: "Roblox mode",
    tooltip: "Show Roblox controls on mobile clients",
    checked: options.getRobloxMode(),
    enabled: true,
    click: () => {
      void (async () => {
        const next = !robloxModeItem.checked;
        await options.setRobloxMode(next);
        robloxModeItem.checked = next;
        systray.sendAction({ type: "update-item", item: robloxModeItem });
      })();
    },
  };

  const resetPasswordItem: TrayMenuItem = {
    title: "Reset password…",
    tooltip: "Generate a new random word password",
    checked: false,
    enabled: true,
    click: () => {
      void (async () => {
        try {
          const { username, password } = await resetLoginPassword();
          await showInfoDialog(
            "RemotePad: new password",
            `User: ${username}\nPass: ${password}\n\nSave this before closing.`,
          );
        } catch (err) {
          await showInfoDialog(
            "RemotePad: password reset failed",
            err instanceof Error ? err.message : "Could not reset password.",
          );
        }
      })();
    },
  };

  const createPasswordItem: TrayMenuItem = {
    title: "Create new password…",
    tooltip: "Choose your own password (6+ characters)",
    checked: false,
    enabled: process.platform === "win32",
    click: () => {
      void (async () => {
        try {
          const password = await showPasswordCreateDialog();
          if (!password) {
            return;
          }
          const { username } = await createLoginPassword(password);
          await showInfoDialog(
            "RemotePad: password updated",
            `Login password changed for user "${username}".`,
          );
        } catch (err) {
          await showInfoDialog(
            "RemotePad: password update failed",
            err instanceof Error ? err.message : "Could not update password.",
          );
        }
      })();
    },
  };

  const fixFirewallItem: TrayMenuItem = {
    title: "Fix firewall rule",
    tooltip: "Allow LAN access on private networks",
    checked: false,
    enabled: process.platform === "win32",
    click: () => {
      void (async () => {
        try {
          const result = await repairFirewallRule(options.port);
          await showInfoDialog(
            result.ok ? "RemotePad: firewall" : "RemotePad: firewall failed",
            result.message,
          );
        } catch (err) {
          await showInfoDialog(
            "RemotePad: firewall failed",
            err instanceof Error ? err.message : "Could not update firewall rule.",
          );
        }
      })();
    },
  };

  const settingsItem: TrayMenuItem = {
    title: "Settings",
    tooltip: "RemotePad settings",
    checked: false,
    enabled: true,
    items: [robloxModeItem, resetPasswordItem, createPasswordItem, fixFirewallItem],
  };

  const quitItem: TrayMenuItem = {
    title: "Quit",
    tooltip: "Stop RemotePad",
    checked: false,
    enabled: true,
    click: () => {
      options.onQuit();
    },
  };

  const systray = new SysTray({
    menu: {
      icon,
      title: "RemotePad",
      tooltip,
      items: [openUrlItem, SysTray.separator, settingsItem, SysTray.separator, quitItem],
    },
    debug: false,
    copyDir: false,
  });

  systray.onClick((action) => {
    action.item?.click?.();
  });

  return {
    kill: () => systray.kill(false),
  };
}
