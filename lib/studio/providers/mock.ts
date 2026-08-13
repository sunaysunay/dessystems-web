// lib/studio/providers/mock.ts — MockProvider for Phase 1 development
// Returns fixture data without any API calls or cost

import type { SegmentationProvider, CompositionProvider } from './types';

// Fixture SVG data URIs that work without real image files
const MOCK_CUTOUT_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const MOCK_MASK_URL = MOCK_CUTOUT_URL;
const MOCK_COMPOSED_URL = MOCK_CUTOUT_URL;

export const MockSegmentationProvider: SegmentationProvider = {
  name: 'mock',
  async segment(_input) {
    await new Promise(r => setTimeout(r, 300)); // simulate latency
    return {
      maskPngUrl: MOCK_MASK_URL,
      cutoutPngUrl: MOCK_CUTOUT_URL,
      confidence: 0.98,
      plateBBox: { x: 120, y: 280, w: 180, h: 38 },
    };
  },
};

export const MockCompositionProvider: CompositionProvider = {
  name: 'mock',
  async compose(_input) {
    await new Promise(r => setTimeout(r, 500));
    return {
      resultUrl: MOCK_COMPOSED_URL,
      costCents: 0,
    };
  },
};

export function getSegmentationProvider(): SegmentationProvider {
  const name = process.env.STUDIO_SEGMENT_PROVIDER ?? 'mock';
  if (name === 'mock') return MockSegmentationProvider;
  // Phase 3: add real providers here
  console.warn(`[studio] Unknown STUDIO_SEGMENT_PROVIDER="${name}", falling back to mock`);
  return MockSegmentationProvider;
}

export function getCompositionProvider(): CompositionProvider {
  const name = process.env.STUDIO_COMPOSE_PROVIDER ?? 'mock';
  if (name === 'mock') return MockCompositionProvider;
  console.warn(`[studio] Unknown STUDIO_COMPOSE_PROVIDER="${name}", falling back to mock`);
  return MockCompositionProvider;
}
