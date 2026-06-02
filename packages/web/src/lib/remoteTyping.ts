import { client } from "../ws/client";

const KEY_GAP_MS = 35;

/** US QWERTY: shifted symbol → unshifted protocol key name */
const SHIFTED_CHAR_KEYS: Record<string, string> = {
  "!": "1",
  "@": "2",
  "#": "3",
  "$": "4",
  "%": "5",
  "^": "6",
  "&": "7",
  "*": "8",
  "(": "9",
  ")": "0",
  "_": "minus",
  "+": "equal",
  "{": "leftbracket",
  "}": "rightbracket",
  "|": "backslash",
  ":": "semicolon",
  '"': "quote",
  "<": "comma",
  ">": "period",
  "?": "slash",
  "~": "grave",
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function tapKey(key: string): void {
  client.keyDown(key);
  client.keyUp(key);
}

function tapKeyWithShift(key: string): void {
  client.keyDown("shift");
  client.keyDown(key);
  client.keyUp(key);
  client.keyUp("shift");
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
  if (char.length !== 1) return;

  if (char >= "A" && char <= "Z") {
    tapKeyWithShift(char.toLowerCase());
    return;
  }

  const shiftedKey = SHIFTED_CHAR_KEYS[char];
  if (shiftedKey) {
    tapKeyWithShift(shiftedKey);
    return;
  }

  const key = charToProtocolKey(char);
  if (key) {
    tapKey(key);
  }
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
