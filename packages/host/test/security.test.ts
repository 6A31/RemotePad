import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import type { AddressInfo } from "node:net";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import WebSocket from "ws";
import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../src/config.js";
import { buildServer, resetRateLimits } from "../src/server.js";
import { issueToken } from "../src/security/auth.js";
import { AUTH_TIMEOUT_MS, decodeFrameBinary } from "@remotepad/protocol";
import { MockScreenCapture } from "./mock-screen.js";

const TEST_USER = "admin";
const TEST_PASSWORD = "correct-horse-battery";

async function makeConfig(overrides: Partial<AppConfig> = {}): Promise<AppConfig> {
  return {
    username: TEST_USER,
    passwordHash: await bcrypt.hash(TEST_PASSWORD, 4),
    port: 0,
    jwtSecret: "test-jwt-secret-value",
    ...overrides,
  };
}

async function makeWebRoot(): Promise<string> {
  const dir = join(tmpdir(), `remotepad-web-${randomBytes(4).toString("hex")}`);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.html"), "<!doctype html><html></html>");
  return dir;
}

async function startServer(
  config: AppConfig,
  screen = new MockScreenCapture(),
): Promise<{ app: FastifyInstance; port: number; screen: MockScreenCapture; webDir: string }> {
  resetRateLimits();
  const webDir = await makeWebRoot();
  const app = await buildServer({ config, webDistPath: webDir, screen });
  await app.listen({ port: 0, host: "127.0.0.1" });
  const address = app.server.address() as AddressInfo;
  return { app, port: address.port, screen, webDir };
}

function openWs(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
}

function waitForMessage(ws: WebSocket, timeoutMs = 3000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("message timeout")), timeoutMs);
    ws.once("message", (data, isBinary) => {
      clearTimeout(timer);
      if (isBinary) {
        const frame = decodeFrameBinary(data as Buffer);
        resolve(frame ? { type: "frame", seq: frame.seq } : null);
        return;
      }
      resolve(JSON.parse(String(data)));
    });
  });
}

function waitForClose(ws: WebSocket, timeoutMs = 8000): Promise<number> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("close timeout")), timeoutMs);
    ws.once("close", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
}

function closeWs(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.CLOSED) {
      resolve();
      return;
    }
    ws.once("close", () => resolve());
    ws.close();
  });
}

describe("security", () => {
  let app: FastifyInstance;
  let port = 0;
  let config: AppConfig;
  let screen: MockScreenCapture;
  let webDir = "";

  beforeEach(async () => {
    config = await makeConfig();
    screen = new MockScreenCapture();
    ({ app, port, screen, webDir } = await startServer(config, screen));
  });

  afterEach(async () => {
    await app.close();
    await rm(webDir, { recursive: true, force: true });
  });

  describe("HTTP /api/login", () => {
    const badBodies = [
      { name: "empty body", body: undefined, status: 400 },
      { name: "empty object", body: {}, status: 400 },
      { name: "missing password", body: { username: TEST_USER }, status: 400 },
      { name: "missing username", body: { password: TEST_PASSWORD }, status: 400 },
      { name: "empty username", body: { username: "", password: TEST_PASSWORD }, status: 400 },
      { name: "empty password", body: { username: TEST_USER, password: "" }, status: 400 },
      { name: "null password", body: { username: TEST_USER, password: null }, status: 400 },
      { name: "wrong password", body: { username: TEST_USER, password: "nope" }, status: 401 },
      { name: "wrong username", body: { username: "root", password: TEST_PASSWORD }, status: 401 },
      { name: "random credentials", body: { username: "x", password: "y" }, status: 401 },
    ] as const;

    for (const testCase of badBodies) {
      it(`rejects login: ${testCase.name}`, async () => {
        const res = await app.inject({
          method: "POST",
          url: "/api/login",
          payload: testCase.body,
        });
        assert.equal(res.statusCode, testCase.status);
        assert.equal("token" in res.json(), false);
      });
    }

    it("returns a token only for valid credentials", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/login",
        payload: { username: TEST_USER, password: TEST_PASSWORD },
      });
      assert.equal(res.statusCode, 200);
      assert.ok(res.json().token);
    });
  });

  describe("HTTP public vs protected data", () => {
    it("exposes only hostname and port on /api/info", async () => {
      const res = await app.inject({ method: "GET", url: "/api/info" });
      assert.equal(res.statusCode, 200);
      const body = res.json();
      assert.deepEqual(Object.keys(body).sort(), ["hostname", "port"]);
      assert.equal(body.port, config.port);
      assert.ok(typeof body.hostname === "string");
    });

    it("does not expose config or tokens on random API paths", async () => {
      const paths = [
        "/api/config",
        "/api/config.json",
        "/api/token",
        "/api/admin",
        "/api/password",
        "/api/../config.json",
        "/api/%2e%2e/config.json",
      ];

      for (const url of paths) {
        for (const method of ["GET", "POST", "PUT", "DELETE"] as const) {
          const res = await app.inject({ method, url, payload: { anything: true } });
          const text = res.body ?? "";
          assert.equal(text.includes("passwordHash"), false, `${method} ${url} leaked hash`);
          assert.equal(text.includes("jwtSecret"), false, `${method} ${url} leaked secret`);
          if (res.statusCode === 200 && res.headers["content-type"]?.includes("json")) {
            const body = res.json();
            assert.equal("token" in body, false, `${method} ${url} returned token`);
            assert.equal("passwordHash" in body, false, `${method} ${url} returned hash`);
          }
        }
      }
    });
  });

  describe("WebSocket auth", () => {
    it("closes unauthenticated connections after timeout", async () => {
      const ws = await openWs(port);
      const code = await waitForClose(ws, AUTH_TIMEOUT_MS + 2000);
      assert.equal(code, 4001);
    });

    it("rejects missing auth", async () => {
      const ws = await openWs(port);
      ws.send(JSON.stringify({ type: "auth" }));
      const msg = (await waitForMessage(ws)) as { type: string };
      assert.equal(msg.type, "auth.fail");
      await waitForClose(ws);
    });

    it("rejects empty password and token", async () => {
      const ws = await openWs(port);
      ws.send(JSON.stringify({ type: "auth", password: "", token: "" }));
      const msg = (await waitForMessage(ws)) as { type: string };
      assert.equal(msg.type, "auth.fail");
      await waitForClose(ws);
    });

    it("rejects wrong password", async () => {
      const ws = await openWs(port);
      ws.send(JSON.stringify({ type: "auth", password: "bad" }));
      const msg = (await waitForMessage(ws)) as { type: string };
      assert.equal(msg.type, "auth.fail");
      await waitForClose(ws);
    });

    it("rejects random token", async () => {
      const ws = await openWs(port);
      ws.send(JSON.stringify({ type: "auth", token: "not.a.real.token" }));
      const msg = (await waitForMessage(ws)) as { type: string };
      assert.equal(msg.type, "auth.fail");
      await waitForClose(ws);
    });

    it("rejects tampered token", async () => {
      const token = issueToken(config);
      const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
      const ws = await openWs(port);
      ws.send(JSON.stringify({ type: "auth", token: tampered }));
      const msg = (await waitForMessage(ws)) as { type: string };
      assert.equal(msg.type, "auth.fail");
      await waitForClose(ws);
    });

    it("rejects token signed with a different secret", async () => {
      const otherToken = jwt.sign({ sub: TEST_USER }, "other-secret", { expiresIn: "1h" });
      const ws = await openWs(port);
      ws.send(JSON.stringify({ type: "auth", token: otherToken }));
      const msg = (await waitForMessage(ws)) as { type: string };
      assert.equal(msg.type, "auth.fail");
      await waitForClose(ws);
    });

    it("accepts valid token from /api/login", async () => {
      const login = await app.inject({
        method: "POST",
        url: "/api/login",
        payload: { username: TEST_USER, password: TEST_PASSWORD },
      });
      const token = login.json().token as string;

      const ws = await openWs(port);
      ws.send(JSON.stringify({ type: "auth", token }));
      const msg = (await waitForMessage(ws)) as { type: string };
      assert.equal(msg.type, "auth.ok");
      await closeWs(ws);
    });
  });

  describe("WebSocket actions without auth", () => {
    const blockedMessages = [
      { type: "stream.start" },
      { type: "stream.stop" },
      { type: "stream.setQuality", quality: "high" },
      { type: "mouse.move", dx: 1, dy: 1 },
      { type: "mouse.moveAbs", x: 10, y: 10 },
      { type: "mouse.click", button: "left" },
      { type: "mouse.down", button: "left" },
      { type: "mouse.up", button: "left" },
      { type: "key.down", key: "w" },
      { type: "key.up", key: "w" },
    ] as const;

    for (const payload of blockedMessages) {
      it(`blocks ${payload.type} before auth`, async () => {
        const ws = await openWs(port);
        ws.send(JSON.stringify(payload));
        const msg = (await waitForMessage(ws)) as { type: string; message?: string };
        assert.equal(msg.type, "error");
        assert.equal(msg.message, "Not signed in");
        assert.equal(screen.subscriberCount, 0);
        await closeWs(ws);
      });
    }

    it("blocks garbage messages before auth", async () => {
      const ws = await openWs(port);
      ws.send(JSON.stringify({ type: "not.real", foo: "bar" }));
      const msg = (await waitForMessage(ws)) as { type: string };
      assert.equal(msg.type, "error");
      assert.equal(screen.subscriberCount, 0);
      await closeWs(ws);
    });

    it("blocks invalid JSON", async () => {
      const ws = await openWs(port);
      ws.send("{ this is not json");
      const msg = (await waitForMessage(ws)) as { type: string };
      assert.equal(msg.type, "error");
      await closeWs(ws);
    });
  });

  describe("WebSocket actions with auth", () => {
    async function authedWs(): Promise<WebSocket> {
      const login = await app.inject({
        method: "POST",
        url: "/api/login",
        payload: { username: TEST_USER, password: TEST_PASSWORD },
      });
      const token = login.json().token as string;
      const ws = await openWs(port);
      ws.send(JSON.stringify({ type: "auth", token }));
      const msg = (await waitForMessage(ws)) as { type: string };
      assert.equal(msg.type, "auth.ok");
      return ws;
    }

    it("allows stream.start only after auth", async () => {
      const ws = await authedWs();
      ws.send(JSON.stringify({ type: "stream.start" }));
      const frame = (await waitForMessage(ws)) as { type: string };
      assert.equal(frame.type, "frame");
      assert.equal(screen.subscriberCount, 1);
      await closeWs(ws);
    });

    it("still rejects invalid messages after auth", async () => {
      const ws = await authedWs();
      ws.send(JSON.stringify({ type: "admin.override", please: true }));
      const msg = (await waitForMessage(ws)) as { type: string };
      assert.equal(msg.type, "error");
      await closeWs(ws);
    });
  });
});

describe("rate limiting", () => {
  it("locks out repeated bad logins", async () => {
    const config = await makeConfig();
    const { app, port, webDir } = await startServer(config);
    try {
      for (let i = 0; i < 10; i++) {
        const res = await app.inject({
          method: "POST",
          url: "/api/login",
          payload: { username: TEST_USER, password: "wrong" },
        });
        assert.equal(res.statusCode, 401);
      }

      const locked = await app.inject({
        method: "POST",
        url: "/api/login",
        payload: { username: TEST_USER, password: "wrong" },
      });
      assert.equal(locked.statusCode, 429);
    } finally {
      await app.close();
      await rm(webDir, { recursive: true, force: true });
    }
  });
});
