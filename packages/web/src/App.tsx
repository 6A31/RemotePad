import { useState, useCallback } from "react";
import { LoginView } from "./views/LoginView";
import { DesktopView } from "./views/DesktopView";
import { MobileView } from "./views/MobileView";
import { client } from "./ws/client";

export type ViewMode = "desktop" | "mobile";

function detectMobileDefault(): ViewMode {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 900;
  return coarse || narrow ? "mobile" : "desktop";
}

export function App() {
  const [token, setToken] = useState<string | null>(
    () => sessionStorage.getItem("remotepad_token"),
  );
  const [viewMode, setViewMode] = useState<ViewMode>(detectMobileDefault);

  const handleLogin = useCallback((newToken: string) => {
    sessionStorage.setItem("remotepad_token", newToken);
    client.setToken(newToken);
    setToken(newToken);
  }, []);

  const handleLogout = useCallback(() => {
    client.disconnect();
    sessionStorage.removeItem("remotepad_token");
    setToken(null);
  }, []);

  if (!token) {
    return <LoginView onLogin={handleLogin} />;
  }

  client.setToken(token);

  const sharedProps = {
    onLogout: handleLogout,
    viewMode,
    onViewModeChange: setViewMode,
  };

  return viewMode === "mobile" ? (
    <MobileView {...sharedProps} />
  ) : (
    <DesktopView onLogout={handleLogout} onViewModeChange={setViewMode} />
  );
}
