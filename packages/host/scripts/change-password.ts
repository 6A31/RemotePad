#!/usr/bin/env tsx
import { randomBytes } from "node:crypto";
import { loadConfig, updatePassword, updateUsername, getConfigPath } from "../src/config.js";

function parseArgs(argv: string[]): { password?: string; username?: string } {
  let password: string | undefined;
  let username: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--username=")) {
      username = arg.slice("--username=".length);
    } else if (arg === "--username" || arg === "-u") {
      username = argv[++i];
    } else if (arg.startsWith("-")) {
      continue;
    } else if (!password) {
      password = arg;
    } else if (!username) {
      username = arg;
    }
  }

  if (!username && process.env.REMOTEPAD_USERNAME) {
    username = process.env.REMOTEPAD_USERNAME;
  }

  return { password, username };
}

const { password: passwordArg, username: newUsername } = parseArgs(process.argv.slice(2));
const newPassword = passwordArg ?? randomBytes(9).toString("base64url");

await loadConfig();
await updatePassword(newPassword);
if (newUsername) {
  await updateUsername(newUsername);
}

const config = await loadConfig();
console.log("Credentials updated.");
console.log(`  config: ${getConfigPath()}`);
console.log(`  user:   ${config.username}`);
console.log(`  pass:   ${newPassword}`);
