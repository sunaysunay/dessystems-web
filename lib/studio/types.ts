// lib/studio/types.ts — shared types for MK007 AI Vehicle Studio

export type StudioSessionStatus = 'draft' | 'processing' | 'review' | 'completed' | 'failed' | 'cancelled';
export type StudioImageStatus   = 'pending' | 'processing' | 'done' | 'failed' | 'skipped';
export type StudioStepKind      = 'segment' | 'compose' | 'plate' | 'brand' | 'export';
export type StudioStepStatus    = 'pending' | 'running' | 'done' | 'failed';
export type PlateOp             = 'keep' | 'blur' | 'blank' | 'dealer';
export type LogoPosition        = 'TL' | 'TR' | 'BL' | 'BR';

export interface StudioSettings {
  plateOp?: PlateOp;
  plateColor?: string;      // hex, for blank op
  logoEnabled?: boolean;
  logoPosition?: LogoPosition;
  logoOpacity?: number;     // 0..1
  logoSizePercent?: number; // % of image width, default 14
  logoMarginPx?: number;
  featherPx?: number;       // 0..30
  exportTargets?: string[]; // export target codes
  backgroundPath?: string | null; // custom showroom background storage path
}

export interface StudioImageOverrides extends Partial<StudioSettings> {
  presetCode?: string;
}

export interface StudioPlateBBox {
  x: number; y: number; w: number; h: number;
}

export interface StudioStepOutput {
  resultPath?: string;
  maskPath?: string;
  cutoutPath?: string;
  confidence?: number;
  plateBBox?: StudioPlateBBox;
  targets?: string[];
}

export interface StudioPreset {
  id: string;
  code: string;
  label_i18n: Record<string, string>;
  fields: {
    environment: string;
    lighting: string;
    ground: string;
    reflection: 'none' | 'soft' | 'strong';
    shadow: 'none' | 'natural' | 'soft' | 'hard';
    perspective: string;
  };
  thumbnail_path?: string;
  active: boolean;
  sort: number;
}

export interface StudioExportTarget {
  code: string;
  label: string;
  max_width: number;
  max_height: number;
  format: 'jpeg' | 'webp' | 'png';
  quality: number;
  watermark: boolean;
}

export interface StudioSession {
  id: string;
  listing_id?: string;
  created_by: string;
  status: StudioSessionStatus;
  preset_code?: string;
  settings: StudioSettings;
  cost_cents: number;
  created_at: string;
  updated_at: string;
  images?: StudioImage[];
}

export interface StudioImage {
  id: string;
  session_id: string;
  position: number;
  original_path: string;
  status: StudioImageStatus;
  overrides?: StudioImageOverrides;
  selected: boolean;
  error?: string;
  steps?: StudioStep[];
}

export interface StudioStep {
  id: string;
  image_id: string;
  step_no: number;
  kind: StudioStepKind;
  input: Record<string, unknown>;
  output?: StudioStepOutput;
  provider?: string;
  cost_cents: number;
  status: StudioStepStatus;
  started_at?: string;
  finished_at?: string;
}

export const PROTECTION_SUFFIX =
  'Preserve the vehicle exactly: original paint color, wheels, body shape, ' +
  'stickers, existing damage and accessories must remain unchanged. ' +
  'Only replace the environment. Do not alter or reconstruct the vehicle.';

export const STEP_ORDER: StudioStepKind[] = ['segment', 'compose', 'plate', 'brand', 'export'];
