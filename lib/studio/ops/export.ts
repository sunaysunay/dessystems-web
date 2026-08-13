// lib/studio/ops/export.ts — per-marketplace export (deterministic, local sharp)
import sharp from 'sharp';
import type { StudioExportTarget } from '../types';

export interface ExportResult {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
}

export async function exportForTarget(
  imageBuffer: Buffer,
  target: StudioExportTarget,
): Promise<ExportResult> {
  let pipeline = sharp(imageBuffer).resize(target.max_width, target.max_height, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  if (target.watermark) {
    const meta = await sharp(imageBuffer).metadata();
    const w = meta.width ?? target.max_width;
    const h = meta.height ?? target.max_height;
    const domain = process.env.STUDIO_WATERMARK_TEXT ?? 'descampers.com';
    const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="50%" font-family="Arial" font-size="28" font-weight="bold"
        fill="white" fill-opacity="0.12" text-anchor="middle" dominant-baseline="middle"
        transform="rotate(-35,${w/2},${h/2})">${domain}</text>
    </svg>`;
    pipeline = pipeline.composite([{ input: Buffer.from(svg), blend: 'over' }]);
  }

  pipeline = pipeline.withMetadata();

  let buf: Buffer;
  if (target.format === 'webp') {
    buf = await pipeline.webp({ quality: target.quality }).toBuffer();
  } else if (target.format === 'png') {
    buf = await pipeline.png().toBuffer();
  } else {
    buf = await pipeline.jpeg({ quality: target.quality }).toBuffer();
  }

  const outMeta = await sharp(buf).metadata();
  return { buffer: buf, format: target.format, width: outMeta.width ?? 0, height: outMeta.height ?? 0 };
}
