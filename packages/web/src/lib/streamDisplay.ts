/** Physical pixel width available to show the stream on this device. */
export function getClientStreamMaxWidth(): number {
  const dpr = window.devicePixelRatio || 1;
  return Math.max(1, Math.round(window.innerWidth * dpr));
}
