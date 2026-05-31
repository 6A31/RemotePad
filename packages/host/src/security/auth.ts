import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { AppConfig } from "../config.js";

const TOKEN_TTL = "24h";

export interface TokenPayload {
  sub: string;
}

export async function verifyPassword(
  config: AppConfig,
  username: string,
  password: string,
): Promise<boolean> {
  if (username !== config.username) {
    return false;
  }
  return bcrypt.compare(password, config.passwordHash);
}

export function issueToken(config: AppConfig): string {
  const payload: TokenPayload = { sub: config.username };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: TOKEN_TTL });
}

export function verifyToken(config: AppConfig, token: string): boolean {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
    return decoded.sub === config.username;
  } catch {
    return false;
  }
}
