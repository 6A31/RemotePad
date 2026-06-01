import { loadConfig, updatePassword } from "./config.js";
import { generateWordPassword } from "./generate-password.js";

export async function resetLoginPassword(): Promise<{ username: string; password: string }> {
  const password = generateWordPassword();
  await updatePassword(password);
  const config = await loadConfig();
  return { username: config.username, password };
}

export async function createLoginPassword(
  plainPassword: string,
): Promise<{ username: string }> {
  await updatePassword(plainPassword);
  const config = await loadConfig();
  return { username: config.username };
}
