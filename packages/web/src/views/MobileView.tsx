import { useEffect, useState, useCallback, useRef } from "react";
import { WasdKnob } from "../components/WasdKnob";
import {
  getStoredMobileScreenPreview,
  storeMobileScreenPreview,
} from "../lib/mobileScreenPreview";
import { JumpButton } from "../components/JumpButton";
import { HoldKeyButton } from "../components/HoldKeyButton";
import { Touchpad } from "../components/Touchpad";
import { ScreenCanvas } from "../components/ScreenCanvas";
import { MobileHeader } from "../components/MobileHeader";
import { MobileBrowserHint } from "../components/MobileBrowserHint";
import { MobileRemoteCursor } from "../components/MobileRemoteCursor";
import { TextEntryOverlay, type TextEntryVariant } from "../components/TextEntryOverlay";
import { InventoryButton } from "../components/InventoryButton";
import { EmoteButton } from "../components/EmoteButton";
import { ChatIcon, TextEntryIcon } from "../components/MobileActionIcons";
import { openRobloxChat } from "../lib/remoteTyping";
import { client, type ConnectionState } from "../ws/client";
import { useHostInfo } from "../hooks/useHostInfo";
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

/** Desktop touchpad moves slower than game mode — 1:1 finger pixels feel too fast on a full desktop. */
const DESKTOP_POINTER_SCALE = 0.55;

function releaseInventoryKeys(): void {
  for (let i = 0; i <= 9; i++) {
    client.keyUp(String(i));
  }
}

interface MobileViewProps {
  onLogout: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function MobileView({ onLogout, onViewModeChange }: MobileViewProps) {
  const hostInfo = useHostInfo();
  const robloxMode = hostInfo?.robloxMode ?? false;
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
    sourceWidth: number;
    sourceHeight: number;
  } | null>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [textEntryVariant, setTextEntryVariant] = useState<TextEntryVariant | null>(null);
  const mobileViewRef = useRef<HTMLDivElement>(null);

  const sourceWidth = frame?.sourceWidth ?? hostInfo?.displayWidth ?? 1920;
  const sourceHeight = frame?.sourceHeight ?? hostInfo?.displayHeight ?? 1080;
  const streamWidth = frame?.width ?? sourceWidth;
  const streamHeight = frame?.height ?? sourceHeight;
  const showDesktopCursor = mouseMode === "absolute";

  useEffect(() => {
    if (mouseMode !== "absolute") return;
    const x = sourceWidth / 2;
    const y = sourceHeight / 2;
    setCursor({ x, y });
    client.moveMouseAbsolute(x, y);
  }, [sourceWidth, sourceHeight, mouseMode]);

  useEffect(() => {
    if (!robloxMode) {
      client.keyUp("q");
      releaseInventoryKeys();
      setTextEntryVariant((current) => (current === "roblox" ? null : current));
    }
  }, [robloxMode]);

  useEffect(() => {
    document.documentElement.classList.add("mobile-session");
    document.body.classList.add("mobile-session");

    return () => {
      document.documentElement.classList.remove("mobile-session");
      document.body.classList.remove("mobile-session");
      client.keyUp("space");
      client.keyUp("q");
      releaseInventoryKeys();
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
  const handleJumpPress = useCallback(() => handleKeyDown("space"), [handleKeyDown]);
  const handleJumpRelease = useCallback(() => handleKeyUp("space"), [handleKeyUp]);
  const handleMove = useCallback(
    (dx: number, dy: number) => {
      if (mouseMode === "relative") {
        client.moveMouseRelative(dx, dy, true);
        return;
      }

      setCursor((current) => {
        const scaledDx = dx * DESKTOP_POINTER_SCALE;
        const scaledDy = dy * DESKTOP_POINTER_SCALE;
        const next = {
          x: Math.max(0, Math.min(sourceWidth, current.x + scaledDx)),
          y: Math.max(0, Math.min(sourceHeight, current.y + scaledDy)),
        };
        client.moveMouseAbsolute(next.x, next.y);
        return next;
      });
    },
    [mouseMode, sourceWidth, sourceHeight],
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

  const handleOpenRobloxChat = () => {
    openRobloxChat();
    setTextEntryVariant("roblox");
  };

  const handleOpenTextEntry = () => {
    setTextEntryVariant("generic");
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
            <MobileRemoteCursor
              x={cursor.x}
              y={cursor.y}
              sourceWidth={sourceWidth}
              sourceHeight={sourceHeight}
              imageWidth={streamWidth}
              imageHeight={streamHeight}
              visible={showDesktopCursor}
            />
          </div>
        )}
        {isFullscreen && (
          <div className="mobile-floating-toggles">
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
          </div>
        )}
        <div className="control-panel left-panel">
          <WasdKnob onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} />
          <div className="mobile-action-buttons">
            {robloxMode ? (
              <>
                <HoldKeyButton
                  label="Q"
                  ariaLabel="Q key"
                  className="hold-key-button roblox-key-button"
                  onPress={() => handleKeyDown("q")}
                  onRelease={() => handleKeyUp("q")}
                />
                <InventoryButton onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} />
                <EmoteButton onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} />
                <button
                  type="button"
                  className="hold-key-button mobile-icon-button"
                  aria-label="Open chat"
                  onClick={handleOpenRobloxChat}
                >
                  <ChatIcon />
                </button>
              </>
            ) : (
              <button
                type="button"
                className="hold-key-button mobile-icon-button"
                aria-label="Text entry"
                onClick={handleOpenTextEntry}
              >
                <TextEntryIcon />
              </button>
            )}
            <JumpButton onPress={handleJumpPress} onRelease={handleJumpRelease} />
          </div>
        </div>
        <div className="control-panel right-panel">
          <MobileRemoteCursor
            x={cursor.x}
            y={cursor.y}
            sourceWidth={sourceWidth}
            sourceHeight={sourceHeight}
            visible={showDesktopCursor && !showScreenPreview}
          />
          <Touchpad
            onMove={handleMove}
            onScroll={handleScroll}
            onClick={handleClick}
            onMoveEnd={() => client.flushGameMouse()}
            sensitivity={mouseSensitivity}
            gameMode={mouseMode === "relative"}
          />
        </div>
      </div>
      {textEntryVariant && (
        <TextEntryOverlay variant={textEntryVariant} onClose={() => setTextEntryVariant(null)} />
      )}
    </div>
  );
}
