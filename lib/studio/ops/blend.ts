// lib/studio/ops/blend.ts — edge feather blending (deterministic, local sharp)
// Used as "Edge Smoothing" control: re-run is free and local
import sharp from 'sharp';

export async function blendEdges(
  cutoutBuffer: Buffer,     // vehicle on transparent background (PNG with alpha)
  backgroundBuffer: Buffer, // composed environment image
  featherPx: number,        // 0..30
): Promise<Buffer> {
  if (featherPx <= 0) {
    // No blending: just composite cutout over background
    return sharp(backgroundBuffer)
      .composite([{ input: cutoutBuffer, blend: 'over' }])
      .toBuffer();
  }

  // Blur the cutout's alpha mask by featherPx to soften edges
  const feathered = await sharp(cutoutBuffer)
    .blur(featherPx)
    .toBuffer();

  return sharp(backgroundBuffer)
    .composite([{ input: feathered, blend: 'over' }])
    .toBuffer();
}
