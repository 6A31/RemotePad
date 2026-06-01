import { randomBytes } from "node:crypto";
import { loadConfig, updatePassword } from "./config.js";

export async function resetLoginPassword(): Promise<{ username: string; password: string }> {
  const password = randomBytes(9).toString("base64url");
  await updatePassword(password);
  const config = await loadConfig();
  return { username: config.username, password };
}
