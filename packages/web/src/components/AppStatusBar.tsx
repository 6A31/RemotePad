import { Maximize2, Minimize2, Monitor, Settings, Smartphone } from "lucide-react";
import type { ViewMode } from "../App";
import { layoutSwitchLabel } from "../lib/controlLabels";
import type { ConnectionState } from "../ws/client";
import { HostLabel } from "./HostLabel";

interface AppStatusBarProps {
  connectionState: ConnectionState;
  viewMode: ViewMode;
  isFullscreen: boolean;
  compact?: boolean;
  onOpenSettings: () => void;
  onFullscreen: () => void;
  onSwitchLayout: () => void;
}

export function AppStatusBar({
  connectionState,
  viewMode,
  isFullscreen,
  compact = false,
  onOpenSettings,
  onFullscreen,
  onSwitchLayout,
}: AppStatusBarProps) {
  const layoutLabel = layoutSwitchLabel(viewMode);
  const LayoutIcon = viewMode === "mobile" ? Monitor : Smartphone;

  return (
    <header className={`app-status-bar${compact ? " app-status-bar-compact" : ""}`}>
      <div className="app-status-bar-brand">
        {!compact && <HostLabel />}
        <span className={`status-pill status-pill-${connectionState}`}>{connectionState}</span>
      </div>
      <div className="app-status-bar-actions">
        <button
          type="button"
          className="app-status-icon-btn"
          aria-label={layoutLabel}
          title={layoutLabel}
          onClick={onSwitchLayout}
        >
          <LayoutIcon size={20} strokeWidth={2} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="app-status-icon-btn"
          aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          onClick={onFullscreen}
        >
          {isFullscreen ? (
            <Minimize2 size={20} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Maximize2 size={20} strokeWidth={2} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className="app-status-icon-btn app-status-settings-btn"
          aria-label="Settings"
          title="Settings"
          onClick={onOpenSettings}
        >
          <Settings size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
