import { useState } from "react";
import { Backpack, Smile } from "lucide-react";
import { tapKey } from "../lib/remoteTyping";
import { RadialKeySelector } from "./RadialKeySelector";

const HOTBAR_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

type HotbarMode = "inventory" | "emote";

interface InventoryButtonProps {
  onKeyDown: (key: string) => void;
  onKeyUp: (key: string) => void;
}

export function InventoryButton({ onKeyDown, onKeyUp }: InventoryButtonProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<HotbarMode>("inventory");

  const toggleEmoteWheel = () => {
    tapKey("period");
  };

  const closeOverlay = (closeEmoteWheel: boolean) => {
    if (mode === "emote" && closeEmoteWheel) {
      toggleEmoteWheel();
    }
    setOpen(false);
  };

  const handleOpen = () => {
    setMode("inventory");
    setOpen(true);
  };

  const handleModeChange = (next: HotbarMode) => {
    if (next === mode) {
      closeOverlay(mode === "emote");
      return;
    }
    if (mode === "emote") {
      toggleEmoteWheel();
    }
    setMode(next);
    if (next === "emote") {
      toggleEmoteWheel();
    }
  };

  const handleDismiss = () => {
    closeOverlay(mode === "emote");
  };

  const handleSlotPress = (key: string) => {
    onKeyDown(key);
  };

  const handleSlotRelease = (key: string) => {
    onKeyUp(key);
    // Roblox closes the emote wheel when a slot is used; inventory needs no extra key.
    closeOverlay(false);
  };

  return (
    <>
      <button
        type="button"
        className="hold-key-button mobile-icon-button"
        aria-label="Inventory and emotes"
        aria-expanded={open}
        onClick={handleOpen}
      >
        <Backpack size={22} strokeWidth={2} aria-hidden="true" />
      </button>
      {open && (
        <RadialKeySelector
          keys={HOTBAR_KEYS}
          disabledKeys={mode === "emote" ? ["9"] : []}
          ariaLabel={
            mode === "emote" ? "Emote slots 1 through 8" : "Inventory slots 1 through 9"
          }
          header={
            <div className="radial-mode-toggle" role="group" aria-label="Hotbar mode">
              <button
                type="button"
                className={mode === "inventory" ? "active" : undefined}
                aria-pressed={mode === "inventory"}
                onClick={() => handleModeChange("inventory")}
              >
                <Backpack size={16} strokeWidth={2} aria-hidden="true" />
                <span>Inventory</span>
              </button>
              <button
                type="button"
                className={mode === "emote" ? "active" : undefined}
                aria-pressed={mode === "emote"}
                onClick={() => handleModeChange("emote")}
              >
                <Smile size={16} strokeWidth={2} aria-hidden="true" />
                <span>Emotes</span>
              </button>
            </div>
          }
          onDismiss={handleDismiss}
          onKeyDown={handleSlotPress}
          onKeyUp={handleSlotRelease}
        />
      )}
    </>
  );
}
