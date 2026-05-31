import { useRef, type CSSProperties } from "react";

interface HoldKeyButtonProps {
  label: string;
  ariaLabel: string;
  className?: string;
  style?: CSSProperties;
  onPress: () => void;
  onRelease: () => void;
}

export function HoldKeyButton({
  label,
  ariaLabel,
  className,
  style,
  onPress,
  onRelease,
}: HoldKeyButtonProps) {
  const pointerIdRef = useRef<number | null>(null);
  const pressedRef = useRef(false);

  const release = (
    target: EventTarget & {
      hasPointerCapture?: (id: number) => boolean;
      releasePointerCapture?: (id: number) => void;
    },
    pointerId: number,
  ) => {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    pointerIdRef.current = null;
    onRelease();
    if (target.hasPointerCapture?.(pointerId)) {
      target.releasePointerCapture?.(pointerId);
    }
  };

  return (
    <button
      type="button"
      className={className ?? "hold-key-button"}
      aria-label={ariaLabel}
      style={style}
      onPointerDown={(e) => {
        e.preventDefault();
        if (pressedRef.current) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        pointerIdRef.current = e.pointerId;
        pressedRef.current = true;
        onPress();
      }}
      onPointerUp={(e) => {
        if (pointerIdRef.current !== e.pointerId) return;
        release(e.currentTarget, e.pointerId);
      }}
      onPointerCancel={(e) => {
        if (pointerIdRef.current !== e.pointerId) return;
        release(e.currentTarget, e.pointerId);
      }}
      onLostPointerCapture={() => {
        if (!pressedRef.current) return;
        pressedRef.current = false;
        pointerIdRef.current = null;
        onRelease();
      }}
    >
      {label}
    </button>
  );
}
