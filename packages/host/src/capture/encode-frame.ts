import sharp from "sharp";

export interface StreamEncodeSettings {
  maxWidth: number;
  jpegQuality: number;
}

/**
 * Downscale a full-screen JPEG to stream size (avoids allocating 4K RGBA).
 */
const JPEG_OPTIONS = {
  mozjpeg: false,
  progressive: false,
  chromaSubsampling: "4:2:0" as const,
  effort: 1,
};

export async function downscaleJpeg(
  fullJpeg: Buffer,
  width: number,
  height: number,
  settings: StreamEncodeSettings,
): Promise<{ jpeg: Buffer; width: number; height: number }> {
  const scaledHeight = Math.round((height * settings.maxWidth) / width);

  const { data, info } = await sharp(fullJpeg, { sequentialRead: true })
    .resize(settings.maxWidth, scaledHeight, {
      fit: "inside",
      withoutEnlargement: true,
      fastShrinkOnLoad: true,
    })
    .jpeg({
      ...JPEG_OPTIONS,
      quality: settings.jpegQuality,
    })
    .toBuffer({ resolveWithObject: true });

  return { jpeg: data, width: info.width, height: info.height };
}

/**
 * Resize RGBA desktop frames (DXGI path). Two-pass nearest resize is much faster
 * than a single high-quality shrink from 4K.
 */
export async function encodeRgbaStreamJpeg(
  rgba: Buffer,
  width: number,
  height: number,
  settings: StreamEncodeSettings,
): Promise<{ jpeg: Buffer; width: number; height: number }> {
  const targetHeight = Math.round((height * settings.maxWidth) / width);

  if (width <= settings.maxWidth) {
    const { data, info } = await sharp(rgba, { raw: { width, height, channels: 4 } })
      .jpeg({ ...JPEG_OPTIONS, quality: settings.jpegQuality })
      .toBuffer({ resolveWithObject: true });
    return { jpeg: data, width: info.width, height: info.height };
  }

  const midWidth = Math.min(width, settings.maxWidth * 2);
  const midHeight = Math.round((height * midWidth) / width);

  const { data, info } = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .resize(midWidth, midHeight, { kernel: sharp.kernel.nearest })
    .resize(settings.maxWidth, targetHeight, {
      fit: "inside",
      withoutEnlargement: true,
      kernel: sharp.kernel.nearest,
    })
    .jpeg({ ...JPEG_OPTIONS, quality: settings.jpegQuality })
    .toBuffer({ resolveWithObject: true });

  return { jpeg: data, width: info.width, height: info.height };
}

export interface CapturedImage {
  width: number;
  height: number;
  toJpeg(copyOutputData?: boolean | null): Promise<Uint8Array>;
  toRaw(copyOutputData?: boolean | null): Promise<Uint8Array>;
}

export async function encodeStreamJpeg(
  image: CapturedImage,
  settings: StreamEncodeSettings,
): Promise<{ jpeg: Buffer; width: number; height: number }> {
  const { width, height } = image;

  if (width <= settings.maxWidth) {
    return {
      jpeg: Buffer.from(await image.toJpeg(false)),
      width,
      height,
    };
  }

  const fullJpeg = Buffer.from(await image.toJpeg(false));

  try {
    return await downscaleJpeg(fullJpeg, width, height, settings);
  } catch {
    return encodeStreamJpegFromRgba(image, settings);
  }
}

async function encodeStreamJpegFromRgba(
  image: CapturedImage,
  settings: StreamEncodeSettings,
): Promise<{ jpeg: Buffer; width: number; height: number }> {
  const { width, height } = image;
  const rgba = Buffer.from(await image.toRaw(false));
  const scaledHeight = Math.round((height * settings.maxWidth) / width);

  const { data, info } = await sharp(rgba, {
    raw: { width, height, channels: 4 },
  })
    .resize(settings.maxWidth, scaledHeight, {
      fit: "inside",
      withoutEnlargement: true,
      fastShrinkOnLoad: true,
    })
    .jpeg({
      ...JPEG_OPTIONS,
      quality: settings.jpegQuality,
    })
    .toBuffer({ resolveWithObject: true });

  return { jpeg: data, width: info.width, height: info.height };
}
