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
        "Firewall may be blocking LAN access. Use tray Settings → Fix firewall rule, or run setup-firewall.cmd as Administrator.",
    };
  }
}

function encodePowerShell(script: string): string {
  return Buffer.from(script, "utf16le").toString("base64");
}

async function ensureFirewallRuleElevated(port: number): Promise<{ ok: boolean; message: string }> {
  const name = ruleName(port);
  const script = `
$args = @(
  'advfirewall','firewall','add','rule',
  'name=${name.replace(/'/g, "''")}',
  'dir=in','action=allow','protocol=TCP',
  'localport=${port}','profile=private'
)
Start-Process -FilePath netsh -ArgumentList $args -Verb RunAs -Wait | Out-Null
`.trim();

  try {
    await execFileAsync("powershell", ["-NoProfile", "-EncodedCommand", encodePowerShell(script)]);
    if (await ruleExists(port)) {
      return {
        ok: true,
        message: "Firewall rule added. Other devices on your network can reach this PC.",
      };
    }
  } catch {
    // fall through
  }

  return {
    ok: false,
    message:
      "Could not add the firewall rule. Approve the UAC prompt, or run setup-firewall.cmd as Administrator.",
  };
}

export async function repairFirewallRule(
  port: number,
): Promise<{ ok: boolean; message: string }> {
  if (process.platform !== "win32") {
    return { ok: true, message: "Firewall rules are only managed on Windows." };
  }

  if (await ruleExists(port)) {
    return { ok: true, message: "Firewall rule is already in place for private networks." };
  }

  const direct = await ensureFirewallRule(port);
  if (await ruleExists(port)) {
    return {
      ok: true,
      message: direct.message || "Added firewall rule for private networks.",
    };
  }

  return ensureFirewallRuleElevated(port);
}
