import { useEffect, useRef, useState } from "react";
import { abortRemoteText, sendRemoteText, typeChar, tapKey } from "../lib/remoteTyping";

export type TextEntryVariant = "generic" | "roblox";

interface TextEntryOverlayProps {
  variant: TextEntryVariant;
  onClose: () => void;
}

export function TextEntryOverlay({ variant, onClose }: TextEntryOverlayProps) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevValueRef = useRef("");
  const label = variant === "roblox" ? "Chat" : "Text entry";
  const inputId = variant === "roblox" ? "roblox-chat-input" : "text-entry-input";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const relayValueChange = (next: string) => {
    const prev = prevValueRef.current;
    if (next.length > prev.length) {
      for (const char of next.slice(prev.length)) {
        typeChar(char);
      }
    } else if (next.length < prev.length) {
      for (let i = 0; i < prev.length - next.length; i++) {
        tapKey("backspace");
      }
    }
    prevValueRef.current = next;
    setValue(next);
  };

  const handleSend = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await sendRemoteText();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleAbort = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await abortRemoteText();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="text-entry-overlay" role="dialog" aria-label={label}>
      <div className="text-entry-panel">
        <label className="text-entry-label" htmlFor={inputId}>
          {label}
        </label>
        <input
          id={inputId}
          ref={inputRef}
          className="text-entry-input"
          type="text"
          value={value}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="send"
          disabled={busy}
          onChange={(e) => relayValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSend();
            }
          }}
        />
        <div className="text-entry-actions">
          <button type="button" className="text-entry-send" disabled={busy} onClick={() => void handleSend()}>
            Send
          </button>
          <button type="button" className="text-entry-abort" disabled={busy} onClick={() => void handleAbort()}>
            Abort
          </button>
        </div>
      </div>
    </div>
  );
}
