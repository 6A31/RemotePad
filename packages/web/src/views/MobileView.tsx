import { useEffect, useState, useCallback, useRef } from "react";
import { WasdKnob } from "../components/WasdKnob";
import { Touchpad } from "../components/Touchpad";
import { ScreenCanvas } from "../components/ScreenCanvas";
import { MobileHeader } from "../components/MobileHeader";
import { MobileBrowserHint } from "../components/MobileBrowserHint";
import { client, type ConnectionState } from "../ws/client";
import {
  getStoredMobileScreenPreview,
  storeMobileScreenPreview,
} from "../lib/mobileScreenPreview";
import { getStoredQuality } from "../lib/streamQuality";
import {
  getStoredMouseSensitivity,
  MAX_MOUSE_SENSITIVITY,
  MIN_MOUSE_SENSITIVITY,
  storeMouseSensitivity,
} from "../lib/mouseSensitivity";
import { toggleFullscreen } from "../lib/screenUtils";
import { getStoredMouseMode, storeMouseMode, type MouseMode } from "../lib/mouseMode";
import { isLandscapePhone, shouldShowBrowserHint } from "../lib/displayMode";
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
  const [mouseMode, setMouseMode] = useState<MouseMode>(getStoredMouseMode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBrowserHint, setShowBrowserHint] = useState(false);
  const [showScreenPreview, setShowScreenPreview] = useState(getStoredMobileScreenPreview);
  const [frame, setFrame] = useState<{
    jpeg: Uint8Array;
    width: number;
    height: number;
  } | null>(null);
  const mobileViewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add("mobile-session");
    document.body.classList.add("mobile-session");

    return () => {
      document.documentElement.classList.remove("mobile-session");
      document.body.classList.remove("mobile-session");
    };
  }, []);

  useEffect(() => {
    const syncFullscreen = () => {
      const active = document.fullscreenElement === mobileViewRef.current;
      setIsFullscreen(active);
      setShowBrowserHint(shouldShowBrowserHint(active) && isLandscapePhone());
    };

    const syncLayout = () => {
      syncFullscreen();
    };

    syncLayout();
    document.addEventListener("fullscreenchange", syncFullscreen);
    window.addEventListener("orientationchange", syncLayout);
    window.addEventListener("resize", syncLayout);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      window.removeEventListener("orientationchange", syncLayout);
      window.removeEventListener("resize", syncLayout);
    };
  }, []);

  useEffect(() => {
    client.onConnectionState(setConnectionState);
    client.onConnectionError(setError);
    client.onFrame((f) =>
      setFrame({
        jpeg: f.jpeg,
        width: f.width,
        height: f.height,
      }),
    );
    client.connect();

    return () => {
      client.stopStream();
      client.disconnect();
    };
  }, []);

  useEffect(() => {
    if (connectionState !== "connected") return;

    if (showScreenPreview) {
      client.setQuality(getStoredQuality());
      client.startStream();
    } else {
      client.stopStream();
      setFrame(null);
    }
  }, [connectionState, showScreenPreview]);

  useEffect(() => {
    const onVisibility = () => {
      if (!showScreenPreview) return;
      if (document.hidden) {
        client.stopStream();
      } else if (client.connected) {
        client.startStream();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [showScreenPreview]);

  useEffect(() => {
    const onResize = () => {
      if (showScreenPreview && client.connected) {
        client.updateStreamDisplayLimit();
      }
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [showScreenPreview]);

  const handleKeyDown = useCallback((key: string) => client.keyDown(key), []);
  const handleKeyUp = useCallback((key: string) => client.keyUp(key), []);
  const handleMove = useCallback(
    (dx: number, dy: number) => {
      client.moveMouseRelative(dx, dy, mouseMode === "relative");
    },
    [mouseMode],
  );
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

  const handleMouseModeChange = (next: MouseMode) => {
    setMouseMode(next);
    storeMouseMode(next);
  };

  const handleToggleScreenPreview = () => {
    setShowScreenPreview((prev) => {
      const next = !prev;
      storeMobileScreenPreview(next);
      return next;
    });
  };

  const handleToggleFullscreen = async () => {
    if (!mobileViewRef.current) return;
    const active = await toggleFullscreen(mobileViewRef.current);
    setIsFullscreen(active);
    setShowBrowserHint(shouldShowBrowserHint(active) && isLandscapePhone());
  };

  return (
    <div
      ref={mobileViewRef}
      className={`mobile-view${isFullscreen ? " mobile-view-fullscreen" : ""}`}
    >
      {!isFullscreen && (
        <>
          <MobileHeader
            connectionState={connectionState}
            mouseSensitivity={mouseSensitivity}
            mouseMode={mouseMode}
            showScreenPreview={showScreenPreview}
            minSensitivity={MIN_MOUSE_SENSITIVITY}
            maxSensitivity={MAX_MOUSE_SENSITIVITY}
            onSensitivityChange={handleSensitivityChange}
            onMouseModeChange={handleMouseModeChange}
            onScreenPreviewChange={handleToggleScreenPreview}
            onFullscreen={() => void handleToggleFullscreen()}
            onDesktopLayout={() => onViewModeChange("desktop")}
            onLogout={onLogout}
          />
          {showBrowserHint && (
            <MobileBrowserHint
              onExpand={() => void handleToggleFullscreen()}
              onDismiss={() => setShowBrowserHint(false)}
            />
          )}
          {error && <p className="banner error mobile-banner">{error}</p>}
        </>
      )}
      <div
        className={`mobile-controls${showScreenPreview ? " mobile-controls-with-preview" : ""}`}
      >
        {showScreenPreview && (
          <div className="mobile-screen-preview" aria-hidden="true">
            <ScreenCanvas frame={frame} className="mobile-screen-preview-canvas" />
          </div>
        )}
        {isFullscreen && (
          <>
            <button
              type="button"
              className={`mobile-preview-toggle${showScreenPreview ? " active" : ""}`}
              aria-pressed={showScreenPreview}
              onClick={handleToggleScreenPreview}
            >
              Screen {showScreenPreview ? "on" : "off"}
            </button>
            <button
              type="button"
              className="mobile-exit-fullscreen"
              onClick={() => void handleToggleFullscreen()}
            >
              Exit fullscreen
            </button>
          </>
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
            gameMode={mouseMode === "relative"}
          />
        </div>
      </div>
    </div>
  );
}
