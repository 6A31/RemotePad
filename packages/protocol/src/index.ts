import { z } from "zod";

export const DEFAULT_PORT = 9470;
export const AUTH_TIMEOUT_MS = 5000;

export const MouseButtonSchema = z.enum(["left", "right", "middle"]);
export type MouseButton = z.infer<typeof MouseButtonSchema>;

export const StreamQualitySchema = z.enum(["low", "medium", "high"]);
export type StreamQuality = z.infer<typeof StreamQualitySchema>;

export const ClientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("auth"),
    token: z.string().optional(),
    password: z.string().optional(),
  }),
  z.object({
    type: z.literal("stream.start"),
    quality: StreamQualitySchema.optional(),
  }),
  z.object({ type: z.literal("stream.stop") }),
  z.object({
    type: z.literal("stream.setQuality"),
    quality: StreamQualitySchema,
  }),
  z.object({
    type: z.literal("mouse.move"),
    dx: z.number(),
    dy: z.number(),
  }),
  z.object({
    type: z.literal("mouse.moveAbs"),
    x: z.number(),
    y: z.number(),
  }),
  z.object({
    type: z.literal("mouse.down"),
    button: MouseButtonSchema,
  }),
  z.object({
    type: z.literal("mouse.up"),
    button: MouseButtonSchema,
  }),
  z.object({
    type: z.literal("mouse.click"),
    button: MouseButtonSchema,
  }),
  z.object({
    type: z.literal("mouse.scroll"),
    dx: z.number(),
    dy: z.number(),
  }),
  z.object({
    type: z.literal("key.down"),
    key: z.string(),
  }),
  z.object({
    type: z.literal("key.up"),
    key: z.string(),
  }),
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;

export const ServerMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("auth.ok") }),
  z.object({
    type: z.literal("auth.fail"),
    error: z.string(),
  }),
  z.object({
    type: z.literal("frame"),
    jpeg: z.string(),
    width: z.number(),
    height: z.number(),
    sourceWidth: z.number(),
    sourceHeight: z.number(),
    seq: z.number(),
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
  }),
]);

export type ServerMessage = z.infer<typeof ServerMessageSchema>;

export const LoginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  token: z.string(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const HostInfoSchema = z.object({
  hostname: z.string(),
  port: z.number(),
});

export type HostInfo = z.infer<typeof HostInfoSchema>;

export function parseHostInfo(data: unknown): HostInfo | null {
  const result = HostInfoSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function parseClientMessage(data: unknown): ClientMessage | null {
  const result = ClientMessageSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function parseServerMessage(data: unknown): ServerMessage | null {
  const result = ServerMessageSchema.safeParse(data);
  return result.success ? result.data : null;
}

export {
  FRAME_BINARY_TYPE,
  FRAME_HEADER_SIZE,
  decodeFrameBinary,
  encodeFrameBinary,
  type BinaryFrame,
} from "./frame-binary.js";
