import { client } from "../ws/client";

const KEY_GAP_MS = 35;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function tapKey(key: string): void {
  client.keyDown(key);
  client.keyUp(key);
}

export function charToProtocolKey(char: string): string | null {
  if (char === " ") return "space";
  if (char.length !== 1) return null;
  const lower = char.toLowerCase();
  if (lower >= "a" && lower <= "z") return lower;
  if (char >= "0" && char <= "9") return char;
  switch (char) {
    case "-":
      return "minus";
    case "=":
      return "equal";
    case ",":
      return "comma";
    case ".":
      return "period";
    case "/":
      return "slash";
    case ";":
      return "semicolon";
    case "'":
      return "quote";
    case "\\":
      return "backslash";
    case "[":
      return "leftbracket";
    case "]":
      return "rightbracket";
    case "`":
      return "grave";
    default:
      return null;
  }
}

export function typeChar(char: string): void {
  const key = charToProtocolKey(char);
  if (key) tapKey(key);
}

export async function abortRemoteText(): Promise<void> {
  client.keyDown("ctrl");
  tapKey("a");
  client.keyUp("ctrl");
  await delay(KEY_GAP_MS);
  tapKey("backspace");
  await delay(KEY_GAP_MS);
  tapKey("enter");
}

export async function sendRemoteText(): Promise<void> {
  tapKey("enter");
}

export function openRobloxChat(): void {
  tapKey("minus");
}
