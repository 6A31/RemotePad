const BROWSER_HINT_KEY = "remotepad_browser_hint_dismissed";

export function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isLandscapePhone(): boolean {
  return window.matchMedia("(orientation: landscape) and (max-height: 500px)").matches;
}

export function shouldShowBrowserHint(isFullscreen: boolean): boolean {
  if (isStandaloneDisplay() || isFullscreen) return false;
  return sessionStorage.getItem(BROWSER_HINT_KEY) !== "1";
}

export function dismissBrowserHint(): void {
  sessionStorage.setItem(BROWSER_HINT_KEY, "1");
}
