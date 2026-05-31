import { useEffect, useState } from "react";
import { mapSourceCoordsToContainer } from "../lib/screenUtils";

interface MobileRemoteCursorProps {
  x: number;
  y: number;
  sourceWidth: number;
  sourceHeight: number;
  imageWidth?: number;
  imageHeight?: number;
  visible: boolean;
}

export function MobileRemoteCursor({
  x,
  y,
  sourceWidth,
  sourceHeight,
  imageWidth,
  imageHeight,
  visible,
}: MobileRemoteCursorProps) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ xPct: number; yPct: number } | null>(null);

  const displayImageWidth = imageWidth ?? sourceWidth;
  const displayImageHeight = imageHeight ?? sourceHeight;

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
        displayImageWidth,
        displayImageHeight,
      );
      setPosition(mapped);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(containerRef);
    return () => observer.disconnect();
  }, [containerRef, visible, x, y, sourceWidth, sourceHeight, displayImageWidth, displayImageHeight]);

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
