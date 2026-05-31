import type { MouseMode } from "../lib/mouseMode";
import type { ConnectionState } from "../ws/client";
import { HostLabel } from "./HostLabel";

const MOUSE_MODE_OPTIONS: { value: MouseMode; label: string }[] = [
  { value: "absolute", label: "Desktop" },
  { value: "relative", label: "Game" },
];

interface MobileHeaderProps {
  connectionState: ConnectionState;
  mouseSensitivity: number;
  mouseMode: MouseMode;
  minSensitivity: number;
  maxSensitivity: number;
  onSensitivityChange: (value: number) => void;
  onMouseModeChange: (mode: MouseMode) => void;
  onFullscreen: () => void;
  onDesktopLayout: () => void;
  onLogout: () => void;
}

function IconExpand() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 3H3v5M16 3h5v5M16 21h5v-5M8 21H3v-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMonitor() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MobileHeader({
  connectionState,
  mouseSensitivity,
  mouseMode,
  minSensitivity,
  maxSensitivity,
  onSensitivityChange,
  onMouseModeChange,
  onFullscreen,
  onDesktopLayout,
  onLogout,
}: MobileHeaderProps) {
  return (
    <header className="mobile-header">
      <div className="mobile-header-top">
        <div className="mobile-header-brand">
          <HostLabel />
          <span className={`status-pill status-pill-${connectionState}`}>{connectionState}</span>
        </div>
        <div className="mobile-header-actions">
          <button
            type="button"
            className="mobile-icon-btn mobile-icon-btn-primary"
            aria-label="Expand to hide browser bar"
            title="Expand"
            onClick={onFullscreen}
          >
            <IconExpand />
            <span className="mobile-icon-btn-label">Expand</span>
          </button>
          <button
            type="button"
            className="mobile-icon-btn"
            aria-label="Switch to desktop layout"
            title="Desktop layout"
            onClick={onDesktopLayout}
          >
            <IconMonitor />
          </button>
          <button
            type="button"
            className="mobile-icon-btn"
            aria-label="Log out"
            title="Logout"
            onClick={onLogout}
          >
            <IconLogout />
          </button>
        </div>
      </div>

      <div className="mobile-header-settings">
        <div className="mobile-setting">
          <span className="mobile-setting-label">Sensitivity</span>
          <input
            id="mouse-sensitivity"
            className="mobile-setting-slider"
            type="range"
            min={minSensitivity}
            max={maxSensitivity}
            step={0.1}
            value={mouseSensitivity}
            onChange={(e) => onSensitivityChange(Number.parseFloat(e.target.value))}
          />
          <span className="mobile-setting-value">{mouseSensitivity.toFixed(1)}×</span>
        </div>
        <div className="mobile-setting mobile-setting-mode">
          <span className="mobile-setting-label">Mouse</span>
          <div className="segmented-control mobile-segmented" role="group" aria-label="Mouse mode">
            {MOUSE_MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={mouseMode === option.value ? "active" : undefined}
                aria-pressed={mouseMode === option.value}
                onClick={() => onMouseModeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
