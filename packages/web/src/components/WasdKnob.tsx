import { useCallback, useRef, useState } from "react";

interface WasdKnobProps {
  onKeyDown: (key: string) => void;
  onKeyUp: (key: string) => void;
}

/** Ignore small movement near stick center. */
const DEAD_ZONE = 0.18;
/** Secondary axis must exceed this before a diagonal combo is allowed. */
const DIAGONAL_AXIS = 0.4;

function knobDiameterPx(): number {
  return Math.min(window.innerWidth * 0.56, window.innerHeight * 0.32, 240);
}

function keysFromOffset(nx: number, ny: number): string[] {
  const up = ny < -DEAD_ZONE;
  const down = ny > DEAD_ZONE;
  const left = nx < -DEAD_ZONE;
  const right = nx > DEAD_ZONE;

  const keys: string[] = [];
  if (up) keys.push("w");
  if (down) keys.push("s");
  if (left) keys.push("a");
  if (right) keys.push("d");

  const horiz = Math.abs(nx);
  const vert = Math.abs(ny);

  if ((up || down) && (left || right) && horiz < DIAGONAL_AXIS) {
    return keys.filter((key) => key === "w" || key === "s");
  }
  if ((left || right) && (up || down) && vert < DIAGONAL_AXIS) {
    return keys.filter((key) => key === "a" || key === "d");
  }

  return keys;
}

function WasdLabels() {
  return (
    <>
      <span className="wasd-label w">W</span>
      <span className="wasd-label a">A</span>
      <span className="wasd-label s">S</span>
      <span className="wasd-label d">D</span>
    </>
  );
}

export function WasdKnob({ onKeyDown, onKeyUp }: WasdKnobProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const activeKeysRef = useRef<Set<string>>(new Set());
  const pointerIdRef = useRef<number | null>(null);

  const applyKeys = useCallback(
    (newKeys: string[]) => {
      const prev = activeKeysRef.current;
      const next = new Set(newKeys);

      for (const key of prev) {
        if (!next.has(key)) onKeyUp(key);
      }
      for (const key of next) {
        if (!prev.has(key)) onKeyDown(key);
      }
      activeKeysRef.current = next;
    },
    [onKeyDown, onKeyUp],
  );

  const releaseAll = useCallback(() => {
    for (const key of activeKeysRef.current) {
      onKeyUp(key);
    }
    activeKeysRef.current = new Set();
    setOffset({ x: 0, y: 0 });
    setAnchor(null);
  }, [onKeyUp]);

  const updateFromPointer = (e: React.PointerEvent, origin: { x: number; y: number }) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const maxRadius = knobDiameterPx() * 0.35;
    let dx = e.clientX - rect.left - origin.x;
    let dy = e.clientY - rect.top - origin.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    setOffset({ x: dx, y: dy });
    applyKeys(keysFromOffset(dx / maxRadius, dy / maxRadius));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerIdRef.current = e.pointerId;

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const origin = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setAnchor(origin);
    setOffset({ x: 0, y: 0 });
    applyKeys([]);
    updateFromPointer(e, origin);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId || !anchor) return;
    updateFromPointer(e, anchor);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    releaseAll();
  };

  const knobSize = knobDiameterPx();

  return (
    <div
      ref={containerRef}
      className="wasd-knob"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="wasd-placeholder" style={{ width: knobSize, height: knobSize }}>
        <div className="wasd-ring" />
        <WasdLabels />
      </div>

      {anchor && (
        <div
          className="wasd-active"
          style={{ width: knobSize, height: knobSize, left: anchor.x, top: anchor.y }}
        >
          <div className="wasd-ring" />
          <div
            className="wasd-stick"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
          />
          <WasdLabels />
        </div>
      )}
    </div>
  );
}
