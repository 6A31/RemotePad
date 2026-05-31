import { useRef, useCallback } from "react";

interface TouchpadProps {
  onMove: (dx: number, dy: number) => void;
  onClick: (button: "left" | "right") => void;
  sensitivity?: number;
}

const LONG_PRESS_MS = 500;

export function Touchpad({ onMove, onClick, sensitivity = 1.5 }: TouchpadProps) {
  const sensitivityRef = useRef(sensitivity);
  sensitivityRef.current = sensitivity;
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const movedRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerIdRef.current = e.pointerId;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;
    longPressTriggeredRef.current = false;

    clearLongPress();
    longPressTimerRef.current = setTimeout(() => {
      if (!movedRef.current) {
        longPressTriggeredRef.current = true;
        onClick("right");
      }
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId || !lastPosRef.current) return;

    const scale = sensitivityRef.current;
    const dx = (e.clientX - lastPosRef.current.x) * scale;
    const dy = (e.clientY - lastPosRef.current.y) * scale;

    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      movedRef.current = true;
      clearLongPress();
      onMove(dx, dy);
    }

    lastPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    clearLongPress();

    if (!movedRef.current && !longPressTriggeredRef.current) {
      onClick("left");
    }

    pointerIdRef.current = null;
    lastPosRef.current = null;
  };

  return (
    <div
      className="touchpad"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <span className="touchpad-hint">Drag to move. Tap to click. Hold for right click.</span>
    </div>
  );
}
