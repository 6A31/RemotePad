import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function ruleName(port: number): string {
  return `RemotePad (${port})`;
}

async function ruleExists(port: number): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("netsh", [
      "advfirewall",
      "firewall",
      "show",
      "rule",
      `name=${ruleName(port)}`,
    ]);
    return stdout.includes(ruleName(port));
  } catch {
    return false;
  }
}

export async function ensureFirewallRule(
  port: number,
): Promise<{ ok: boolean; message: string }> {
  if (process.platform !== "win32") {
    return { ok: true, message: "" };
  }

  if (await ruleExists(port)) {
    return { ok: true, message: "Firewall rule already exists for private networks." };
  }

  try {
    await execFileAsync("netsh", [
      "advfirewall",
      "firewall",
      "add",
      "rule",
      `name=${ruleName(port)}`,
      "dir=in",
      "action=allow",
      "protocol=TCP",
      `localport=${port}`,
      "profile=private",
    ]);
    return { ok: true, message: "Added firewall rule for private networks." };
  } catch {
    return {
      ok: false,
      message:
        `Firewall may be blocking LAN access. Run setup-firewall.cmd as Administrator, or allow TCP ${port} on private networks.`,
    };
  }
}
