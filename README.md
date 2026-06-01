# RemotePad

Control your Windows PC from another device on your home network. View the screen in a browser, or use touch controls from your phone.

RemotePad runs in the background on your PC and serves a small website over WiFi. No cloud, no signup, nothing exposed to the internet.

## What you need

- Windows 10 or later
- Node.js 18+
- Your PC and phone on the same network

## Quick start (development)

```bash
npm install
npm run dev
```

This starts two things:

- **Host** at `http://127.0.0.1:9470` (screen capture, input, tray icon)
- **Web UI** at `http://127.0.0.1:5173` (the page you open in a browser)

For day-to-day use on your PC, build and run the host instead:

```bash
npm run build
npm run start
```

On your phone, open `http://<your-pc-ip>:9470`.

To find your PC's IP, run `ipconfig` and look for the IPv4 address on your WiFi or Ethernet adapter (usually something like `192.168.1.42`).

## Portable Windows build

To pack everything into a folder you can copy to another PC:

```bash
npm run build:win
```

Output goes to `out/RemotePad/`. The target PC still needs Node.js 18+ installed. Double-click `start.cmd` to run.

## Login

The first time you run RemotePad, a password is printed in the console and shown in the tray tooltip.

- **Username:** `admin` (unless you changed it)
- **Password:** four random words joined with hyphens, like `tiger-bridge-lemon-ocean`

The password is stored as a bcrypt hash in config. You cannot read it back out of the file later.

### Changing the password

**From the tray icon (easiest):** right-click the RemotePad icon in the system tray, open **Settings**, then:

- **Reset password** generates a new random word password and shows it in a dialog. Save it before closing.
- **Create new password** opens a form where you pick your own password (at least 6 characters).

**From the command line:**

Generate a new random word password:

```bash
npm run change-password
```

Set a specific password:

```bash
npm run change-password -- my-long-passphrase
```

Change username too (second argument):

```bash
npm run change-password -- my-long-passphrase me
```

Note: `npm run` eats flags like `--username=me` before they reach the script. Use the two-argument form above, or run the cmd file instead:

```bat
change-password.cmd my-long-passphrase --username=me
```

## Features

**Desktop view**

- Live screen stream (~18 fps, scaled down for WiFi)
- Mouse movement, clicks, and right-clicks

**Mobile view**

- Left side: WASD stick
- Right side: touchpad (drag to move, tap to click, hold for right click)
- Optional Roblox mode (inventory, emotes, chat) toggled from the tray

## Firewall

If your phone times out when connecting, Windows Firewall is probably blocking port 9470.

Right-click `setup-firewall.cmd` and run it as Administrator, or use **Settings > Fix firewall rule** in the tray menu.

You can also add the rule manually: Windows Defender Firewall > Advanced settings > Inbound Rules > New Rule > Port > TCP > 9470 > Allow > Private networks only.

Do not allow this on public networks.

## Config file

Stored at `%APPDATA%\RemotePad\config.json`. Holds your hashed password, port (default 9470), Roblox mode flag, and signing key.

Delete the file to reset everything and get a new random password on next launch.

## Security

- Connections from public IPs are blocked
- Every session needs a password
- Password is bcrypt-hashed on disk
- Do not port-forward this to the internet

## Project layout

```
packages/
  protocol/   Shared message types for the WebSocket
  host/       PC app (screen capture, input, server, tray)
  web/        Browser UI
assets/       Brand icon (synced to host and web on build)
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start host and Vite dev server |
| `npm run build` | Build everything |
| `npm run build:win` | Pack a portable folder into `out/RemotePad/` |
| `npm run start` | Run the host |
| `npm run stop` | Kill the host process |
| `npm run change-password` | Set a new password (and optionally username) |
| `npm run test:security` | Run auth and endpoint security tests |
| `npm run typecheck` | Check types |
