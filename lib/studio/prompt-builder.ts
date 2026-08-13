// lib/studio/prompt-builder.ts — builds deterministic composition prompts from preset fields
import type { StudioPreset } from './types';
import { PROTECTION_SUFFIX } from './types';

export function buildPrompt(preset: StudioPreset): string {
  const f = preset.fields;
  if (f.environment === 'transparent') return 'Remove the background completely. Output a transparent PNG.';

  const parts: string[] = [
    `Place the vehicle in a ${f.environment}.`,
    `Lighting: ${f.lighting}.`,
    `Ground surface: ${f.ground}.`,
  ];

  if (f.reflection !== 'none') {
    parts.push(`Add a ${f.reflection} floor reflection of the vehicle.`);
  }
  if (f.shadow !== 'none') {
    parts.push(`Include a ${f.shadow} ground shadow.`);
  }
  parts.push(`Camera perspective: ${f.perspective}.`);
  parts.push(PROTECTION_SUFFIX);

  return parts.join(' ');
}
