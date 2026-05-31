export function keyboardEventToProtocolKey(event: { key: string }): string | null {
  const { key } = event;

  switch (key) {
    case " ":
    case "Spacebar":
      return "space";
    case "Enter":
      return "enter";
    case "Escape":
      return "escape";
    case "Tab":
      return "tab";
    case "Backspace":
      return "backspace";
    case "Delete":
      return "delete";
    case "ArrowUp":
      return "up";
    case "ArrowDown":
      return "down";
    case "ArrowLeft":
      return "left";
    case "ArrowRight":
      return "right";
    case "Shift":
      return "shift";
    case "Control":
      return "ctrl";
    case "Alt":
      return "alt";
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
      break;
  }

  if (key.length === 1) {
    return key.toLowerCase();
  }

  return null;
}
