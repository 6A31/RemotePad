import {
  parseServerMessage,
  decodeFrameBinary,
  type ClientMessage,
  type StreamQuality,
} from "@remotepad/protocol";
import { getStoredQuality } from "../lib/streamQuality";

export type ConnectionState = "disconnected" | "connecting" | "authenticating" | "connected";

export type FrameHandler = (frame: {
  jpeg: Uint8Array;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  seq: number;
}) => void;

export class RemotePadClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private frameHandler: FrameHandler | null = null;
  private onStateChange: ((state: ConnectionState) => void) | null = null;
  private onError: ((message: string) => void) | null = null;
  private state: ConnectionState = "disconnected";
  private streaming = false;
  private quality: StreamQuality = getStoredQuality();

  setToken(token: string): void {
    this.token = token;
  }

  onFrame(handler: FrameHandler): void {
    this.frameHandler = handler;
  }

  onConnectionState(handler: (state: ConnectionState) => void): void {
    this.onStateChange = handler;
  }

  onConnectionError(handler: (message: string) => void): void {
    this.onError = handler;
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.onStateChange?.(state);
  }

  connect(): void {
    if (this.ws) {
      this.ws.close();
    }

    this.setState("connecting");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    this.ws = new WebSocket(wsUrl);
    this.ws.binaryType = "arraybuffer";
    this.setState("authenticating");

    this.ws.onopen = () => {
      if (!this.token) {
        this.onError?.("Missing auth token");
        this.ws?.close();
        return;
      }
      this.send({ type: "auth", token: this.token });
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
      this.ws = null;
      this.setState("disconnected");
    };

    this.ws.onerror = () => {
      this.onError?.("WebSocket connection failed");
    };
  }

  disconnect(): void {
    this.stopStream();
    this.ws?.close();
    this.ws = null;
    this.setState("disconnected");
  }

  private handleMessage(data: unknown): void {
    const message = parseServerMessage(data);
    if (!message) {
      this.onError?.("Invalid server message");
      return;
    }

    switch (message.type) {
      case "auth.ok":
        this.setState("connected");
        break;
      case "auth.fail":
        this.onError?.(message.error);
        this.ws?.close();
        break;
      case "error":
        this.onError?.(message.message);
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
      this.send({ type: "stream.setQuality", quality });
    }
  }

  startStream(): void {
    if (this.state !== "connected" || this.streaming) return;
    this.streaming = true;
    this.send({ type: "stream.start", quality: this.quality });
  }

  stopStream(): void {
    if (!this.streaming) return;
    this.streaming = false;
    this.send({ type: "stream.stop" });
  }

  moveMouseRelative(dx: number, dy: number): void {
    this.send({ type: "mouse.move", dx, dy });
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
