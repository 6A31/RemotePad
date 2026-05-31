import { useEffect, useState, useCallback, useRef } from "react";
import { WasdKnob } from "../components/WasdKnob";
import { Touchpad } from "../components/Touchpad";
import { HostLabel } from "../components/HostLabel";
import { client, type ConnectionState } from "../ws/client";
import {
  getStoredMouseSensitivity,
  MAX_MOUSE_SENSITIVITY,
  MIN_MOUSE_SENSITIVITY,
  storeMouseSensitivity,
} from "../lib/mouseSensitivity";
import { toggleFullscreen } from "../lib/screenUtils";
import type { ViewMode } from "../App";

interface MobileViewProps {
  onLogout: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function MobileView({ onLogout, onViewModeChange }: MobileViewProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [mouseSensitivity, setMouseSensitivity] = useState(getStoredMouseSensitivity);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add("mobile-session");
    document.body.classList.add("mobile-session");

    const blockTouchScroll = (event: TouchEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".mobile-sensitivity, .mobile-exit-fullscreen")) {
        return;
      }
      event.preventDefault();
    };

    document.addEventListener("touchmove", blockTouchScroll, { passive: false });

    return () => {
      document.documentElement.classList.remove("mobile-session");
      document.body.classList.remove("mobile-session");
      document.removeEventListener("touchmove", blockTouchScroll);
    };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === controlsRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    client.onConnectionState(setConnectionState);
    client.onConnectionError(setError);
    client.connect();

    return () => {
      client.disconnect();
    };
  }, []);

  const handleKeyDown = useCallback((key: string) => client.keyDown(key), []);
  const handleKeyUp = useCallback((key: string) => client.keyUp(key), []);
  const handleMove = useCallback((dx: number, dy: number) => {
    client.moveMouseRelative(dx, dy);
  }, []);
  const handleClick = useCallback((button: "left" | "right") => {
    client.mouseClick(button);
  }, []);
  const handleScroll = useCallback((dx: number, dy: number) => {
    client.scrollMouse(dx, dy);
  }, []);

  const handleSensitivityChange = (value: number) => {
    setMouseSensitivity(value);
    storeMouseSensitivity(value);
  };

  const handleToggleFullscreen = async () => {
    if (!controlsRef.current) return;
    const active = await toggleFullscreen(controlsRef.current);
    setIsFullscreen(active);
  };

  return (
    <div className={`mobile-view${isFullscreen ? " mobile-view-controls-fullscreen" : ""}`}>
      {!isFullscreen && (
        <>
          <header className="toolbar mobile-toolbar">
            <HostLabel />
            <span className={`status status-${connectionState}`}>{connectionState}</span>
            <div className="toolbar-actions">
              <button type="button" onClick={() => void handleToggleFullscreen()}>
                Fullscreen
              </button>
              <button type="button" onClick={() => onViewModeChange("desktop")}>
                Desktop
              </button>
              <button type="button" onClick={onLogout}>
                Logout
              </button>
            </div>
          </header>
          {error && <p className="banner error">{error}</p>}
          <div className="mobile-sensitivity">
            <label className="mobile-sensitivity-label" htmlFor="mouse-sensitivity">
              Mouse
            </label>
            <input
              id="mouse-sensitivity"
              className="mobile-sensitivity-slider"
              type="range"
              min={MIN_MOUSE_SENSITIVITY}
              max={MAX_MOUSE_SENSITIVITY}
              step={0.1}
              value={mouseSensitivity}
              onChange={(e) => handleSensitivityChange(Number.parseFloat(e.target.value))}
            />
            <span className="mobile-sensitivity-value">{mouseSensitivity.toFixed(1)}×</span>
          </div>
        </>
      )}
      <div ref={controlsRef} className="mobile-controls">
        {isFullscreen && (
          <button
            type="button"
            className="mobile-exit-fullscreen"
            onClick={() => void handleToggleFullscreen()}
          >
            Exit
          </button>
        )}
        <div className="control-panel left-panel">
          <WasdKnob onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} />
        </div>
        <div className="control-panel right-panel">
          <Touchpad
            onMove={handleMove}
            onScroll={handleScroll}
            onClick={handleClick}
            sensitivity={mouseSensitivity}
          />
        </div>
      </div>
    </div>
  );
}
