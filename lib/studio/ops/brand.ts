// lib/studio/ops/brand.ts — dealer logo overlay (deterministic, local sharp)
import sharp from 'sharp';
import type { LogoPosition } from '../types';

interface BrandOptions {
  logoBuffer: Buffer;
  position: LogoPosition;
  opacity?: number;       // 0..1, default 0.9
  sizePercent?: number;   // % of image width, default 14
  marginPx?: number;      // default 24
}

export async function applyBrand(imageBuffer: Buffer, opts: BrandOptions): Promise<Buffer> {
  const { logoBuffer, position, opacity = 0.9, sizePercent = 14, marginPx = 24 } = opts;

  const meta = await sharp(imageBuffer).metadata();
  const imgW = meta.width ?? 1920;
  const imgH = meta.height ?? 1080;

  const logoW = Math.round(imgW * (sizePercent / 100));
  const logoBuf = await sharp(logoBuffer)
    .resize(logoW, undefined, { fit: 'inside' })
    .toBuffer();

  const logoMeta = await sharp(logoBuf).metadata();
  const lW = logoMeta.width ?? logoW;
  const lH = logoMeta.height ?? 60;

  // Apply opacity via modulate if < 1
  const logoWithOpacity = opacity < 1
    ? await sharp(logoBuf).composite([{
        input: Buffer.from(`<svg width="${lW}" height="${lH}"><rect width="${lW}" height="${lH}" fill="black" fill-opacity="${1 - opacity}"/></svg>`),
        blend: 'dest-in',
      }]).toBuffer()
    : logoBuf;

  // Compute corner position
  let left = marginPx;
  let top  = marginPx;
  if (position === 'TR' || position === 'BR') left = imgW - lW - marginPx;
  if (position === 'BL' || position === 'BR') top  = imgH - lH - marginPx;

  // Auto-contrast: sample average luminance under logo region
  const regionStats = await sharp(imageBuffer)
    .extract({ left, top: Math.max(0, top), width: Math.min(lW, imgW - left), height: Math.min(lH, imgH - Math.max(0, top)) })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = regionStats.data;
  const avgLum = pixels.reduce((s: number, v: number) => s + v, 0) / pixels.length;

  const composites: Parameters<ReturnType<typeof sharp>["composite"]>[0] = [];

  // If region is bright (avgLum > 180) and logo is likely light, add dark shadow pad
  if (avgLum > 180) {
    const shadow = await sharp({
      create: { width: lW + 8, height: lH + 8, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.3 } },
    }).png().blur(4).toBuffer();
    composites.push({ input: shadow, left: Math.max(0, left - 4), top: Math.max(0, top - 4), blend: 'over' });
  }

  composites.push({ input: logoWithOpacity, left, top, blend: 'over' });

  return sharp(imageBuffer).composite(composites).toBuffer();
}
