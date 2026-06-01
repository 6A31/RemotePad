import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function encodePowerShell(script: string): string {
  return Buffer.from(script, "utf16le").toString("base64");
}

export async function showInfoDialog(title: string, message: string): Promise<void> {
  if (process.platform !== "win32") {
    console.log(`[dialog] ${title}\n${message}`);
    return;
  }

  const safeTitle = title.replace(/'/g, "''");
  const safeMessage = message.replace(/'/g, "''");
  const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.MessageBox]::Show(
  '${safeMessage}',
  '${safeTitle}',
  [System.Windows.Forms.MessageBoxButtons]::OK,
  [System.Windows.Forms.MessageBoxIcon]::Information
) | Out-Null
`.trim();

  await execFileAsync("powershell", ["-NoProfile", "-EncodedCommand", encodePowerShell(script)]);
}
