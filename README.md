# RemotePad

Control your Windows PC from another device on your home network. View the screen in a browser, or use touch controls from your phone.

RemotePad runs in the background on your PC and serves a small website over WiFi. No cloud, no signup, nothing exposed to the internet.

## What you need

- Windows 10 or later
- Node.js 18+
- Your PC and phone on the same network

## Setup

```bash
npm install
npm run dev
```

Dev mode:
- Host: `http://127.0.0.1:9470`
- Web UI: `http://127.0.0.1:5173`

The first time you run it, a password is printed in the console and shown in the tray tooltip. Username is `admin`.

### Login credentials

- **Username:** `admin` (unless you changed it)
- **Password:** random, generated on first run and shown once in the console/tray

The password is stored as a bcrypt hash in config. You can't read it back out of the file.

**Change password:**

```bash
npm run change-password
```

Set a new password:

```bash
npm run change-password -- my-new-password
```

Change username too (second argument):

```bash
npm run change-password -- my-new-password me
```

Note: `npm run` eats flags like `--username=me` before they reach the script. Use the two-argument form above, or run the cmd file instead:

```bat
change-password.cmd my-new-password --username=me
```

For normal use:

```bash
npm run build
npm run start
```

On your phone, open `http://<your-pc-ip>:9470`.

To find your PC's IP, run `ipconfig` and look for the IPv4 address on your WiFi or Ethernet adapter (usually something like `192.168.1.42`).

## Features

**Desktop view**
- Live screen stream (~18 fps, scaled down for WiFi)
- Mouse movement, clicks, and right-clicks

**Mobile view**
- Left side: WASD stick
- Right side: touchpad (drag to move, tap to click, hold for right click)

## Firewall

If your phone times out when connecting, Windows Firewall is probably blocking port 9470. Right-click `setup-firewall.cmd` and run it as Administrator.

Or add the rule yourself: Windows Defender Firewall > Advanced settings > Inbound Rules > New Rule > Port > TCP > 9470 > Allow > Private networks only.

Don't allow this on public networks.

## Config

Stored at `%APPDATA%\RemotePad\config.json`. Has your hashed password, port (default 9470), and signing key. Delete the file to reset everything and get a new password.

## Security

- Connections from public IPs are blocked
- Every session needs a password
- Password is bcrypt-hashed on disk
- Don't port-forward this

## Project layout

```
packages/
  protocol/   Shared message types for the WebSocket
  host/       PC app (screen capture, input, server, tray)
  web/        Browser UI
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start host and Vite dev server |
| `npm run build` | Build everything |
| `npm run start` | Run the host |
| `npm run stop` | Kill the host process |
| `npm run change-password` | Set a new password (and optionally username) |
| `npm run test:security` | Run auth and endpoint security tests |
| `npm run typecheck` | Check types |
