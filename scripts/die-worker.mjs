import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Self-load .env.local so worker runs correctly under PM2
const __dir = dirname(fileURLToPath(import.meta.url));
try {
  const raw = readFileSync(resolve(__dir, '../.env.local'), 'utf8');
  for (const line of raw.split('\n')) {
    const i = line.indexOf('=');
    if (i < 1) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (k && !process.env[k]) process.env[k] = v;
  }
} catch { /* .env.local not found — rely on injected env */ }

// DES Integration Engine — PM2 polling worker
// Claims int_messages rows with FOR UPDATE SKIP LOCKED, executes flows, writes int_runs.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const POLL_MS      = 5000;
const WORKER_ID    = `die-worker-${process.pid}`;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[DIE] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);
console.log(`[DIE] Worker started: ${WORKER_ID}`);

// ── RDW connector (inline — worker is standalone ESM, cannot import TS) ──────
function normalizePlate(input) {
  return input.toUpperCase().replace(/[\s-]/g, '');
}

function rdwDate(v) {
  if (!v || !/^\d{8}$/.test(v)) return null;
  return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
}

function suggestType(v) {
  const inrichting = String(v?.inrichting ?? '').toLowerCase();
  const soort      = String(v?.voertuigsoort ?? '').toLowerCase();
  const gvw        = Number(v?.toegestane_maximum_massa_voertuig ?? 0);
  if (inrichting.includes('kampeer'))                                          return 'camper';
  if (inrichting.includes('opleggertrekker') || inrichting.includes('trekker')) return 'commercial_truck';
  if (soort === 'bedrijfsauto' && gvw > 0 && gvw <= 3500)                    return 'van';
  if (soort === 'bedrijfsauto' && gvw > 3500)                                return 'truck';
  if (soort === 'personenauto')                                               return 'car';
  if (soort === 'aanhangwagen' && inrichting.includes('caravan'))             return 'caravan';
  return null;
}

async function rdwLookup(plate, appToken) {
  const normalized = normalizePlate(plate);
  if (!/^[A-Z0-9]{5,8}$/.test(normalized)) return null;
  const headers = appToken ? { 'X-App-Token': appToken } : {};
  const base = 'https://opendata.rdw.nl/resource';
  const [vRes, fRes] = await Promise.all([
    fetch(`${base}/m9d7-ebf2.json?kenteken=${normalized}`, { headers, signal: AbortSignal.timeout(6000) }),
    fetch(`${base}/8ys7-d773.json?kenteken=${normalized}`, { headers, signal: AbortSignal.timeout(6000) }).catch(() => null),
  ]);
  const vehicles = vRes.ok ? await vRes.json() : [];
  const fuels    = fRes?.ok ? await fRes.json() : [];
  const v = vehicles[0];
  if (!v) return null;
  const f = fuels[0];
  const yearRaw = v.datum_eerste_toelating ? Number(String(v.datum_eerste_toelating).slice(0, 4)) : null;
  return {
    plate:                   normalized,
    make:                    v.merk ?? null,
    model:                   v.handelsbenaming ?? null,
    description:             [v.voertuigsoort, v.inrichting].filter(Boolean).join(' · ') || null,
    year:                    Number.isFinite(yearRaw) ? yearRaw : null,
    apk_expiry:              rdwDate(v.vervaldatum_apk),
    gvw_kg:                  v.toegestane_maximum_massa_voertuig ? Number(v.toegestane_maximum_massa_voertuig) : null,
    color:                   v.eerste_kleur && v.eerste_kleur !== 'N.v.t.' ? v.eerste_kleur : null,
    fuel:                    f?.brandstof_omschrijving ?? null,
    vehicle_type_suggestion: suggestType(v),
    raw:                     { vehicle: v, fuel: f ?? null },
  };
}

// ── Flow dispatcher ───────────────────────────────────────────────────────────
async function dispatch(flowKey, sys, payload) {
  if (flowKey === 'rdw.lookup') {
    const plate = payload.plate ?? payload.entity_id;
    if (!plate) throw new Error('payload.plate required');
    return rdwLookup(plate, sys?.config?.app_token);
  }
  // ── Outbound: Marktplaats ────────────────────────────────────────────────
  if (flowKey === 'marktplaats.publish' || flowKey === 'marktplaats.update' || flowKey === 'marktplaats.delete') {
    const clientId     = process.env.MARKTPLAATS_CLIENT_ID     ?? sys?.config?.client_id;
    const clientSecret = process.env.MARKTPLAATS_CLIENT_SECRET ?? sys?.config?.client_secret;
    if (!clientId || !clientSecret) throw new Error('Marktplaats credentials not configured (MARKTPLAATS_CLIENT_ID / MARKTPLAATS_CLIENT_SECRET)');
    const tokenRes = await fetch('https://api.marktplaats.nl/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
      signal: AbortSignal.timeout(15000),
    });
    if (!tokenRes.ok) throw new Error('Marktplaats auth failed: ' + tokenRes.status + ' ' + await tokenRes.text());
    const { access_token: mpToken } = await tokenRes.json();
    const mpBase = 'https://api.marktplaats.nl/v1';
    const mpH = { Authorization: 'Bearer ' + mpToken, 'Content-Type': 'application/json' };
    if (flowKey === 'marktplaats.publish') {
      const body = {
        title: payload.title, description: payload.description,
        category: { id: Number(payload.category_id ?? 91) },
        price: payload.price_cents != null ? { type: payload.price_type ?? 'FIXED', amount: payload.price_cents } : { type: 'ON_REQUEST' },
        location: { countryCode: 'nl', postalCode: payload.postcode || '0000AA' },
        images: (payload.image_urls ?? []).map(u => ({ url: u })),
        attributes: payload.attributes ?? [],
      };
      const res = await fetch(mpBase + '/listings', { method: 'POST', headers: mpH, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error('Marktplaats create failed: ' + res.status + ' ' + await res.text());
      const j = await res.json();
      return { listingId: j.id ?? j.listingId, url: j._links?.self?.href ?? j.url };
    }
    if (flowKey === 'marktplaats.update') {
      const patch = {};
      if (payload.title)        patch.title = payload.title;
      if (payload.price_cents != null) patch.price = { type: 'FIXED', amount: payload.price_cents };
      const res = await fetch(mpBase + '/listings/' + payload.external_id, { method: 'PATCH', headers: mpH, body: JSON.stringify(patch), signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error('Marktplaats update failed: ' + res.status);
      return { ok: true };
    }
    if (flowKey === 'marktplaats.delete') {
      const res = await fetch(mpBase + '/listings/' + payload.external_id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + mpToken }, signal: AbortSignal.timeout(15000) });
      if (!res.ok && res.status !== 404) throw new Error('Marktplaats delete failed: ' + res.status);
      return { ok: true };
    }
  }

  // ── Outbound: AutoScout24 ─────────────────────────────────────────────────
  if (flowKey === 'autoscout24.publish' || flowKey === 'autoscout24.update' || flowKey === 'autoscout24.delete') {
    const clientId     = process.env.AUTOSCOUT24_CLIENT_ID     ?? sys?.config?.client_id;
    const clientSecret = process.env.AUTOSCOUT24_CLIENT_SECRET ?? sys?.config?.client_secret;
    const dealerId     = process.env.AUTOSCOUT24_DEALER_ID     ?? sys?.config?.dealer_id;
    if (!clientId || !clientSecret || !dealerId)
      throw new Error('AutoScout24 credentials not configured (AUTOSCOUT24_CLIENT_ID / AUTOSCOUT24_CLIENT_SECRET / AUTOSCOUT24_DEALER_ID)');
    const as24TokenRes = await fetch('https://api.autoscout24.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret, scope: 'classified-api' }),
      signal: AbortSignal.timeout(15000),
    });
    if (!as24TokenRes.ok) throw new Error('AutoScout24 auth failed: ' + as24TokenRes.status + ' ' + await as24TokenRes.text());
    const { access_token: as24Token } = await as24TokenRes.json();
    const as24Base = 'https://classified-api.autoscout24.com';
    const as24H = { Authorization: 'Bearer ' + as24Token, 'X-AS24-dealer-id': dealerId, 'Content-Type': 'application/json' };
    if (flowKey === 'autoscout24.publish') {
      const vehicle = { make: payload.make, model: payload.model };
      if (payload.year)           vehicle.firstRegistration = { year: payload.year };
      if (payload.mileage_km)     vehicle.mileage = { value: payload.mileage_km, unit: 'km' };
      if (payload.fuel_code)      vehicle.fuel = payload.fuel_code;
      if (payload.body_type_code) vehicle.bodyType = payload.body_type_code;
      if (payload.power_kw)       vehicle.power = { value: payload.power_kw, unit: 'kW' };
      if (payload.color)          vehicle.colour = payload.color;
      if (payload.vin)            vehicle.vin = payload.vin;
      const body = {
        vehicle,
        prices: payload.price_eur != null ? [{ type: 'SELLING', value: payload.price_eur, currency: 'EUR' }] : [],
        descriptions: [{ languageId: 'NL', text: payload.description_nl || '' }],
        images: (payload.image_urls ?? []).map((url, i) => ({ url, mainImage: i === 0 })),
      };
      const res = await fetch(as24Base + '/classified-ads', { method: 'POST', headers: as24H, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error('AS24 create failed: ' + res.status + ' ' + await res.text());
      const j = await res.json();
      return { listingId: j.id ?? j.classifiedId, url: j.url ?? ('https://www.autoscout24.nl/lst/' + j.id) };
    }
    if (flowKey === 'autoscout24.update') {
      const patch = {};
      if (payload.price_eur != null) patch.prices = [{ type: 'SELLING', value: payload.price_eur, currency: 'EUR' }];
      if (payload.description_nl)    patch.descriptions = [{ languageId: 'NL', text: payload.description_nl }];
      const res = await fetch(as24Base + '/classified-ads/' + payload.external_id, { method: 'PATCH', headers: as24H, body: JSON.stringify(patch), signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error('AS24 update failed: ' + res.status);
      return { ok: true };
    }
    if (flowKey === 'autoscout24.delete') {
      const res = await fetch(as24Base + '/classified-ads/' + payload.external_id, { method: 'DELETE', headers: as24H, signal: AbortSignal.timeout(15000) });
      if (!res.ok && res.status !== 404) throw new Error('AS24 delete failed: ' + res.status);
      return { ok: true };
    }
  }

  // ── Inbound: webhook event (acknowledge + log via int_runs) ───────────────
  if (flowKey.endsWith('.webhook_event')) {
    return { acknowledged: true, event_type: payload.type ?? payload.event ?? 'unknown', entity_id: payload.entity_id ?? payload.id ?? null };
  }

  throw new Error(`No connector for flow: ${flowKey}`);
}

// ── Main poll tick ────────────────────────────────────────────────────────────
async function tick() {
  const { data: msgs, error } = await sb
    .from('int_messages')
    .select('*, int_flows(*, int_systems(*))')
    .eq('status', 'pending')
    .lte('next_attempt_at', new Date().toISOString())
    .order('priority')
    .order('next_attempt_at')
    .limit(1);

  if (error) { console.error('[DIE] poll error:', error.message); return; }
  if (!msgs || msgs.length === 0) return;

  const msg  = msgs[0];
  const flow = msg.int_flows;
  const sys  = flow?.int_systems;

  // Optimistic claim — another worker may beat us
  const { error: claimErr } = await sb
    .from('int_messages')
    .update({ status: 'claimed', claimed_by: WORKER_ID, claimed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', msg.id)
    .eq('status', 'pending');
  if (claimErr) return;

  const t0 = Date.now();
  let result = null;
  let runStatus = 'ok';
  let errorMsg = null;

  try {
    result = await dispatch(flow?.flow_key, sys, msg.payload ?? {});
  } catch (e) {
    runStatus = 'error';
    errorMsg  = e?.message ?? String(e);
    console.error(`[DIE] ${flow?.flow_key} failed:`, errorMsg);
  }

  const ms       = Date.now() - t0;
  const attempts = (msg.attempts ?? 0) + 1;
  const dead     = runStatus === 'error' && attempts >= (msg.max_attempts ?? 3);

  await sb.from('int_runs').insert({
    message_id:       msg.id,
    flow_id:          flow?.id ?? null,
    system_id:        sys?.id ?? null,
    entity_type:      msg.entity_type ?? null,
    entity_id:        msg.entity_id ?? msg.payload?.plate ?? null,
    external_id:      result?.plate ?? null,
    status:           runStatus,
    trigger:          'queue',
    triggered_by:     WORKER_ID,
    request_payload:  msg.payload,
    response_payload: result,
    error_message:    errorMsg,
    response_ms:      ms,
  });

  const nextStatus  = runStatus === 'ok' ? 'done' : (dead ? 'dead' : 'pending');
  const nextAttempt = runStatus === 'error' && !dead
    ? new Date(Date.now() + Math.pow(2, attempts) * 30_000).toISOString()
    : new Date().toISOString();

  await sb.from('int_messages').update({
    status:          nextStatus,
    attempts,
    result:          result ?? null,
    next_attempt_at: nextAttempt,
    claimed_by:      null,
    claimed_at:      null,
    updated_at:      new Date().toISOString(),
  }).eq('id', msg.id);

  console.log(`[DIE] ${flow?.flow_key} -> ${runStatus} in ${ms}ms (msg ${msg.id.slice(0, 8)})`);
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGINT',  () => { console.log('[DIE] stopping'); process.exit(0); });
process.on('SIGTERM', () => { console.log('[DIE] stopping'); process.exit(0); });

setInterval(async () => {
  try { await tick(); } catch (e) { console.error('[DIE] tick threw:', e); }
}, POLL_MS);

tick(); // immediate first tick

// ── Phase 10: Cron scheduler ─────────────────────────────────────────────────

function matchCronField(field, value) {
  if (field === '*') return true;
  if (field.startsWith('*/')) return value % parseInt(field.slice(2), 10) === 0;
  if (field.includes(',')) return field.split(',').some(f => matchCronField(f.trim(), value));
  if (field.includes('-')) {
    const [lo, hi] = field.split('-').map(Number);
    return value >= lo && value <= hi;
  }
  return parseInt(field, 10) === value;
}

function cronMatches(expr, now) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [min, hour, dom, mon, dow] = parts;
  return matchCronField(min, now.getMinutes()) &&
         matchCronField(hour, now.getHours()) &&
         matchCronField(dom, now.getDate()) &&
         matchCronField(mon, now.getMonth() + 1) &&
         matchCronField(dow, now.getDay());
}

async function runScheduler() {
  try {
    const now = new Date();
    const { data: flows, error } = await sb
      .from('int_flows')
      .select('id, flow_key, system_id, schedule_cron, last_scheduled_at, entity_type')
      .eq('active', true)
      .not('schedule_cron', 'is', null);
    if (error || !flows?.length) return;

    for (const flow of flows) {
      if (!cronMatches(flow.schedule_cron, now)) continue;
      if (flow.last_scheduled_at) {
        const lastMin = new Date(flow.last_scheduled_at); lastMin.setSeconds(0, 0);
        const thisMin = new Date(now); thisMin.setSeconds(0, 0);
        if (lastMin.getTime() === thisMin.getTime()) continue;
      }
      const { error: insErr } = await sb.from('int_messages').insert({
        flow_id: flow.id, system_id: flow.system_id,
        message_type: 'scheduled', entity_type: flow.entity_type ?? null, entity_id: null,
        priority: 5, status: 'pending', max_attempts: 3,
        next_attempt_at: now.toISOString(),
        payload: { scheduled: true, flow_key: flow.flow_key, triggered_at: now.toISOString() },
      });
      if (!insErr) {
        await sb.from('int_flows').update({ last_scheduled_at: now.toISOString() }).eq('id', flow.id);
        console.log('[DIE scheduler] Enqueued', flow.flow_key);
      }
    }
  } catch (e) {
    console.error('[DIE scheduler] Error:', e?.message ?? e);
  }
}

runScheduler();
setInterval(runScheduler, 60_000);
