import {
  parseServerMessage,
  decodeFrameBinary,
  type ClientMessage,
  type StreamQuality,
} from "@remotepad/protocol";
import { getStoredQuality } from "../lib/streamQuality";
import { getClientStreamMaxWidth } from "../lib/streamDisplay";

export type ConnectionState = "disconnected" | "connecting" | "authenticating" | "connected";

export type FrameHandler = (frame: {
  jpeg: Uint8Array;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  seq: number;
}) => void;

const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export class RemotePadClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private frameHandler: FrameHandler | null = null;
  private onStateChange: ((state: ConnectionState) => void) | null = null;
  private onError: ((message: string | null) => void) | null = null;
  private bandwidthWarningHandler: ((message: string | null) => void) | null = null;
  private state: ConnectionState = "disconnected";
  private streaming = false;
  private quality: StreamQuality = getStoredQuality();
  private wantReconnect = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private lifecycleHooksInstalled = false;
  private pendingGameMouseDx = 0;
  private pendingGameMouseDy = 0;
  private gameMouseFlushScheduled = false;
  private pendingScrollDx = 0;
  private pendingScrollDy = 0;
  private scrollFlushScheduled = false;

  setToken(token: string): void {
    this.token = token;
  }

  onFrame(handler: FrameHandler): void {
    this.frameHandler = handler;
  }

  onConnectionState(handler: (state: ConnectionState) => void): void {
    this.onStateChange = handler;
  }

  onConnectionError(handler: (message: string | null) => void): void {
    this.onError = handler;
  }

  onBandwidthWarning(handler: (message: string | null) => void): void {
    this.bandwidthWarningHandler = handler;
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.onStateChange?.(state);
  }

  private installLifecycleHooks(): void {
    if (this.lifecycleHooksInstalled || typeof document === "undefined") return;
    this.lifecycleHooksInstalled = true;

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        this.retryConnectionNow();
      }
    });

    window.addEventListener("online", () => {
      this.retryConnectionNow();
    });
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private detachSocket(): void {
    if (!this.ws) return;
    this.ws.onopen = null;
    this.ws.onmessage = null;
    this.ws.onclose = null;
    this.ws.onerror = null;
    this.ws = null;
  }

  private scheduleReconnect(): void {
    if (!this.wantReconnect || !this.token) {
      this.setState("disconnected");
      return;
    }

    this.clearReconnectTimer();
    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempt,
      MAX_RECONNECT_DELAY_MS,
    );
    this.reconnectAttempt += 1;
    this.setState("connecting");

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.wantReconnect && this.state !== "connected") {
        this.openConnection();
      }
    }, delay);
  }

  private retryConnectionNow(): void {
    if (!this.wantReconnect || !this.token) return;
    if (this.state === "connected" || this.state === "authenticating") return;
    if (this.ws?.readyState === WebSocket.CONNECTING) return;

    this.clearReconnectTimer();
    this.reconnectAttempt = 0;
    this.openConnection();
  }

  connect(): void {
    this.installLifecycleHooks();
    this.wantReconnect = true;
    this.reconnectAttempt = 0;
    this.clearReconnectTimer();
    this.openConnection();
  }

  disconnect(): void {
    this.wantReconnect = false;
    this.reconnectAttempt = 0;
    this.clearReconnectTimer();
    this.stopStream();

    if (this.ws) {
      this.ws.close();
      this.detachSocket();
    }

    this.bandwidthWarningHandler?.(null);
    this.setState("disconnected");
  }

  private openConnection(): void {
    if (this.ws) {
      this.ws.close();
      this.detachSocket();
    }

    if (!this.token) {
      this.wantReconnect = false;
      this.onError?.("Missing auth token");
      this.setState("disconnected");
      return;
    }

    this.setState("connecting");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    this.ws = new WebSocket(wsUrl);
    this.ws.binaryType = "arraybuffer";
    this.setState("authenticating");

    this.ws.onopen = () => {
      this.send({ type: "auth", token: this.token! });
    };

    this.ws.onmessage = (event) => {
      try {
        if (event.data instanceof ArrayBuffer) {
          const frame = decodeFrameBinary(event.data);
          if (frame) {
            this.frameHandler?.(frame);
          }
          return;
        }

        const data = JSON.parse(String(event.data));
        this.handleMessage(data);
      } catch {
        this.onError?.("Invalid server message");
      }
    };

    this.ws.onclose = () => {
      this.streaming = false;
      this.bandwidthWarningHandler?.(null);
      this.detachSocket();

      if (this.wantReconnect) {
        this.scheduleReconnect();
      } else {
        this.setState("disconnected");
      }
    };

    this.ws.onerror = () => {
      if (this.reconnectAttempt === 0) {
        this.onError?.("WebSocket connection failed");
      }
    };
  }

  private handleMessage(data: unknown): void {
    const message = parseServerMessage(data);
    if (!message) {
      this.onError?.("Invalid server message");
      return;
    }

    switch (message.type) {
      case "auth.ok":
        this.reconnectAttempt = 0;
        this.clearReconnectTimer();
        this.onError?.(null);
        this.setState("connected");
        break;
      case "auth.fail":
        this.wantReconnect = false;
        this.clearReconnectTimer();
        this.onError?.(message.error);
        this.ws?.close();
        break;
      case "error":
        this.onError?.(message.message);
        break;
      case "stream.warn":
        this.bandwidthWarningHandler?.(message.message);
        break;
      case "stream.ok":
        this.bandwidthWarningHandler?.(null);
        break;
      case "config.updated":
        window.dispatchEvent(new CustomEvent("remotepad-config-updated"));
        break;
    }
  }

  private send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  setQuality(quality: StreamQuality): void {
    this.quality = quality;
    if (this.streaming) {
      this.send({
        type: "stream.setQuality",
        quality,
        maxWidth: getClientStreamMaxWidth(),
      });
    }
  }

  updateStreamDisplayLimit(): void {
    if (!this.streaming) return;
    this.send({
      type: "stream.setQuality",
      quality: this.quality,
      maxWidth: getClientStreamMaxWidth(),
    });
  }

  startStream(): void {
    if (this.state !== "connected" || this.streaming) return;
    this.streaming = true;
    this.send({
      type: "stream.start",
      quality: this.quality,
      maxWidth: getClientStreamMaxWidth(),
    });
  }

  stopStream(): void {
    if (!this.streaming) return;
    this.streaming = false;
    this.send({ type: "stream.stop" });
  }

  moveMouseRelative(dx: number, dy: number, game = false): void {
    if (game) {
      this.pendingGameMouseDx += dx;
      this.pendingGameMouseDy += dy;
      this.scheduleGameMouseFlush();
      return;
    }
    this.send({ type: "mouse.move", dx, dy, game: false });
  }

  private scheduleGameMouseFlush(): void {
    if (this.gameMouseFlushScheduled) return;
    this.gameMouseFlushScheduled = true;

    requestAnimationFrame(() => {
      this.gameMouseFlushScheduled = false;
      this.flushGameMouse();
    });
  }

  flushGameMouse(): void {
    const dx = this.pendingGameMouseDx;
    const dy = this.pendingGameMouseDy;
    if (dx === 0 && dy === 0) return;

    this.pendingGameMouseDx = 0;
    this.pendingGameMouseDy = 0;
    this.send({ type: "mouse.move", dx, dy, game: true });
  }

  moveMouseAbsolute(x: number, y: number): void {
    this.send({ type: "mouse.moveAbs", x, y });
  }

  mouseClick(button: "left" | "right" | "middle" = "left"): void {
    this.send({ type: "mouse.click", button });
  }

  mouseDown(button: "left" | "right" | "middle" = "left"): void {
    this.send({ type: "mouse.down", button });
  }

  mouseUp(button: "left" | "right" | "middle" = "left"): void {
    this.send({ type: "mouse.up", button });
  }

  scrollMouse(dx: number, dy: number): void {
    this.pendingScrollDx += dx;
    this.pendingScrollDy += dy;
    this.scheduleScrollFlush();
  }

  private scheduleScrollFlush(): void {
    if (this.scrollFlushScheduled) return;
    this.scrollFlushScheduled = true;

    requestAnimationFrame(() => {
      this.scrollFlushScheduled = false;
      this.flushScroll();
    });
  }

  flushScroll(): void {
    const dx = this.pendingScrollDx;
    const dy = this.pendingScrollDy;
    if (dx === 0 && dy === 0) return;

    this.pendingScrollDx = 0;
    this.pendingScrollDy = 0;
    this.send({ type: "mouse.scroll", dx, dy });
  }

  keyDown(key: string): void {
    this.send({ type: "key.down", key });
  }

  keyUp(key: string): void {
    this.send({ type: "key.up", key });
  }

  get connected(): boolean {
    return this.state === "connected";
  }
}

export const client = new RemotePadClient();
