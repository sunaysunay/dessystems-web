// CI-T31 — Content & Fitment Score
// Decomposes into 10 line items; each links to a PIM field.

export interface ContentLineItem {
  key: string;
  label: string;
  pim_field: string;
  weight: number;
  score: number;
  max_score: number;
}

export const CONTENT_FIELDS: Omit<ContentLineItem, 'score'>[] = [
  { key: 'title',         label: 'Product title',         pim_field: 'title',              weight: 0.15, max_score: 100 },
  { key: 'description',   label: 'Description',           pim_field: 'description',        weight: 0.15, max_score: 100 },
  { key: 'images',        label: 'Image count & quality', pim_field: 'images',             weight: 0.15, max_score: 100 },
  { key: 'specs',         label: 'Specifications',        pim_field: 'specifications',     weight: 0.10, max_score: 100 },
  { key: 'fitment',       label: 'Fitment data',          pim_field: 'fitment_vehicles',   weight: 0.10, max_score: 100 },
  { key: 'ean',           label: 'EAN/barcode',           pim_field: 'ean',                weight: 0.05, max_score: 100 },
  { key: 'mpn',           label: 'MPN',                   pim_field: 'mpn',                weight: 0.05, max_score: 100 },
  { key: 'brand',         label: 'Brand',                 pim_field: 'brand',              weight: 0.05, max_score: 100 },
  { key: 'category',      label: 'Category mapping',      pim_field: 'category_id',        weight: 0.10, max_score: 100 },
  { key: 'cross_ref',     label: 'Cross-references',      pim_field: 'cross_references',   weight: 0.10, max_score: 100 },
];

export interface ContentInput {
  title?: string;
  description?: string;
  image_count: number;
  spec_count: number;
  fitment_count: number;
  has_ean: boolean;
  has_mpn: boolean;
  has_brand: boolean;
  has_category: boolean;
  cross_ref_count: number;
}

export function scoreContentField(key: string, input: ContentInput): number {
  switch (key) {
    case 'title':
      if (!input.title) return 0;
      if (input.title.length < 10) return 30;
      if (input.title.length < 30) return 60;
      return 100;

    case 'description':
      if (!input.description) return 0;
      if (input.description.length < 50) return 30;
      if (input.description.length < 200) return 60;
      return 100;

    case 'images':
      if (input.image_count === 0) return 0;
      if (input.image_count === 1) return 40;
      if (input.image_count < 4) return 70;
      return 100;

    case 'specs':
      if (input.spec_count === 0) return 0;
      if (input.spec_count < 3) return 40;
      if (input.spec_count < 8) return 70;
      return 100;

    case 'fitment':
      if (input.fitment_count === 0) return 0;
      if (input.fitment_count < 5) return 50;
      return 100;

    case 'ean':       return input.has_ean ? 100 : 0;
    case 'mpn':       return input.has_mpn ? 100 : 0;
    case 'brand':     return input.has_brand ? 100 : 0;
    case 'category':  return input.has_category ? 100 : 0;

    case 'cross_ref':
      if (input.cross_ref_count === 0) return 0;
      if (input.cross_ref_count < 3) return 50;
      return 100;

    default: return 0;
  }
}

export function computeContentScore(input: ContentInput): {
  score: number;
  items: ContentLineItem[];
} {
  const items: ContentLineItem[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const field of CONTENT_FIELDS) {
    const fieldScore = scoreContentField(field.key, input);
    items.push({ ...field, score: fieldScore });
    weightedSum += field.weight * fieldScore;
    totalWeight += field.weight;
  }

  return {
    score: totalWeight > 0 ? Math.round(weightedSum / totalWeight * 10) / 10 : 0,
    items,
  };
}
