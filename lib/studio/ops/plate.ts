/* eslint-disable @typescript-eslint/no-unused-vars */
// lib/studio/ops/plate.ts — license plate operations (deterministic, local sharp)
import sharp from 'sharp';
import type { StudioPlateBBox, PlateOp } from '../types';

const DEALER_PLATE_TEXT = process.env.STUDIO_DEALER_PLATE_TEXT ?? 'DES CAMPERS · WWW.DESCAMPERS.COM';

export async function applyPlateOp(
  imageBuffer: Buffer,
  plateOp: PlateOp,
  plateBBox: StudioPlateBBox | undefined,
  options: { blankColor?: string } = {},
): Promise<Buffer> {
  if (plateOp === 'keep' || !plateBBox) return imageBuffer;

  const { x, y, w, h } = plateBBox;
  const img = sharp(imageBuffer);
  const meta = await img.metadata();
  const imgW = meta.width ?? 1920;
  const imgH = meta.height ?? 1080;

  if (plateOp === 'blur') {
    const region = await sharp(imageBuffer)
      .extract({ left: x, top: y, width: w, height: h })
      .blur(20)
      .toBuffer();

    return sharp(imageBuffer)
      .composite([{ input: region, left: x, top: y }])
      .toBuffer();
  }

  if (plateOp === 'blank') {
    const color = options.blankColor ?? '#FFFFFF';
    // Convert hex to rgb
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    const rect = await sharp({
      create: { width: w, height: h, channels: 4, background: { r, g, b, alpha: 1 } },
    }).png().toBuffer();

    return sharp(imageBuffer)
      .composite([{ input: rect, left: x, top: y }])
      .toBuffer();
  }

  if (plateOp === 'dealer') {
    // Generate a simple dealer plate SVG and composite over the plate region
    const fontSize = Math.max(8, Math.round(h * 0.35));
    const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" rx="4" ry="4" fill="#FFFFFF" stroke="#CCCCCC" stroke-width="1"/>
      <text x="${w / 2}" y="${h * 0.65}" font-family="Arial" font-size="${fontSize}" font-weight="bold"
        text-anchor="middle" fill="#1a1a1a">${DEALER_PLATE_TEXT}</text>
    </svg>`;

    const plateImg = await sharp(Buffer.from(svg)).png().toBuffer();
    return sharp(imageBuffer)
      .composite([{ input: plateImg, left: x, top: y }])
      .toBuffer();
  }

  return imageBuffer;
}
