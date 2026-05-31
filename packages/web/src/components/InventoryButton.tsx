import { useState } from "react";
import { RadialKeySelector } from "./RadialKeySelector";
import { BackpackIcon } from "./MobileActionIcons";

const INVENTORY_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

interface InventoryButtonProps {
  onKeyDown: (key: string) => void;
  onKeyUp: (key: string) => void;
}

export function InventoryButton({ onKeyDown, onKeyUp }: InventoryButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="hold-key-button mobile-icon-button"
        aria-label="Inventory"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <BackpackIcon />
      </button>
      {open && (
        <RadialKeySelector
          keys={INVENTORY_KEYS}
          ariaLabel="Inventory slots 1 through 9"
          onDismiss={() => setOpen(false)}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
        />
      )}
    </>
  );
}
