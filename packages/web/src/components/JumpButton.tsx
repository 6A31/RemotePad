import { HoldKeyButton } from "./HoldKeyButton";

interface JumpButtonProps {
  onPress: () => void;
  onRelease: () => void;
}

export function JumpButton({ onPress, onRelease }: JumpButtonProps) {
  return (
    <HoldKeyButton
      label="Jump"
      ariaLabel="Jump (spacebar)"
      className="hold-key-button jump-button"
      onPress={onPress}
      onRelease={onRelease}
    />
  );
}
