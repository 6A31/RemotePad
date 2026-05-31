import { forwardRef, useEffect, useRef } from "react";

interface ScreenCanvasProps {
  frame: { jpeg: Uint8Array; width: number; height: number } | null;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  className?: string;
}

export const ScreenCanvas = forwardRef<HTMLCanvasElement, ScreenCanvasProps>(
  function ScreenCanvas(
    { frame, onMouseMove, onMouseDown, onMouseUp, onClick, onContextMenu, className },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !frame) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const blob = new Blob([new Uint8Array(frame.jpeg)], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        canvas.width = frame.width;
        canvas.height = frame.height;
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
      };
      img.onerror = () => URL.revokeObjectURL(url);
      img.src = url;

      return () => URL.revokeObjectURL(url);
    }, [frame]);

    const assignRef = (node: HTMLCanvasElement | null) => {
      canvasRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    return (
      <canvas
        ref={assignRef}
        className={className ?? "screen-canvas"}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onClick={onClick}
        onContextMenu={onContextMenu}
      />
    );
  },
);
