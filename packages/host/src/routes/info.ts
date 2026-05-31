import { hostname } from "node:os";
import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config.js";

export function registerInfoRoute(app: FastifyInstance, config: AppConfig): void {
  app.get("/api/info", async () => ({
    hostname: hostname(),
    port: config.port,
  }));
}
