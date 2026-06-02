import type { StreamQuality } from "@remotepad/protocol";
import {
  Briefcase,
  Gamepad2,
  LogOut,
  Gauge,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import type { MouseMode } from "../lib/mouseMode";
import type { ViewMode } from "../App";
import { MOUSE_MODE_OPTIONS, QUALITY_OPTIONS } from "../lib/controlLabels";

export type SettingsPanelVariant = "sheet" | "dropdown";

interface SettingsPanelProps {
  open: boolean;
  variant: SettingsPanelVariant;
  onClose: () => void;
  viewMode: ViewMode;
  mouseMode: MouseMode;
  onMouseModeChange: (mode: MouseMode) => void;
  mouseSensitivity?: number;
  minSensitivity?: number;
  maxSensitivity?: number;
  onSensitivityChange?: (value: number) => void;
  showScreenPreview?: boolean;
  onScreenPreviewChange?: () => void;
  quality?: StreamQuality;
  onQualityChange?: (quality: StreamQuality) => void;
  robloxMode?: boolean;
  onRobloxModeChange?: (enabled: boolean) => void;
  onLogout: () => void;
}

export function SettingsPanel({
  open,
  variant,
  onClose,
  viewMode,
  mouseMode,
  onMouseModeChange,
  mouseSensitivity,
  minSensitivity = 0.5,
  maxSensitivity = 3,
  onSensitivityChange,
  showScreenPreview,
  onScreenPreviewChange,
  quality,
  onQualityChange,
  robloxMode,
  onRobloxModeChange,
  onLogout,
}: SettingsPanelProps) {
  if (!open) return null;

  const isMobile = viewMode === "mobile";

  const panel = (
    <div
      className={`settings-panel settings-panel--${variant}`}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label="Settings"
    >
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Settings</h2>
        <button type="button" className="settings-close-btn" aria-label="Close settings" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="settings-section">
        <span className="settings-section-label">Pointer mode</span>
        <div className="settings-mode-toggle" role="group" aria-label="Pointer mode">
          {MOUSE_MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={mouseMode === option.value ? "active" : undefined}
              aria-pressed={mouseMode === option.value}
              title={option.description}
              onClick={() => onMouseModeChange(option.value)}
            >
              {option.value === "absolute" ? (
                <Briefcase size={18} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Gamepad2 size={18} strokeWidth={2} aria-hidden="true" />
              )}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
        <p className="settings-hint">
          {MOUSE_MODE_OPTIONS.find((o) => o.value === mouseMode)?.description}
        </p>
      </div>

      {isMobile && onSensitivityChange && mouseSensitivity !== undefined && (
        <div className="settings-section settings-section-slider">
          <label className="settings-row-label" htmlFor="settings-sensitivity">
            <Gauge size={18} strokeWidth={2} aria-hidden="true" />
            <span>Sensitivity</span>
            <span className="settings-value">{mouseSensitivity.toFixed(1)}×</span>
          </label>
          <input
            id="settings-sensitivity"
            className="settings-slider"
            type="range"
            min={minSensitivity}
            max={maxSensitivity}
            step={0.1}
            value={mouseSensitivity}
            onChange={(e) => onSensitivityChange(Number.parseFloat(e.target.value))}
          />
        </div>
      )}

      {isMobile && onScreenPreviewChange && showScreenPreview !== undefined && (
        <div className="settings-section">
          <span className="settings-section-label">Live screen</span>
          <div className="settings-mode-toggle" role="group" aria-label="Live screen preview">
            <button
              type="button"
              className={showScreenPreview ? undefined : "active"}
              aria-pressed={!showScreenPreview}
              onClick={() => showScreenPreview && onScreenPreviewChange()}
            >
              <EyeOff size={18} strokeWidth={2} aria-hidden="true" />
              <span>Off</span>
            </button>
            <button
              type="button"
              className={showScreenPreview ? "active" : undefined}
              aria-pressed={showScreenPreview}
              onClick={() => !showScreenPreview && onScreenPreviewChange()}
            >
              <Eye size={18} strokeWidth={2} aria-hidden="true" />
              <span>On</span>
            </button>
          </div>
        </div>
      )}

      {!isMobile && onQualityChange && quality !== undefined && (
        <div className="settings-section">
          <span className="settings-section-label">Stream quality</span>
          <div className="settings-quality-toggle" role="group" aria-label="Stream quality">
            {QUALITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={quality === option.value ? "active" : undefined}
                aria-pressed={quality === option.value}
                onClick={() => onQualityChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {onRobloxModeChange && robloxMode !== undefined && (
        <div className="settings-section">
          <span className="settings-section-label">Roblox controls</span>
          <div className="settings-mode-toggle" role="group" aria-label="Roblox controls">
            <button
              type="button"
              className={robloxMode ? undefined : "active"}
              aria-pressed={!robloxMode}
              onClick={() => robloxMode && onRobloxModeChange(false)}
            >
              <span>Off</span>
            </button>
            <button
              type="button"
              className={robloxMode ? "active" : undefined}
              aria-pressed={robloxMode}
              onClick={() => !robloxMode && onRobloxModeChange(true)}
            >
              <Sparkles size={18} strokeWidth={2} aria-hidden="true" />
              <span>On</span>
            </button>
          </div>
        </div>
      )}

      <div className="settings-actions">
        <button type="button" className="settings-action-btn settings-action-danger" onClick={onLogout}>
          <LogOut size={20} strokeWidth={2} aria-hidden="true" />
          <span className="settings-action-text">
            <strong>Sign out</strong>
          </span>
        </button>
      </div>
    </div>
  );

  if (variant === "dropdown") {
    return (
      <>
        <button type="button" className="settings-backdrop" aria-label="Close settings" onClick={onClose} />
        {panel}
      </>
    );
  }

  return (
    <div className="settings-overlay settings-overlay--sheet" onClick={onClose}>
      {panel}
    </div>
  );
}
