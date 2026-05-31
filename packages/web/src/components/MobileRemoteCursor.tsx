import { useEffect, useState } from "react";
import { mapSourceCoordsToContainer } from "../lib/screenUtils";

interface MobileRemoteCursorProps {
  x: number;
  y: number;
  sourceWidth: number;
  sourceHeight: number;
  visible: boolean;
}

export function MobileRemoteCursor({
  x,
  y,
  sourceWidth,
  sourceHeight,
  visible,
}: MobileRemoteCursorProps) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ xPct: number; yPct: number } | null>(null);

  useEffect(() => {
    if (!containerRef || !visible) {
      setPosition(null);
      return;
    }

    const update = () => {
      const rect = containerRef.getBoundingClientRect();
      const mapped = mapSourceCoordsToContainer(
        x,
        y,
        sourceWidth,
        sourceHeight,
        rect.width,
        rect.height,
      );
      setPosition(mapped);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(containerRef);
    return () => observer.disconnect();
  }, [containerRef, visible, x, y, sourceWidth, sourceHeight]);

  return (
    <div ref={setContainerRef} className="mobile-remote-cursor-layer" aria-hidden={!visible}>
      {visible && position && (
        <div
          className="mobile-remote-cursor"
          style={{
            left: `${position.xPct * 100}%`,
            top: `${position.yPct * 100}%`,
          }}
        />
      )}
    </div>
  );
}
