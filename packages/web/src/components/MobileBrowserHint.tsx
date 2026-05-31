import { dismissBrowserHint } from "../lib/displayMode";

interface MobileBrowserHintProps {
  onExpand: () => void;
  onDismiss: () => void;
}

export function MobileBrowserHint({ onExpand, onDismiss }: MobileBrowserHintProps) {
  const handleDismiss = () => {
    dismissBrowserHint();
    onDismiss();
  };

  return (
    <div className="mobile-browser-hint">
      <p>
        The browser bar eats screen space in landscape. Tap <strong>Expand</strong> to go fullscreen,
        or add RemotePad to your home screen for no address bar.
      </p>
      <div className="mobile-browser-hint-actions">
        <button type="button" className="mobile-hint-btn mobile-hint-btn-primary" onClick={onExpand}>
          Expand
        </button>
        <button type="button" className="mobile-hint-btn" onClick={handleDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
