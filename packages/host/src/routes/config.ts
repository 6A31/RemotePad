import type { FastifyInstance } from "fastify";
import { AppConfigPatchSchema } from "@remotepad/protocol";
import type { AppConfig } from "../config.js";
import { saveConfig } from "../config.js";
import { verifyToken } from "../security/auth.js";

function readBearerToken(authorization: string | undefined): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

export function registerConfigRoute(app: FastifyInstance, config: AppConfig): void {
  app.patch("/api/config", async (request, reply) => {
    const token = readBearerToken(request.headers.authorization);
    if (!token || !verifyToken(config, token)) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const parsed = AppConfigPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid config payload" });
    }

    if (parsed.data.robloxMode !== undefined) {
      config.robloxMode = parsed.data.robloxMode;
      await saveConfig(config);
    }

    return { robloxMode: config.robloxMode };
  });
}
