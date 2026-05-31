import { useRef, useCallback } from "react";

interface TouchpadProps {
  onMove: (dx: number, dy: number) => void;
  onScroll: (dx: number, dy: number) => void;
  onClick: (button: "left" | "right") => void;
  sensitivity?: number;
  gameMode?: boolean;
}

const LONG_PRESS_MS = 500;

function centroid(pointers: Map<number, { x: number; y: number }>): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const point of pointers.values()) {
    x += point.x;
    y += point.y;
  }
  return { x: x / pointers.size, y: y / pointers.size };
}

export function Touchpad({ onMove, onScroll, onClick, sensitivity = 1.5, gameMode = false }: TouchpadProps) {
  const sensitivityRef = useRef(sensitivity);
  sensitivityRef.current = sensitivity;

  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastCentroidRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const movedRef = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const beginSingleFinger = (x: number, y: number) => {
    lastPosRef.current = { x, y };
    lastCentroidRef.current = null;
    movedRef.current = false;
    longPressTriggeredRef.current = false;
    clearLongPress();
    longPressTimerRef.current = setTimeout(() => {
      if (!movedRef.current && activePointersRef.current.size === 1) {
        longPressTriggeredRef.current = true;
        onClick("right");
      }
    }, LONG_PRESS_MS);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const pointers = activePointersRef.current;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 1) {
      beginSingleFinger(e.clientX, e.clientY);
      return;
    }

    clearLongPress();
    movedRef.current = true;
    lastPosRef.current = null;
    lastCentroidRef.current = centroid(pointers);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const pointers = activePointersRef.current;
    if (!pointers.has(e.pointerId)) return;

    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const scale = sensitivityRef.current;

    if (pointers.size >= 2) {
      const nextCentroid = centroid(pointers);
      const prevCentroid = lastCentroidRef.current;
      lastCentroidRef.current = nextCentroid;

      if (!prevCentroid) return;

      const dx = (nextCentroid.x - prevCentroid.x) * scale;
      const dy = (nextCentroid.y - prevCentroid.y) * scale;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        onScroll(dx, dy);
      }
      return;
    }

    if (!lastPosRef.current) return;

    const dx = (e.clientX - lastPosRef.current.x) * scale;
    const dy = (e.clientY - lastPosRef.current.y) * scale;

    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      movedRef.current = true;
      clearLongPress();
      onMove(dx, dy);
    }

    lastPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const pointers = activePointersRef.current;
    if (!pointers.has(e.pointerId)) return;

    pointers.delete(e.pointerId);

    if (pointers.size >= 2) {
      lastCentroidRef.current = centroid(pointers);
      lastPosRef.current = null;
      return;
    }

    if (pointers.size === 1) {
      const remaining = pointers.entries().next().value;
      if (remaining) {
        lastPosRef.current = { x: remaining[1].x, y: remaining[1].y };
      }
      lastCentroidRef.current = null;
      movedRef.current = false;
      return;
    }

    clearLongPress();
    if (!movedRef.current && !longPressTriggeredRef.current) {
      onClick("left");
    }

    lastPosRef.current = null;
    lastCentroidRef.current = null;
    movedRef.current = false;
    longPressTriggeredRef.current = false;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      className="touchpad"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <span className="touchpad-hint">
        {gameMode
          ? "Game: swipe to move camera. Tap/hold click. Two fingers scroll."
          : "Swipe to move pointer. Tap/hold click. Two fingers scroll."}
      </span>
    </div>
  );
}
