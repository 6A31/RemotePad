import { createRequire } from "node:module";

export interface DxgiFrame {
  data: Buffer;
  width: number;
  height: number;
}

export interface DxgiBackend {
  initialize(): void;
  getFrame(): DxgiFrame;
  dispose(): void;
}

type DesktopDuplicationCtor = new (screenNum: number) => {
  initialize(): void;
  getFrame(retryCount?: number): DxgiFrame;
};

let duplicationModule: { DesktopDuplication: DesktopDuplicationCtor } | null = null;

function loadDuplicationModule(): { DesktopDuplication: DesktopDuplicationCtor } | null {
  if (duplicationModule) return duplicationModule;
  if (process.platform !== "win32") return null;

  try {
    const require = createRequire(import.meta.url);
    duplicationModule = require("windows-desktop-duplication") as {
      DesktopDuplication: DesktopDuplicationCtor;
    };
    return duplicationModule;
  } catch (err) {
    console.warn("[capture] DXGI module unavailable:", err);
    return null;
  }
}

export function createDxgiBackend(monitorIndex = 0): DxgiBackend | null {
  const mod = loadDuplicationModule();
  if (!mod) return null;

  const instance = new mod.DesktopDuplication(monitorIndex);

  return {
    initialize() {
      instance.initialize();
    },
    getFrame() {
      return instance.getFrame();
    },
    dispose() {
      // native addon has no explicit teardown
    },
  };
}

export function isDxgiCaptureAvailable(): boolean {
  return loadDuplicationModule() !== null;
}
