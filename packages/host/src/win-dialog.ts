import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

/** Lets the user type their own password (any length). Returns null if cancelled. */
export async function showPasswordCreateDialog(): Promise<string | null> {
  if (process.platform !== "win32") {
    console.log("[dialog] Create new password is only available on Windows.");
    return null;
  }

  const tempDir = await mkdtemp(join(tmpdir(), "remotepad-pwd-"));
  const outFile = join(tempDir, "password.txt");
  const safeOutFile = outFile.replace(/'/g, "''");

  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$form = New-Object System.Windows.Forms.Form
$form.Text = 'RemotePad: Create new password'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(360, 200)

$label = New-Object System.Windows.Forms.Label
$label.Location = New-Object System.Drawing.Point(12, 12)
$label.Size = New-Object System.Drawing.Size(330, 36)
$label.Text = 'Choose a login password. Use at least 6 characters.'
$form.Controls.Add($label)

$pwdLabel = New-Object System.Windows.Forms.Label
$pwdLabel.Location = New-Object System.Drawing.Point(12, 52)
$pwdLabel.Size = New-Object System.Drawing.Size(120, 20)
$pwdLabel.Text = 'Password'
$form.Controls.Add($pwdLabel)

$pwdBox = New-Object System.Windows.Forms.TextBox
$pwdBox.Location = New-Object System.Drawing.Point(12, 72)
$pwdBox.Size = New-Object System.Drawing.Size(330, 23)
$pwdBox.UseSystemPasswordChar = $true
$form.Controls.Add($pwdBox)

$confirmLabel = New-Object System.Windows.Forms.Label
$confirmLabel.Location = New-Object System.Drawing.Point(12, 98)
$confirmLabel.Size = New-Object System.Drawing.Size(120, 20)
$confirmLabel.Text = 'Confirm'
$form.Controls.Add($confirmLabel)

$confirmBox = New-Object System.Windows.Forms.TextBox
$confirmBox.Location = New-Object System.Drawing.Point(12, 118)
$confirmBox.Size = New-Object System.Drawing.Size(330, 23)
$confirmBox.UseSystemPasswordChar = $true
$form.Controls.Add($confirmBox)

$ok = New-Object System.Windows.Forms.Button
$ok.Location = New-Object System.Drawing.Point(186, 158)
$ok.Size = New-Object System.Drawing.Size(75, 28)
$ok.Text = 'OK'
$ok.DialogResult = [System.Windows.Forms.DialogResult]::None
$form.Controls.Add($ok)

$cancel = New-Object System.Windows.Forms.Button
$cancel.Location = New-Object System.Drawing.Point(267, 158)
$cancel.Size = New-Object System.Drawing.Size(75, 28)
$cancel.Text = 'Cancel'
$cancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
$form.Controls.Add($cancel)
$form.CancelButton = $cancel

$ok.Add_Click({
  if ([string]::IsNullOrWhiteSpace($pwdBox.Text)) {
    [System.Windows.Forms.MessageBox]::Show('Enter a password.', 'RemotePad', 'OK', 'Warning') | Out-Null
    return
  }
  if ($pwdBox.Text.Length -lt 6) {
    [System.Windows.Forms.MessageBox]::Show('Use at least 6 characters.', 'RemotePad', 'OK', 'Warning') | Out-Null
    return
  }
  if ($pwdBox.Text -ne $confirmBox.Text) {
    [System.Windows.Forms.MessageBox]::Show('Passwords do not match.', 'RemotePad', 'OK', 'Warning') | Out-Null
    return
  }
  [System.IO.File]::WriteAllText('${safeOutFile}', $pwdBox.Text)
  $form.DialogResult = [System.Windows.Forms.DialogResult]::OK
  $form.Close()
})

$form.AcceptButton = $ok
$result = $form.ShowDialog()
if ($result -ne [System.Windows.Forms.DialogResult]::OK) { exit 0 }
`.trim();

  try {
    await execFileAsync("powershell", ["-NoProfile", "-EncodedCommand", encodePowerShell(script)]);
    try {
      const password = (await readFile(outFile, "utf8")).trim();
      return password.length > 0 ? password : null;
    } catch {
      return null;
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
