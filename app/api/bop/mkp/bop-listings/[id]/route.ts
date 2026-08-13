import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const SPEC_TABLE: Record<string, string> = {
  car: 'bop_listing_specs_car',
  van: 'bop_listing_specs_van',
  truck: 'bop_listing_specs_truck',
  trailer: 'bop_listing_specs_trailer',
  machinery: 'bop_listing_specs_machinery',
  construction: 'bop_listing_specs_machinery',
  camper: 'bop_listing_specs_camper',
  caravan: 'bop_listing_specs_camper',
  bus: 'bop_listing_specs_van',
};

// Only these core columns are patchable from the editor
// Column whitelist per spec table (mirrors migrations 01 + 41)
const SPEC_COLS: Record<string, string[]> = {
  bop_listing_specs_van: ['mileage','fuel','transmission','power_hp','euro_norm','vin','roof_height','cargo_vol_m3','payload_kg','doors','seats','apk_date','rdw_ok','custom_attrs',
    'license_plate','first_registration','trim','color','upholstery','kerb_weight_kg','length_mm','width_mm','height_mm','wheelbase_mm','towing_braked_kg','towing_unbraked_kg'],
  bop_listing_specs_truck: ['mileage','axles','gvw_kg','payload_kg','wheelbase_mm','cabin_type','power_hp','euro_norm','fuel','tail_lift','crane','retarder','tachograph','hydraulics','custom_attrs'],
  bop_listing_specs_trailer: ['trailer_type','axles','payload_kg','length_mm','width_mm','vol_m3','refrigeration','temp_range','lift_axle','adr','fifth_wheel','loading_type','custom_attrs'],
  bop_listing_specs_machinery: ['machine_type','op_hours','op_weight_kg','power_kw','lift_cap_kg','boom_reach_m','track_type','fuel_type','ce_marking','inspection_date','custom_attrs'],
  bop_listing_specs_camper: ['beds','sleeping_cap','layout_type','shower','toilet','solar','heating','length_mm','width_mm','height_mm','gvw_kg','chassis_brand','water_tank_l','custom_attrs'],
  bop_listing_specs_car: ['license_plate','first_registration','trim','vin','color','upholstery','nap_verified','apk_date','rdw_ok','mileage','fuel','transmission','gears','power_kw','power_hp',
    'torque_nm','cylinders','displacement_cc','turbo','drivetrain','euro_norm','energy_label','co2_gkm','consumption_combined','tank_capacity_l','top_speed_kmh','acceleration_0100',
    'doors','seats','kerb_weight_kg','length_mm','width_mm','height_mm','wheelbase_mm','wheel_size_inch','tyre_size_front','tyre_size_rear','towing_braked_kg','towing_unbraked_kg','custom_attrs'],
};

const CORE_COLS = ['sale_method','status','workflow_status','category','brand_id','model_id','body_type_code',
  'year','condition','country_origin','latitude','longitude','is_verified','source_asset_id'];

function one(v: any) { return Array.isArray(v) ? v[0] ?? null : v ?? null; }
function pick(obj: any, cols: string[]) {
  const out: any = {};
  for (const c of cols) if (c in obj) out[c] = obj[c] === '' ? null : obj[c];
  return out;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();

  const { data, error } = await supabase
    .from('bop_listings')
    .select(`
      *,
      bop_brands ( id, name ),
      bop_models ( id, name ),
      bop_listing_pricing (*),
      bop_listing_content (*),
      bop_listing_media (*),
      bop_listing_docs (*),
      bop_listing_attrs (*),
      bop_listing_channels (*),
      bop_listing_features ( feature_id )
    `)
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // category-specific spec row
  const specTable = SPEC_TABLE[data.category] ?? 'bop_listing_specs_van';
  const { data: spec } = await supabase.from(specTable).select('*').eq('listing_id', id).maybeSingle();

  return NextResponse.json({
    listing: {
      ...data,
      pricing: one(data.bop_listing_pricing),
      content: data.bop_listing_content ?? [],
      media: (data.bop_listing_media ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      docs: data.bop_listing_docs ?? [],
      attrs: data.bop_listing_attrs ?? [],
      channels: data.bop_listing_channels ?? [],
      feature_ids: (data.bop_listing_features ?? []).map((f: any) => f.feature_id),
      spec: spec ?? {},
      spec_table: specTable,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const body = await req.json();
  const section: string = body.section;
  const data = body.data;

  // OLS enforcement: if a LIVE lock exists on this listing and the caller's
  // session doesn't hold it, reject the write. No lock at all → allowed
  // (keeps MP001 quick-edits and agents working; MP003 always acquires one).
  // Never trust the UI — this is the server-side gate.
  const lockSession = req.headers.get('x-lock-session');
  const { data: lock } = await supabase.from('bop_object_locks').select('locked_by, session_id, acquired_at')
    .eq('object_type', 'listing').eq('object_id', id)
    .gt('expires_at', new Date().toISOString()).maybeSingle();
  if (lock && lock.session_id !== lockSession) {
    return NextResponse.json(
      { error: `Locked by ${lock.locked_by} (editing since ${new Date(lock.acquired_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })})`, locked_by: lock.locked_by },
      { status: 423 },
    );
  }

  try {
    if (section === 'core') {
      const { data: cur } = await supabase.from('bop_listings').select('category').eq('id', id).single();
      const patch = pick(data, CORE_COLS);
      const { error } = await supabase.from('bop_listings').update(patch).eq('id', id);
      if (error) throw error;
      // Category changed → seed the new category's spec row and clear now-invalid
      // (category-specific) feature selections. Old spec row is left in place (harmless).
      if (patch.category && cur && patch.category !== cur.category) {
        const newTable = SPEC_TABLE[patch.category] ?? 'bop_listing_specs_van';
        await supabase.from(newTable).upsert({ listing_id: id }, { onConflict: 'listing_id' });
        await supabase.from('bop_listing_features').delete().eq('listing_id', id);
      }
    }
    else if (section === 'pricing') {
      const { error } = await supabase.from('bop_listing_pricing')
        .upsert({ listing_id: id, ...data, updated_at: new Date().toISOString() }, { onConflict: 'listing_id' });
      if (error) throw error;
    }
    else if (section === 'specs') {
      const { data: l } = await supabase.from('bop_listings').select('category').eq('id', id).single();
      const specTable = SPEC_TABLE[l?.category] ?? 'bop_listing_specs_van';
      // whitelist to the target table's columns — stray keys (stale fields from a
      // previous category's spec row, or agent/import payloads) must not 500 the save
      const allowed = SPEC_COLS[specTable];
      const clean = allowed ? pick(data, allowed) : data;
      const { error } = await supabase.from(specTable)
        .upsert({ listing_id: id, ...clean }, { onConflict: 'listing_id' });
      if (error) throw error;
    }
    else if (section === 'content') {
      // data = array of { locale, title, short_desc, full_desc, highlights[], features[], seo_* }
      const rows = (data as any[]).map(r => ({ ...r, listing_id: id }));
      const { error } = await supabase.from('bop_listing_content')
        .upsert(rows, { onConflict: 'listing_id,locale' });
      if (error) throw error;
    }
    else if (section === 'features') {
      // data = array of feature_id (full replace)
      await supabase.from('bop_listing_features').delete().eq('listing_id', id);
      if ((data as any[]).length) {
        const rows = (data as number[]).map(fid => ({ listing_id: id, feature_id: fid }));
        const { error } = await supabase.from('bop_listing_features').insert(rows);
        if (error) throw error;
      }
    }
    else if (section === 'attrs') {
      // data = array of { attr_key, attr_value } (full replace)
      await supabase.from('bop_listing_attrs').delete().eq('listing_id', id);
      if ((data as any[]).length) {
        const rows = (data as any[]).map(a => ({ listing_id: id, attr_key: a.attr_key, attr_value: a.attr_value ?? 'true' }));
        const { error } = await supabase.from('bop_listing_attrs').insert(rows);
        if (error) throw error;
      }
    }
    else if (section === 'media') {
      // data = full array (replace)
      await supabase.from('bop_listing_media').delete().eq('listing_id', id);
      if ((data as any[]).length) {
        const rows = (data as any[]).map((m, i) => ({
          listing_id: id, media_type: m.media_type ?? 'photo', url: m.url,
          thumb_url: m.thumb_url ?? null, sort_order: m.sort_order ?? i,
          is_cover: !!m.is_cover, label: m.label ?? null, watermarked: !!m.watermarked,
        }));
        const { error } = await supabase.from('bop_listing_media').insert(rows);
        if (error) throw error;
      }
    }
    else if (section === 'docs') {
      await supabase.from('bop_listing_docs').delete().eq('listing_id', id);
      if ((data as any[]).length) {
        const rows = (data as any[]).map(d => ({
          listing_id: id, doc_type: d.doc_type, url: d.url,
          expiry_date: d.expiry_date || null, verified: !!d.verified,
        }));
        const { error } = await supabase.from('bop_listing_docs').insert(rows);
        if (error) throw error;
      }
    }
    else if (section === 'channels') {
      // upsert per channel; preserve views/messages by not overwriting when absent
      const rows = (data as any[]).map(c => ({
        listing_id: id, channel: c.channel, status: c.status ?? 'pending',
        boost_days: c.boost_days ?? 0, external_url: c.external_url ?? null,
      }));
      const { error } = await supabase.from('bop_listing_channels')
        .upsert(rows, { onConflict: 'listing_id,channel' });
      if (error) throw error;
    }
    else {
      return NextResponse.json({ error: `unknown section: ${section}` }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }

  // return fresh des_score (triggers recompute on media/docs/pricing/specs changes)
  const { data: fresh } = await supabase.from('bop_listings').select('des_score, updated_at').eq('id', id).single();
  return NextResponse.json({ ok: true, des_score: fresh?.des_score ?? null });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { error } = await supabase.from('bop_listings').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
