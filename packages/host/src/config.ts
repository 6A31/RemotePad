import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { DEFAULT_PORT } from "@remotepad/protocol";

export interface AppConfig {
  username: string;
  passwordHash: string;
  port: number;
  jwtSecret: string;
}

const CONFIG_DIR = join(homedir(), "AppData", "Roaming", "RemotePad");
const DEFAULT_CONFIG_PATH = join(CONFIG_DIR, "config.json");

let cachedPlainPassword: string | null = null;

function generatePassword(): string {
  return randomBytes(9).toString("base64url");
}

export async function loadConfig(): Promise<AppConfig> {
  try {
    const raw = await readFile(getConfigPath(), "utf8");
    return JSON.parse(raw) as AppConfig;
  } catch {
    const plainPassword = generatePassword();
    const config: AppConfig = {
      username: "admin",
      passwordHash: await bcrypt.hash(plainPassword, 12),
      port: DEFAULT_PORT,
      jwtSecret: randomBytes(32).toString("hex"),
    };
    await saveConfig(config);
    cachedPlainPassword = plainPassword;
    return config;
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  const configPath = getConfigPath();
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2), "utf8");
}

export async function updatePassword(plainPassword: string): Promise<void> {
  const config = await loadConfig();
  config.passwordHash = await bcrypt.hash(plainPassword, 12);
  await saveConfig(config);
}

export async function updateUsername(username: string): Promise<void> {
  const config = await loadConfig();
  config.username = username;
  await saveConfig(config);
}

export function getFirstRunPassword(): string | null {
  return cachedPlainPassword;
}

export function clearFirstRunPassword(): void {
  cachedPlainPassword = null;
}

export function getConfigPath(): string {
  return process.env.REMOTEPAD_CONFIG_PATH ?? DEFAULT_CONFIG_PATH;
}
