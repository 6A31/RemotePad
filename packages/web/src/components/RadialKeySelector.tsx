import { HoldKeyButton } from "./HoldKeyButton";

interface RadialKeySelectorProps {
  keys: string[];
  ariaLabel: string;
  onDismiss: () => void;
  onKeyDown: (key: string) => void;
  onKeyUp: (key: string) => void;
}

const RADIAL_RADIUS_PX = 76;

export function RadialKeySelector({
  keys,
  ariaLabel,
  onDismiss,
  onKeyDown,
  onKeyUp,
}: RadialKeySelectorProps) {
  const size = RADIAL_RADIUS_PX * 2 + 56;

  return (
    <div className="radial-selector-overlay" onClick={onDismiss}>
      <div
        className="radial-selector"
        style={{ width: size, height: size }}
        role="group"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
      >
        {keys.map((key, index) => {
          const angle = (Math.PI * 2 * index) / keys.length - Math.PI / 2;
          const x = Math.cos(angle) * RADIAL_RADIUS_PX + size / 2;
          const y = Math.sin(angle) * RADIAL_RADIUS_PX + size / 2;

          return (
            <HoldKeyButton
              key={key}
              label={key}
              ariaLabel={`${key} key`}
              className="hold-key-button radial-key-button"
              onPress={() => onKeyDown(key)}
              onRelease={() => onKeyUp(key)}
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: "translate(-50%, -50%)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
