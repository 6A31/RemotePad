export function mapCanvasCoords(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  sourceWidth: number,
  sourceHeight: number,
): { x: number; y: number } | null {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0 || canvas.width <= 0 || canvas.height <= 0) {
    return null;
  }

  const imageAspect = canvas.width / canvas.height;
  const displayAspect = rect.width / rect.height;

  let renderWidth: number;
  let renderHeight: number;
  let offsetX: number;
  let offsetY: number;

  if (displayAspect > imageAspect) {
    renderHeight = rect.height;
    renderWidth = renderHeight * imageAspect;
    offsetX = (rect.width - renderWidth) / 2;
    offsetY = 0;
  } else {
    renderWidth = rect.width;
    renderHeight = renderWidth / imageAspect;
    offsetX = 0;
    offsetY = (rect.height - renderHeight) / 2;
  }

  const localX = clientX - rect.left - offsetX;
  const localY = clientY - rect.top - offsetY;

  if (localX < 0 || localX > renderWidth || localY < 0 || localY > renderHeight) {
    return null;
  }

  return {
    x: (localX / renderWidth) * sourceWidth,
    y: (localY / renderHeight) * sourceHeight,
  };
}

export function mapSourceCoordsToContainer(
  x: number,
  y: number,
  sourceWidth: number,
  sourceHeight: number,
  containerWidth: number,
  containerHeight: number,
): { xPct: number; yPct: number } | null {
  if (
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    containerWidth <= 0 ||
    containerHeight <= 0
  ) {
    return null;
  }

  const imageAspect = sourceWidth / sourceHeight;
  const displayAspect = containerWidth / containerHeight;

  let renderWidth: number;
  let renderHeight: number;
  let offsetX: number;
  let offsetY: number;

  if (displayAspect > imageAspect) {
    renderHeight = containerHeight;
    renderWidth = renderHeight * imageAspect;
    offsetX = (containerWidth - renderWidth) / 2;
    offsetY = 0;
  } else {
    renderWidth = containerWidth;
    renderHeight = renderWidth / imageAspect;
    offsetX = 0;
    offsetY = (containerHeight - renderHeight) / 2;
  }

  return {
    xPct: (offsetX + (x / sourceWidth) * renderWidth) / containerWidth,
    yPct: (offsetY + (y / sourceHeight) * renderHeight) / containerHeight,
  };
}

export async function toggleFullscreen(el: HTMLElement): Promise<boolean> {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return false;
  }
  await el.requestFullscreen();
  return true;
}
