import { useEffect, useRef, useState, useCallback } from "react";
import type { StreamQuality } from "@remotepad/protocol";
import { ScreenCanvas } from "../components/ScreenCanvas";
import { HostLabel } from "../components/HostLabel";
import { client, type ConnectionState } from "../ws/client";
import { mapCanvasCoords, toggleFullscreen } from "../lib/screenUtils";
import { keyboardEventToProtocolKey } from "../lib/keyUtils";
import { getStoredQuality, storeQuality } from "../lib/streamQuality";
import type { ViewMode } from "../App";

const QUALITY_OPTIONS: { value: StreamQuality; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

interface DesktopViewProps {
  onLogout: () => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export function DesktopView({ onLogout, onViewModeChange }: DesktopViewProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState<StreamQuality>(getStoredQuality);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inputCaptured, setInputCaptured] = useState(false);
  const pressedKeysRef = useRef(new Set<string>());
  const [frame, setFrame] = useState<{
    jpeg: Uint8Array;
    width: number;
    height: number;
    sourceWidth: number;
    sourceHeight: number;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add("desktop-session");
    return () => document.body.classList.remove("desktop-session");
  }, []);

  useEffect(() => {
    client.onConnectionState(setConnectionState);
    client.onConnectionError(setError);
    client.onFrame((f) =>
      setFrame({
        jpeg: f.jpeg,
        width: f.width,
        height: f.height,
        sourceWidth: f.sourceWidth,
        sourceHeight: f.sourceHeight,
      }),
    );
    client.connect();

    return () => {
      client.stopStream();
      client.disconnect();
    };
  }, []);

  useEffect(() => {
    if (connectionState === "connected") {
      client.setQuality(quality);
      client.startStream();
    }
  }, [connectionState]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        client.stopStream();
      } else if (client.connected) {
        client.startStream();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === viewportRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const releaseCapturedKeys = useCallback(() => {
    for (const key of pressedKeysRef.current) {
      client.keyUp(key);
    }
    pressedKeysRef.current.clear();
  }, []);

  const releaseInputCapture = useCallback(() => {
    releaseCapturedKeys();
    setInputCaptured(false);
    viewportRef.current?.blur();
  }, [releaseCapturedKeys]);

  useEffect(() => {
    return () => releaseCapturedKeys();
  }, [releaseCapturedKeys]);

  const mapCoords = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !frame) return null;
      return mapCanvasCoords(clientX, clientY, canvas, frame.sourceWidth, frame.sourceHeight);
    },
    [frame],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const coords = mapCoords(e.clientX, e.clientY);
      if (coords) client.moveMouseAbsolute(coords.x, coords.y);
    },
    [mapCoords],
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    viewportRef.current?.focus();
    setInputCaptured(true);
    const button = e.button === 2 ? "right" : e.button === 1 ? "middle" : "left";
    client.mouseDown(button);
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const button = e.button === 2 ? "right" : e.button === 1 ? "middle" : "left";
    client.mouseUp(button);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      viewportRef.current?.focus();
      setInputCaptured(true);
      const coords = mapCoords(e.clientX, e.clientY);
      if (coords) {
        client.moveMouseAbsolute(coords.x, coords.y);
        client.mouseClick(e.button === 2 ? "right" : "left");
      }
    },
    [mapCoords],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        releaseInputCapture();
        return;
      }

      const key = keyboardEventToProtocolKey(e);
      if (!key) return;

      e.preventDefault();
      e.stopPropagation();
      if (pressedKeysRef.current.has(key)) return;
      pressedKeysRef.current.add(key);
      client.keyDown(key);
    },
    [releaseInputCapture],
  );

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    const key = keyboardEventToProtocolKey(e);
    if (!key) return;

    e.preventDefault();
    e.stopPropagation();
    if (!pressedKeysRef.current.has(key)) return;
    pressedKeysRef.current.delete(key);
    client.keyUp(key);
  }, []);

  const handleViewportBlur = useCallback(() => {
    releaseCapturedKeys();
    setInputCaptured(false);
  }, [releaseCapturedKeys]);

  const handleQualityChange = (next: StreamQuality) => {
    setQuality(next);
    storeQuality(next);
    client.setQuality(next);
    if (connectionState === "connected") {
      client.stopStream();
      client.startStream();
    }
  };

  const handleFullscreen = async () => {
    if (!viewportRef.current) return;
    const active = await toggleFullscreen(viewportRef.current);
    setIsFullscreen(active);
  };

  return (
    <div className="desktop-view">
      <header className="toolbar">
        <HostLabel />
        <span className={`status status-${connectionState}`}>{connectionState}</span>
        <div className="toolbar-actions">
          <div className="quality-control">
            <span className="quality-label">Quality</span>
            <div className="segmented-control" role="group" aria-label="Stream quality">
              {QUALITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={quality === option.value ? "active" : undefined}
                  aria-pressed={quality === option.value}
                  onClick={() => handleQualityChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => void handleFullscreen()}>
            {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          </button>
          <button type="button" onClick={() => onViewModeChange("mobile")}>
            Mobile layout
          </button>
          <button type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>
      {error && <p className="banner error">{error}</p>}
      <div
        ref={viewportRef}
        className={`screen-viewport${inputCaptured ? " screen-viewport-captured" : ""}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={handleViewportBlur}
      >
        {!inputCaptured && (
          <p className="screen-viewport-hint">Click the screen to control keyboard and mouse</p>
        )}
        <ScreenCanvas
          ref={canvasRef}
          frame={frame}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        />
      </div>
    </div>
  );
}
