import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface CsvRow {
  sku: string;
  name_en: string;
  name_nl?: string;
  name_de?: string;
  name_fr?: string;
  name_tr?: string;
  description_en?: string;
  description_nl?: string;
  description_de?: string;
  brand?: string;
  slug?: string;
  price_cents?: string;
  compare_at_cents?: string;
  currency?: string;
  ean?: string;
  weight_g?: string;
  category?: string;
  image_url?: string;
  product_type?: string;
  requires_fitment?: string;
  tax_class?: string;
  warranty_months?: string;
}

const REQUIRED_COLUMNS = ['sku', 'name_en'];

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
  const rows = lines.slice(1).map(line => {
    const vals = line.split(sep).map(v => v.trim().replace(/^["']|["']$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
  return { headers, rows };
}

interface ValidationError {
  row: number;
  column: string;
  message: string;
}

function validateRows(rows: Record<string, string>[], headers: string[], existingSkus: Set<string>) {
  const errors: ValidationError[] = [];
  const seenSkus = new Set<string>();

  for (const col of REQUIRED_COLUMNS) {
    if (!headers.includes(col)) {
      errors.push({ row: 0, column: col, message: `required column "${col}" missing from CSV header` });
    }
  }
  if (errors.length) return errors;

  rows.forEach((row, i) => {
    const rowNum = i + 2;

    if (!row.sku?.trim()) {
      errors.push({ row: rowNum, column: 'sku', message: 'SKU is required' });
      return;
    }
    const sku = row.sku.trim().toUpperCase();
    if (seenSkus.has(sku)) {
      errors.push({ row: rowNum, column: 'sku', message: `duplicate SKU "${sku}" in CSV` });
    }
    if (existingSkus.has(sku)) {
      errors.push({ row: rowNum, column: 'sku', message: `SKU "${sku}" already exists in catalog` });
    }
    seenSkus.add(sku);

    if (!row.name_en?.trim()) {
      errors.push({ row: rowNum, column: 'name_en', message: 'English name is required' });
    }

    if (row.price_cents && isNaN(Number(row.price_cents))) {
      errors.push({ row: rowNum, column: 'price_cents', message: 'price_cents must be a number' });
    }

    if (row.weight_g && isNaN(Number(row.weight_g))) {
      errors.push({ row: rowNum, column: 'weight_g', message: 'weight_g must be a number' });
    }

    if (row.image_url) {
      try { new URL(row.image_url); }
      catch { errors.push({ row: rowNum, column: 'image_url', message: 'invalid image URL' }); }
    }
  });

  return errors;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
}

// POST /api/bop/shop/catalog/import/csv
// Body: multipart with "file" (CSV) and optional "dry_run" flag
export async function POST(req: NextRequest) {
  const supabase = getServerClient();

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: 'invalid multipart body' }, { status: 400 }); }

  const file = form.get('file') as File | null;
  const dryRun = form.get('dry_run') === '1' || form.get('dry_run') === 'true';

  if (!file) return NextResponse.json({ error: 'CSV file required' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'max 5 MB' }, { status: 413 });

  const text = await file.text();
  const { headers, rows } = parseCsv(text);

  if (!rows.length) return NextResponse.json({ error: 'CSV contains no data rows' }, { status: 400 });

  const { data: existingVariants } = await supabase
    .from('shop_variants')
    .select('sku');
  const existingSkus = new Set((existingVariants ?? []).map((v: { sku: string }) => v.sku.toUpperCase()));

  const errors = validateRows(rows, headers, existingSkus);

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      total_rows: rows.length,
      columns_found: headers,
      errors,
      would_create: errors.length === 0 ? rows.length : 0,
    });
  }

  if (errors.length) {
    return NextResponse.json({
      ok: false,
      errors,
      message: `${errors.length} validation error(s) — fix and retry`,
    }, { status: 422 });
  }

  const { data: brands } = await supabase.from('shop_brands').select('id, slug');
  const brandMap = new Map((brands ?? []).map((b: { id: string; slug: string }) => [b.slug, b.id]));

  const { data: categories } = await supabase.from('shop_categories').select('id, slug');
  const catMap = new Map((categories ?? []).map((c: { id: string; slug: string }) => [c.slug, c.id]));

  const created: string[] = [];
  const failed: { sku: string; error: string }[] = [];

  for (const row of rows) {
    try {
      const sku = row.sku.trim().toUpperCase();
      const slug = row.slug?.trim() || slugify(row.name_en);

      const name: Record<string, string> = { en: row.name_en.trim() };
      if (row.name_nl) name.nl = row.name_nl.trim();
      if (row.name_de) name.de = row.name_de.trim();
      if (row.name_fr) name.fr = row.name_fr.trim();
      if (row.name_tr) name.tr = row.name_tr.trim();

      const descHtml: Record<string, string> = {};
      if (row.description_en) descHtml.en = row.description_en;
      if (row.description_nl) descHtml.nl = row.description_nl;
      if (row.description_de) descHtml.de = row.description_de;

      const brandId = row.brand ? brandMap.get(slugify(row.brand)) ?? null : null;
      const catId = row.category ? catMap.get(slugify(row.category)) ?? null : null;

      const { data: product, error: prodErr } = await supabase
        .from('shop_products')
        .insert({
          name,
          slug,
          description_html: Object.keys(descHtml).length ? descHtml : null,
          brand_id: brandId,
          primary_category: catId,
          product_type: row.product_type || 'physical',
          requires_fitment: row.requires_fitment === 'true',
          status: 'active',
          lifecycle_state: 'draft',
          visibility: 'everywhere',
        })
        .select('id')
        .single();

      if (prodErr) throw new Error(prodErr.message);

      const { error: varErr } = await supabase
        .from('shop_variants')
        .insert({
          product_id: product.id,
          sku,
          ean: row.ean?.trim() || null,
          price_cents: row.price_cents ? Number(row.price_cents) : 0,
          compare_at_cents: row.compare_at_cents ? Number(row.compare_at_cents) : null,
          currency: row.currency?.toUpperCase() || 'EUR',
          weight_g: row.weight_g ? Number(row.weight_g) : null,
          warranty_months: row.warranty_months ? Number(row.warranty_months) : null,
          is_sellable: true,
          lifecycle_state: 'draft',
          position: 0,
        });

      if (varErr) throw new Error(varErr.message);

      created.push(sku);
    } catch (e: any) {
      failed.push({ sku: row.sku?.trim() || '?', error: e.message });
    }
  }

  return NextResponse.json({
    ok: failed.length === 0,
    created: created.length,
    failed,
    skus: created,
  }, { status: failed.length ? 207 : 201 });
}
