import { hostname } from "node:os";
import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config.js";
import { getPrimaryMonitorInfo } from "../capture/monitor-info.js";

export function registerInfoRoute(app: FastifyInstance, config: AppConfig): void {
  app.get("/api/info", async () => {
    const display = getPrimaryMonitorInfo();
    return {
      hostname: hostname(),
      port: config.port,
      displayWidth: display.inputWidth,
      displayHeight: display.inputHeight,
    };
  });
}
