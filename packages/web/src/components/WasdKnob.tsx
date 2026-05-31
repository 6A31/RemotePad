import { useCallback, useRef, useState } from "react";

interface WasdKnobProps {
  onKeyDown: (key: string) => void;
  onKeyUp: (key: string) => void;
}

const DEAD_ZONE = 0.15;

function keysFromOffset(nx: number, ny: number): string[] {
  const keys: string[] = [];
  if (ny < -DEAD_ZONE) keys.push("w");
  if (ny > DEAD_ZONE) keys.push("s");
  if (nx < -DEAD_ZONE) keys.push("a");
  if (nx > DEAD_ZONE) keys.push("d");
  return keys;
}

export function WasdKnob({ onKeyDown, onKeyUp }: WasdKnobProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
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
  }, [onKeyUp]);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxRadius = Math.min(rect.width, rect.height) * 0.35;

    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    setOffset({ x: dx, y: dy });
    const nx = dx / maxRadius;
    const ny = dy / maxRadius;
    applyKeys(keysFromOffset(nx, ny));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerIdRef.current = e.pointerId;
    handlePointerMove(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    releaseAll();
  };

  return (
    <div
      ref={containerRef}
      className="wasd-knob"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="wasd-ring" />
      <div
        className="wasd-stick"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      />
      <span className="wasd-label w">W</span>
      <span className="wasd-label a">A</span>
      <span className="wasd-label s">S</span>
      <span className="wasd-label d">D</span>
    </div>
  );
}
