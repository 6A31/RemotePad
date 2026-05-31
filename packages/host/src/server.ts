import { networkInterfaces } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import type { WebSocket } from "ws";
import {
  AUTH_TIMEOUT_MS,
  LoginRequestSchema,
  parseClientMessage,
  type ClientMessage,
} from "@remotepad/protocol";
import type { FastifyInstance } from "fastify";
import type { AppConfig } from "./config.js";
import { ScreenCapture, type ScreenCaptureLike } from "./capture/screen.js";
import {
  keyDown,
  keyUp,
  mouseClick,
  mouseDown,
  mouseUp,
  moveMouseAbsolute,
  moveMouseRelative,
  releaseAllKeys,
} from "./input/injector.js";
import { issueToken, verifyPassword, verifyToken } from "./security/auth.js";
import { isPrivateOrLocalIp, rejectReason } from "./security/ip-filter.js";
import { registerInfoRoute } from "./routes/info.js";
import { frameToBinaryPacket, shouldSendFrame } from "./stream/frame-sender.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const failedAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const entry = failedAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    failedAttempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_FAILED_ATTEMPTS;
}

function recordFailedAttempt(ip: string): void {
  const entry = failedAttempts.get(ip);
  if (!entry || Date.now() > entry.resetAt) {
    failedAttempts.set(ip, { count: 1, resetAt: Date.now() + LOCKOUT_MS });
    return;
  }
  entry.count += 1;
}

function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

export function resetRateLimits(): void {
  failedAttempts.clear();
}

export interface ServerOptions {
  config: AppConfig;
  webDistPath?: string;
  screen?: ScreenCaptureLike;
  logger?: boolean;
}

function isVirtualInterface(name: string): boolean {
  return /veth|wsl|hyper-v|virtualbox|vmware|docker|vethernet|npcap|loopback|tailscale|zerotier|hamachi/i.test(
    name,
  );
}

function getLanAddresses(): string[] {
  const addresses: string[] = [];
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    if (isVirtualInterface(name)) continue;
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

export function getServerUrls(port: number): string[] {
  const urls = [`http://127.0.0.1:${port}`];
  for (const addr of getLanAddresses()) {
    urls.push(`http://${addr}:${port}`);
  }
  return urls;
}

async function handleClientMessage(
  message: ClientMessage,
  socket: WebSocket,
  ctx: {
    authenticated: boolean;
    streaming: boolean;
    unsubscribe: (() => void) | null;
    screen: ScreenCaptureLike;
  },
): Promise<{ authenticated?: boolean; streaming?: boolean; unsubscribe?: (() => void) | null }> {
  if (message.type === "auth") {
    return {};
  }

  if (!ctx.authenticated) {
    socket.send(JSON.stringify({ type: "error", message: "Not signed in" }));
    return {};
  }

  switch (message.type) {
    case "stream.start": {
      if (message.quality && "setQuality" in ctx.screen && typeof ctx.screen.setQuality === "function") {
        ctx.screen.setQuality(message.quality);
      }
      if (ctx.unsubscribe) {
        ctx.unsubscribe();
      }
      const unsubscribe = ctx.screen.subscribe((frame) => {
        if (!shouldSendFrame(socket, socket.OPEN)) return;
        socket.send(frameToBinaryPacket(frame));
      });
      return { streaming: true, unsubscribe };
    }
    case "stream.stop": {
      ctx.unsubscribe?.();
      return { streaming: false, unsubscribe: null };
    }
    case "stream.setQuality": {
      if ("setQuality" in ctx.screen && typeof ctx.screen.setQuality === "function") {
        ctx.screen.setQuality(message.quality);
      }
      break;
    }
    case "mouse.move":
      await moveMouseRelative(message.dx, message.dy);
      break;
    case "mouse.moveAbs":
      await moveMouseAbsolute(message.x, message.y);
      break;
    case "mouse.down":
      await mouseDown(message.button);
      break;
    case "mouse.up":
      await mouseUp(message.button);
      break;
    case "mouse.click":
      await mouseClick(message.button);
      break;
    case "key.down":
      await keyDown(message.key);
      break;
    case "key.up":
      await keyUp(message.key);
      break;
  }

  return {};
}

export async function buildServer(options: ServerOptions): Promise<FastifyInstance> {
  const { config, webDistPath, screen = new ScreenCapture(), logger = false } = options;

  const app = Fastify({
    logger,
    trustProxy: false,
  });

  app.addHook("onRequest", async (request, reply) => {
    const ip = request.ip;
    if (!isPrivateOrLocalIp(ip)) {
      request.log.warn(rejectReason(ip));
      return reply.code(403).send({ error: "Not allowed from this network" });
    }
  });

  registerInfoRoute(app, config);

  app.post("/api/login", async (request, reply) => {
    const ip = request.ip;
    if (isRateLimited(ip)) {
      return reply.code(429).send({ error: "Too many tries. Wait a minute." });
    }

    const parsed = LoginRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid login payload" });
    }

    const valid = await verifyPassword(
      config,
      parsed.data.username,
      parsed.data.password,
    );
    if (!valid) {
      recordFailedAttempt(ip);
      return reply.code(401).send({ error: "Wrong username or password" });
    }

    clearFailedAttempts(ip);
    const token = issueToken(config);
    return { token };
  });

  await app.register(fastifyWebsocket);

  app.get("/ws", { websocket: true }, (socket, request) => {
    const ip = request.ip;
    if (!isPrivateOrLocalIp(ip)) {
      request.log.warn(rejectReason(ip));
      socket.close(4003, "Forbidden");
      return;
    }

    let authenticated = false;
    let streaming = false;
    let unsubscribe: (() => void) | null = null;

    const authTimer = setTimeout(() => {
      if (!authenticated) {
        socket.close(4001, "Authentication timeout");
      }
    }, AUTH_TIMEOUT_MS);

    socket.on("message", async (raw) => {
      try {
        const data = JSON.parse(String(raw));
        const message = parseClientMessage(data);
        if (!message) {
          socket.send(JSON.stringify({ type: "error", message: "Invalid message" }));
          return;
        }

        if (message.type === "auth") {
          if (authenticated) return;

          let ok = false;
          if (message.token && verifyToken(config, message.token)) {
            ok = true;
          } else if (
            message.password &&
            (await verifyPassword(config, config.username, message.password))
          ) {
            ok = true;
          }

          if (ok) {
            authenticated = true;
            clearTimeout(authTimer);
            clearFailedAttempts(ip);
            socket.send(JSON.stringify({ type: "auth.ok" }));
          } else {
            recordFailedAttempt(ip);
            socket.send(
              JSON.stringify({ type: "auth.fail", error: "Wrong username or password" }),
            );
            socket.close(4001, "Authentication failed");
          }
          return;
        }

        const result = await handleClientMessage(message, socket, {
          authenticated,
          streaming,
          unsubscribe,
          screen,
        });

        if (result.authenticated !== undefined) authenticated = result.authenticated;
        if (result.streaming !== undefined) streaming = result.streaming;
        if (result.unsubscribe !== undefined) unsubscribe = result.unsubscribe;
      } catch (err) {
        request.log.error(err);
        socket.send(JSON.stringify({ type: "error", message: "Internal error" }));
      }
    });

    socket.on("close", async () => {
      clearTimeout(authTimer);
      unsubscribe?.();
      if (authenticated) {
        await releaseAllKeys();
      }
    });
  });

  const staticRoot =
    webDistPath ?? join(__dirname, "../../web/dist");

  await app.register(fastifyStatic, {
    root: staticRoot,
    wildcard: false,
  });

  app.setNotFoundHandler(async (request, reply) => {
    if (request.raw.url?.startsWith("/api") || request.raw.url?.startsWith("/ws")) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.sendFile("index.html");
  });

  return app;
}

export async function createServer(options: ServerOptions): Promise<FastifyInstance> {
  const app = await buildServer({ ...options, logger: true });
  await app.listen({ host: "0.0.0.0", port: options.config.port });
  return app;
}
