import { useState } from "react";
import { tapKey } from "../lib/remoteTyping";
import { RadialKeySelector } from "./RadialKeySelector";
import { EmoteIcon } from "./MobileActionIcons";

const EMOTE_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8"];

interface EmoteButtonProps {
  onKeyDown: (key: string) => void;
  onKeyUp: (key: string) => void;
}

export function EmoteButton({ onKeyDown, onKeyUp }: EmoteButtonProps) {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    tapKey("period");
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        className="hold-key-button mobile-icon-button"
        aria-label="Emotes"
        aria-expanded={open}
        onClick={handleOpen}
      >
        <EmoteIcon />
      </button>
      {open && (
        <RadialKeySelector
          keys={EMOTE_KEYS}
          ariaLabel="Emote slots 1 through 8"
          onDismiss={() => setOpen(false)}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
        />
      )}
    </>
  );
}
