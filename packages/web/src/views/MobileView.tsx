import { useEffect, useState, useCallback } from "react";
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

  useEffect(() => {
    document.documentElement.classList.add("mobile-session");
    document.body.classList.add("mobile-session");

    const blockTouchScroll = (event: TouchEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".mobile-sensitivity")) {
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

  const handleSensitivityChange = (value: number) => {
    setMouseSensitivity(value);
    storeMouseSensitivity(value);
  };

  return (
    <div className="mobile-view">
      <header className="toolbar mobile-toolbar">
        <HostLabel />
        <span className={`status status-${connectionState}`}>{connectionState}</span>
        <div className="toolbar-actions">
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
      <div className="mobile-controls">
        <div className="control-panel left-panel">
          <WasdKnob onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} />
        </div>
        <div className="control-panel right-panel">
          <Touchpad
            onMove={handleMove}
            onClick={handleClick}
            sensitivity={mouseSensitivity}
          />
        </div>
      </div>
    </div>
  );
}
