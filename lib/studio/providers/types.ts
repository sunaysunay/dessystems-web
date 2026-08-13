// lib/studio/providers/types.ts — provider interfaces for MK007

export interface SegmentationResult {
  maskPngUrl: string;    // alpha mask incl. glass transparency
  cutoutPngUrl: string;  // vehicle on transparent background
  confidence: number;    // 0..1
  plateBBox?: { x: number; y: number; w: number; h: number };
}

export interface CompositionResult {
  resultUrl: string;
  costCents: number;
}

export interface SegmentationProvider {
  name: string;
  segment(input: { imageUrl: string }): Promise<SegmentationResult>;
}

export interface CompositionProvider {
  name: string;
  compose(input: {
    cutoutUrl: string;
    prompt: string;       // built from preset fields + PROTECTION_SUFFIX
    edgeFeatherPx: number;
    seed?: number;
  }): Promise<CompositionResult>;
}
