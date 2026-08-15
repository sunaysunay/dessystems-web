'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ScreenHeader } from '@/components/ScreenBadge';
import { BopSelect } from '@/components/BopSelect';
import EmailComposer from '@/components/EmailComposer';

// ── spec field schemas (must match bop_listing_specs_* columns) ─────────────
type F = { k: string; label: string; type: 'num' | 'text' | 'bool' | 'date' };
const SPEC_FIELDS: Record<string, F[]> = {
  car: [
    // identity & registration
    { k:'license_plate',label:'License plate',type:'text' },{ k:'first_registration',label:'First registration',type:'date' },
    { k:'trim',label:'Trim / version',type:'text' },{ k:'vin',label:'VIN',type:'text' },
    { k:'color',label:'Color',type:'text' },{ k:'upholstery',label:'Upholstery',type:'text' },
    { k:'mileage',label:'Mileage (km)',type:'num' },{ k:'nap_verified',label:'NAP verified',type:'bool' },
    { k:'apk_date',label:'APK date',type:'date' },{ k:'rdw_ok',label:'RDW OK',type:'bool' },
    // engine / drivetrain
    { k:'fuel',label:'Fuel',type:'text' },{ k:'transmission',label:'Transmission',type:'text' },
    { k:'gears',label:'Gears',type:'num' },{ k:'power_kw',label:'Power (kW)',type:'num' },
    { k:'power_hp',label:'Power (hp)',type:'num' },{ k:'torque_nm',label:'Torque (Nm)',type:'num' },
    { k:'cylinders',label:'Cylinders',type:'num' },{ k:'displacement_cc',label:'Displacement (cc)',type:'num' },
    { k:'turbo',label:'Turbo',type:'bool' },{ k:'drivetrain',label:'Drivetrain (FWD/RWD/AWD)',type:'text' },
    { k:'euro_norm',label:'Euro norm',type:'text' },{ k:'energy_label',label:'Energy label (A–G)',type:'text' },
    { k:'co2_gkm',label:'CO₂ (g/km)',type:'num' },{ k:'consumption_combined',label:'Consumption (l/100km)',type:'num' },
    { k:'tank_capacity_l',label:'Tank capacity (L)',type:'num' },{ k:'top_speed_kmh',label:'Top speed (km/h)',type:'num' },
    { k:'acceleration_0100',label:'0–100 km/h (s)',type:'num' },
    // body / dimensions
    { k:'doors',label:'Doors',type:'num' },{ k:'seats',label:'Seats',type:'num' },
    { k:'kerb_weight_kg',label:'Kerb weight (kg)',type:'num' },{ k:'length_mm',label:'Length (mm)',type:'num' },
    { k:'width_mm',label:'Width (mm)',type:'num' },{ k:'height_mm',label:'Height (mm)',type:'num' },
    { k:'wheelbase_mm',label:'Wheelbase (mm)',type:'num' },{ k:'wheel_size_inch',label:'Wheel size (inch)',type:'num' },
    { k:'tyre_size_front',label:'Tyre size front',type:'text' },{ k:'tyre_size_rear',label:'Tyre size rear',type:'text' },
    { k:'towing_braked_kg',label:'Towing braked (kg)',type:'num' },{ k:'towing_unbraked_kg',label:'Towing unbraked (kg)',type:'num' },
  ],
  van: [
    { k:'license_plate',label:'License plate',type:'text' },{ k:'first_registration',label:'First registration',type:'date' },
    { k:'trim',label:'Trim / version',type:'text' },{ k:'color',label:'Color',type:'text' },
    { k:'upholstery',label:'Upholstery',type:'text' },
    { k:'mileage',label:'Mileage (km)',type:'num' },{ k:'fuel',label:'Fuel',type:'text' },
    { k:'transmission',label:'Transmission',type:'text' },{ k:'power_hp',label:'Power (hp)',type:'num' },
    { k:'euro_norm',label:'Euro norm',type:'text' },{ k:'vin',label:'VIN',type:'text' },
    { k:'roof_height',label:'Roof height',type:'text' },{ k:'cargo_vol_m3',label:'Cargo vol (m³)',type:'num' },
    { k:'payload_kg',label:'Payload (kg)',type:'num' },{ k:'kerb_weight_kg',label:'Kerb weight (kg)',type:'num' },
    { k:'length_mm',label:'Length (mm)',type:'num' },{ k:'width_mm',label:'Width (mm)',type:'num' },
    { k:'height_mm',label:'Height (mm)',type:'num' },{ k:'wheelbase_mm',label:'Wheelbase (mm)',type:'num' },
    { k:'towing_braked_kg',label:'Towing braked (kg)',type:'num' },{ k:'towing_unbraked_kg',label:'Towing unbraked (kg)',type:'num' },
    { k:'doors',label:'Doors',type:'num' },{ k:'seats',label:'Seats',type:'num' },
    { k:'apk_date',label:'APK date',type:'date' },{ k:'rdw_ok',label:'RDW OK',type:'bool' },
  ],
  truck: [
    { k:'mileage',label:'Mileage (km)',type:'num' },{ k:'axles',label:'Axles',type:'num' },
    { k:'gvw_kg',label:'GVW (kg)',type:'num' },{ k:'payload_kg',label:'Payload (kg)',type:'num' },
    { k:'wheelbase_mm',label:'Wheelbase (mm)',type:'num' },{ k:'cabin_type',label:'Cabin type',type:'text' },
    { k:'power_hp',label:'Power (hp)',type:'num' },{ k:'euro_norm',label:'Euro norm',type:'text' },
    { k:'fuel',label:'Fuel',type:'text' },{ k:'tail_lift',label:'Tail lift',type:'bool' },
    { k:'crane',label:'Crane',type:'bool' },{ k:'retarder',label:'Retarder',type:'bool' },
    { k:'tachograph',label:'Tachograph',type:'text' },{ k:'hydraulics',label:'Hydraulics',type:'bool' },
  ],
  trailer: [
    { k:'trailer_type',label:'Trailer type',type:'text' },{ k:'axles',label:'Axles',type:'num' },
    { k:'payload_kg',label:'Payload (kg)',type:'num' },{ k:'length_mm',label:'Length (mm)',type:'num' },
    { k:'width_mm',label:'Width (mm)',type:'num' },{ k:'vol_m3',label:'Volume (m³)',type:'num' },
    { k:'refrigeration',label:'Refrigeration',type:'bool' },{ k:'temp_range',label:'Temp range',type:'text' },
    { k:'lift_axle',label:'Lift axle',type:'bool' },{ k:'adr',label:'ADR',type:'bool' },
    { k:'fifth_wheel',label:'Fifth wheel',type:'bool' },{ k:'loading_type',label:'Loading type',type:'text' },
  ],
  machinery: [
    { k:'machine_type',label:'Machine type',type:'text' },{ k:'op_hours',label:'Operating hours',type:'num' },
    { k:'op_weight_kg',label:'Operating weight (kg)',type:'num' },{ k:'power_kw',label:'Power (kW)',type:'num' },
    { k:'lift_cap_kg',label:'Lift capacity (kg)',type:'num' },{ k:'boom_reach_m',label:'Boom reach (m)',type:'num' },
    { k:'track_type',label:'Track type',type:'text' },{ k:'fuel_type',label:'Fuel type',type:'text' },
    { k:'ce_marking',label:'CE marking',type:'bool' },{ k:'inspection_date',label:'Inspection date',type:'date' },
  ],
  camper: [
    { k:'beds',label:'Beds',type:'num' },{ k:'sleeping_cap',label:'Sleeping capacity',type:'num' },
    { k:'layout_type',label:'Layout type',type:'text' },{ k:'shower',label:'Shower',type:'bool' },
    { k:'toilet',label:'Toilet',type:'bool' },{ k:'solar',label:'Solar',type:'bool' },
    { k:'heating',label:'Heating',type:'text' },{ k:'length_mm',label:'Length (mm)',type:'num' },
    { k:'width_mm',label:'Width (mm)',type:'num' },{ k:'height_mm',label:'Height (mm)',type:'num' },
    { k:'gvw_kg',label:'GVW (kg)',type:'num' },{ k:'chassis_brand',label:'Chassis brand',type:'text' },
    { k:'water_tank_l',label:'Water tank (L)',type:'num' },
  ],
};
const SPEC_CAT: Record<string,string> = { construction:'machinery', caravan:'camper', bus:'van' };
function specFor(cat: string) { return SPEC_FIELDS[SPEC_CAT[cat] ?? cat] ?? SPEC_FIELDS.van; }

const SALE_METHODS = ['fixed','auction','buy_now_bid','tender','lease'];
const STATUSES = ['draft','review','approved','active','reserved','sold','archived'];
const CONDITIONS = ['new','used','damaged','parts'];
const VAT_SCHEMES = ['standard','margin','export','eu_exempt'];
// European countries (ISO 3166-1 alpha-2), ordered by geographic proximity to NL
const COUNTRIES = [
  { code: 'NL', label: 'Netherlands' }, { code: 'BE', label: 'Belgium' }, { code: 'DE', label: 'Germany' },
  { code: 'LU', label: 'Luxembourg' }, { code: 'GB', label: 'United Kingdom' }, { code: 'FR', label: 'France' },
  { code: 'DK', label: 'Denmark' }, { code: 'CH', label: 'Switzerland' }, { code: 'AT', label: 'Austria' },
  { code: 'CZ', label: 'Czech Republic' }, { code: 'IE', label: 'Ireland' }, { code: 'PL', label: 'Poland' },
  { code: 'SE', label: 'Sweden' }, { code: 'NO', label: 'Norway' }, { code: 'IT', label: 'Italy' },
  { code: 'SI', label: 'Slovenia' }, { code: 'SK', label: 'Slovakia' }, { code: 'HU', label: 'Hungary' },
  { code: 'HR', label: 'Croatia' }, { code: 'ES', label: 'Spain' }, { code: 'PT', label: 'Portugal' },
  { code: 'FI', label: 'Finland' }, { code: 'EE', label: 'Estonia' }, { code: 'LV', label: 'Latvia' },
  { code: 'LT', label: 'Lithuania' }, { code: 'RO', label: 'Romania' }, { code: 'BG', label: 'Bulgaria' },
  { code: 'RS', label: 'Serbia' }, { code: 'BA', label: 'Bosnia and Herzegovina' }, { code: 'GR', label: 'Greece' },
  { code: 'TR', label: 'Turkey' }, { code: 'UA', label: 'Ukraine' },
];
const CURRENCIES = [
  { code: 'EUR', label: 'Euro' }, { code: 'GBP', label: 'British Pound' }, { code: 'USD', label: 'US Dollar' },
  { code: 'CHF', label: 'Swiss Franc' }, { code: 'TRY', label: 'Turkish Lira' }, { code: 'SEK', label: 'Swedish Krona' },
  { code: 'NOK', label: 'Norwegian Krone' }, { code: 'DKK', label: 'Danish Krone' }, { code: 'PLN', label: 'Polish Zloty' },
  { code: 'CZK', label: 'Czech Koruna' }, { code: 'HUF', label: 'Hungarian Forint' }, { code: 'RON', label: 'Romanian Leu' },
];
const CHANNELS = ['des','mobile_de','marktplaats','2dehands','kleinanzeigen','truckscout24','autoline','autoscout24'];
const DOC_TYPES = ['inspection','registration','apk','rdw','coc','invoice','manual','cert'];
const TRUST_KEYS = ['verified','service_history','export_ready','finance','warranty','delivery','video','tour_360','inspection_report','vat_deductible'];
// gallery photo classification (mobile.de/CarGurus style) — vehicle + camper sets
const MEDIA_CATEGORIES = ['exterior','interior','cockpit','seats','engine','tyres','odometer','damage','documents','accessories','kitchen','bathroom','bed','dinette','garage','solar','roof','awning','heating'];

const TRANSPORT_OPTIONS = ['flatbed','driven','shipped','container','tow'];
const TABS = ['Core','Pricing','Specs','Features','Media','Content','Documents','Trust','Delivery','Channels'] as const;
type Tab = typeof TABS[number];
const SECTION_MAP: Record<Tab, string> = { Core:'core', Pricing:'pricing', Specs:'specs', Features:'features', Media:'media', Content:'content', Documents:'docs', Trust:'attrs', Delivery:'delivery', Channels:'channels' };

function scoreColor(s: number) {
  if (s >= 80) return 'text-emerald-600'; if (s >= 50) return 'text-amber-600'; return 'text-red-500';
}
const lbl = 'mb-1 block text-xs font-semibold text-slate-500';
const inp = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500';
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function MP003Editor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('Core');
  const [L, setL] = useState<any>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [bodyTypes, setBodyTypes] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [toast, setToast] = useState('');
  const [score, setScore] = useState(0);
  const [origCat, setOrigCat] = useState('');       // category as persisted in DB
  const [confirmCat, setConfirmCat] = useState(false);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [matchedLayout, setMatchedLayout] = useState<{ id: number; name: string; category: string; body_type_code: number | null } | null>(null);
  function markDirty(section: string) { setDirty(p => { const s = new Set(p); s.add(section); return s; }); }

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  // Channels tab: push listing to an external marketplace channel immediately.
  async function publishChannel(channel: string) {
    const j = await fetch('/api/bop/int/publish', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: id, channel, action: 'publish' }),
    }).then(r => r.json()).catch(() => ({ error: 'network error' }));
    if (j.error) { showToast('✗ ' + j.error); return; }
    showToast('✓ Queued for ' + channel);
  }

  // ── Object Lock Service (OLS): SAP-style exclusive lock on this listing ────
  // Acquire on open; heartbeat every 60s (4-min lease); release on close/unmount
  // (sendBeacon as best-effort on tab close); Realtime flips the banner live.
  const sessionRef = useRef<string>('');
  if (!sessionRef.current && typeof crypto !== 'undefined') sessionRef.current = crypto.randomUUID();
  const [heldLock, setHeldLock] = useState<any>(null);   // lock row when held by someone else
  const [lockMine, setLockMine] = useState(false);
  const userRef = useRef('unknown');
  const readOnly = !lockMine;

  useEffect(() => {
    if (!id) return;
    let hb: ReturnType<typeof setInterval> | null = null;
    let channel: any = null;
    const session = sessionRef.current;

    async function acquire() {
      const { data } = (await supabase?.auth.getUser()) ?? { data: null };
      userRef.current = data?.user?.email ?? 'unknown';
      const res = await fetch('/api/bop/sys/locks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'listing', id, user: userRef.current, session, reason: 'edit' }),
      }).then(r => r.json()).catch(() => ({ acquired: false, lock: null }));
      if (res.acquired) { setLockMine(true); setHeldLock(null); }
      else { setLockMine(false); setHeldLock(res.lock); }
      return res.acquired;
    }

    void acquire().then(ok => {
      if (ok) {
        hb = setInterval(() => {
          fetch('/api/bop/sys/locks', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'listing', id, session }),
          }).catch(() => {});
        }, 60_000);
      }
      // watch the lock row either way: owner sees steals, waiters see release.
      // Channel name MUST be unique per mount: supabase.channel(name) returns the
      // existing instance for a reused name and .on() after subscribe() throws
      // (triggered by React dev-mode double-mount).
      channel = supabase?.channel(`lock-listing-${id}-${session}-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bop_object_locks' }, (payload: any) => {
          const row = (payload.new ?? payload.old) as any;
          if (row?.object_type !== 'listing' || row?.object_id !== String(id)) return;
          if (payload.eventType === 'DELETE') { if (!lockMine) void acquire(); return; }
          if (payload.new?.session_id !== session) { setLockMine(false); setHeldLock(payload.new); }
        })
        .subscribe();
    });

    const release = () => {
      navigator.sendBeacon?.('/api/bop/sys/locks/release-beacon',
        JSON.stringify({ type: 'listing', id, session }));
    };
    window.addEventListener('pagehide', release);

    return () => {
      window.removeEventListener('pagehide', release);
      if (hb) clearInterval(hb);
      if (channel) void supabase?.removeChannel(channel);
      fetch('/api/bop/sys/locks', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'listing', id, session }),
      }).catch(() => {});
    };
    // eslint-disable-next-line
  }, [id]);

  // Model list is brand-scoped — refetch whenever the selected brand changes.
  useEffect(() => {
    if (!L?.brand_id) { setModels([]); return; }
    void fetch(`/api/bop/mkp/bop-listings/meta?brand_id=${L.brand_id}`).then(r => r.json()).then(meta => setModels(meta.models ?? []));
  }, [L?.brand_id]);

  // Body types are category-scoped — refetch when the (unsaved) category changes
  // so the dropdown never shows another category's opbouw values.
  useEffect(() => {
    if (!L?.category) return;
    void fetch(`/api/bop/mkp/bop-listings/meta?category=${L.category}`).then(r => r.json()).then(meta => setBodyTypes(meta.body_types ?? []));
    void fetchLayout(L.category, L.body_type_code);
  }, [L?.category, L?.body_type_code]);

  async function fetchLayout(cat: string, bodyCode: number | null) {
    const res = await fetch(`/api/bop/mkp/listing-layouts?tenant_id=300&category=${cat}`);
    const j = await res.json();
    const rows = j.layouts ?? [];
    const exact = bodyCode ? rows.find((r: any) => r.body_type_code === bodyCode) : null;
    const fallback = rows.find((r: any) => r.body_type_code === null);
    const match = exact ?? fallback ?? null;
    setMatchedLayout(match ? { id: match.id, name: match.name, category: match.category, body_type_code: match.body_type_code } : null);
  }

  // silent=true is used for background refreshes (e.g. after a media upload) — it must
  // NOT flip the page to the full "Loading…" placeholder, which would unmount MediaTab
  // (and its in-flight upload state) mid-action. That was the cause of gallery multi-upload
  // appearing to "lock up" — each file's refresh briefly unmounted the uploader.
  async function load(silent = false) {
    if (!silent) setLoading(true);
    let j: any;
    try { j = await fetch(`/api/bop/mkp/bop-listings/${id}`).then(r => r.json()); }
    catch { if (!silent) setLoading(false); return; }
    if (j.error || !j.listing) { if (j.error) showToast(j.error); if (!silent) setLoading(false); return; }
    setL(j.listing);
    if (!silent) {
      setOrigCat(j.listing.category);
      setScore(j.listing.des_score ?? 0);
      setLoading(false);
      const meta = await fetch(`/api/bop/mkp/bop-listings/meta?category=${j.listing.category}`).then(r => r.json());
      setCatalog(meta.features ?? []); setBrands(meta.brands ?? []); setBodyTypes(meta.body_types ?? []); setCats(meta.categories ?? []);
      void fetchLayout(j.listing.category, j.listing.body_type_code);
    } else {
      setScore(j.listing.des_score ?? 0);
    }
  }

  // Core save: if the category changed, gate behind a confirm dialog because it
  // switches the spec set and clears category-specific features.
  function tryCoreSave() {
    if (L.category !== origCat) { setConfirmCat(true); return; }
    void save('core', L);
  }
  async function confirmCoreSave() {
    setConfirmCat(false);
    await save('core', L);
    await load();               // reloads specs table + feature catalog for the new category
    setTab('Specs');            // land on the now-relevant spec form
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- load is not useCallback-memoized; id is the real trigger
  useEffect(() => { void load(); }, [id]);

  async function save(section: string, data: any, silent = false): Promise<boolean> {
    if (readOnly) { showToast(`✗ Read-only — locked by ${heldLock?.locked_by ?? 'another session'}`); return false; }
    setSaving(section);
    const j = await fetch(`/api/bop/mkp/bop-listings/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-lock-session': sessionRef.current },
      body: JSON.stringify({ section, data }),
    }).then(r => r.json());
    setSaving('');
    if (j.error) { showToast('✗ ' + j.error); return false; }
    if (j.des_score !== null) setScore(j.des_score);
    if (!silent) showToast('✓ Saved');
    setDirty(p => { const s = new Set(p); s.delete(section); return s; });
    return true;
  }

  async function saveAll() {
    if (readOnly) { showToast(`✗ Read-only — locked by ${heldLock?.locked_by ?? 'another session'}`); return; }
    if (dirty.size === 0) { showToast('Nothing to save'); return; }
    setSavingAll(true);
    const ORDER = ['core','pricing','specs','features','content','docs','attrs','delivery','channels'];
    const toSave = ORDER.filter(s => dirty.has(s));
    let failed = 0;
    for (const section of toSave) {
      let data: any;
      if (section === 'core') data = L;
      else if (section === 'pricing') data = L.pricing;
      else if (section === 'specs') { const sf = specFor(origCat || L.category) ?? []; data = Object.fromEntries(sf.map((f: F) => [f.k, L.spec[f.k] ?? null])); }
      else if (section === 'features') data = L.feature_ids;
      else if (section === 'content') data = L.content;
      else if (section === 'docs') data = L.docs;
      else if (section === 'attrs') data = L.attrs;
      else if (section === 'delivery') data = L.delivery;
      else if (section === 'channels') data = L.channels;
      else continue;
      const ok = await save(section, data, true);
      if (!ok) failed++;
    }
    setSavingAll(false);
    if (failed > 0) showToast(`✗ ${failed} section${failed !== 1 ? 's' : ''} failed to save`);
    else showToast(`✓ All saved · ${toSave.length} section${toSave.length !== 1 ? 's' : ''}`);
  }

  // local field setters
  function setCore(k: string, v: any) { setL((p: any) => ({ ...p, [k]: v })); markDirty('core'); }
  function setPricing(k: string, v: any) { setL((p: any) => ({ ...p, pricing: { ...p.pricing, [k]: v } })); markDirty('pricing'); }
  function setSpec(k: string, v: any) { setL((p: any) => ({ ...p, spec: { ...p.spec, [k]: v } })); markDirty('specs'); }
  function setDelivery(k: string, v: any) { setL((p: any) => ({ ...p, delivery: { ...p.delivery, [k]: v } })); markDirty('delivery'); }

  if (loading) return <div className="p-6 text-slate-400">Loading…</div>;
  if (!L) return (
    <div className="p-6">
      <p className="text-sm text-slate-500">Listing not found — it may have been deleted, or this page was opened without a valid listing.</p>
      <button onClick={() => router.push('/console/mkp/listings')} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Go to Listing Manager</button>
    </div>
  );

  // schema by PERSISTED category (origCat) — the server writes specs into the
  // persisted category's table, so an unsaved category change must not switch
  // the form (that produced "column not found" saves). Category changes go
  // through the confirm+save flow which reloads origCat first.
  const specFields = specFor(origCat || L.category) ?? [];
  const title = (L.content.find((c: any) => c.locale === 'nl') ?? L.content[0])?.title;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <button onClick={() => router.push('/console/mkp/listings')} className="mb-2 text-sm text-blue-600 hover:underline">← Listings</button>
          <ScreenHeader title={title || `${L.brand_id ? '' : ''}${L.category} listing`} description={L.ref_no || L.id} />
        </div>
        <div className="flex items-center gap-4">
          {dirty.size > 0 && (
            <button onClick={() => void saveAll()} disabled={savingAll || readOnly}
              className="rounded-full bg-emerald-600 px-4 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50">
              {savingAll ? 'Saving…' : `Save all${dirty.size > 1 ? ` (${dirty.size})` : ''}`}
            </button>
          )}
          <button onClick={() => setShowComposer(true)}
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
            ✉ Email about this listing
          </button>
          <div className="text-center">
            <div className={`text-3xl font-bold ${scoreColor(score)}`}>{score}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">DES Score</div>
          </div>
        </div>
      </div>

      {/* OLS lock banner — SAP-style: green when you own the lock, red read-only when someone else does */}
      {readOnly ? (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
          <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-500" />
          {heldLock ? (
            <span className="text-red-700">
              <b>Read-only</b> — locked by <b>{heldLock.locked_by}</b>
              {heldLock.reason && heldLock.reason !== 'edit' && <> ({heldLock.reason})</>}
              , editing since {new Date(heldLock.acquired_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}.
              The screen unlocks automatically when they finish.
            </span>
          ) : (
            <span className="text-red-700">Acquiring edit lock…</span>
          )}
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-2 text-xs text-emerald-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Locked by you — other sessions see this listing read-only until you leave.
        </div>
      )}

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map(t => {
          const isDirty = dirty.has(SECTION_MAP[t]);
          return (
          <button key={t} onClick={() => setTab(t)}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${tab === t
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-500 hover:text-slate-700'}`}>
            {t}
            {isDirty && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-500" />}
          </button>
          );
        })}
      </div>

      {/* Read-only enforcement: a disabled fieldset kills every native input,
          select and button inside (mouse AND keyboard); pointer-events-none
          covers custom widgets (dropzones, drag-reorder); dimmed for clarity. */}
      <fieldset disabled={readOnly} className={readOnly ? 'pointer-events-none select-none opacity-60' : ''}
        onChange={() => { const s = SECTION_MAP[tab]; if (s && s !== 'media') markDirty(s); }}>

      {/* ── CORE ── */}
      {tab === 'Core' && (
        <Section>
          {L.category !== origCat && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Category will change <b className="capitalize">{origCat}</b> → <b className="capitalize">{L.category}</b>. Saving switches the Specs set and clears Features. You’ll confirm on Save.
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            <div><label className={lbl}>Category</label>
              <BopSelect size="md" value={L.category} onChange={v => { setL((p: any) => ({ ...p, category: v, body_type_code: null })); markDirty('core'); }}
                options={cats.length
                  ? cats.map((c: any) => ({ value: c.slug, label: `${c.code} - ${c.label_en}` }))
                  : ['van','truck','trailer','camper','caravan','bus','machinery','construction','car'].map(c => ({ value:c, label:cap(c) }))} /></div>
            <div><label className={lbl}>Body type</label>
              <BopSelect size="md" value={L.body_type_code ? String(L.body_type_code) : ''} onChange={v => setCore('body_type_code', v ? Number(v) : null)}
                options={[{ value:'', label:'—' }, ...bodyTypes.map(bt => ({ value:String(bt.code), label:`${bt.code} - ${bt.label_en}` }))]} /></div>
            <div><label className={lbl}>Brand</label>
              <BopSelect size="md" value={L.brand_id ? String(L.brand_id) : ''} onChange={v => { setL((p: any) => ({ ...p, brand_id: v ? Number(v) : null, model_id: null })); markDirty('core'); }}
                options={[{ value:'', label:'—' }, ...brands.map(b => ({ value:String(b.id), label:b.name }))]} /></div>
            <div><label className={lbl}>Model</label>
              <BopSelect size="md" value={L.model_id ? String(L.model_id) : ''} onChange={v => setCore('model_id', v ? Number(v) : null)}
                options={[{ value:'', label:'—' }, ...models.map(m => ({ value:String(m.id), label:m.name }))]} /></div>
            <div><label className={lbl}>Year</label>
              <BopSelect size="md" value={L.year ? String(L.year) : ''} onChange={v => setCore('year', v ? Number(v) : null)}
                options={Array.from({ length: new Date().getFullYear() + 1 - 1980 + 1 }, (_, i) => new Date().getFullYear() + 1 - i).map(y => ({ value: String(y), label: String(y) }))} /></div>
            <div><label className={lbl}>Condition</label>
              <BopSelect size="md" value={L.condition} onChange={v => setCore('condition', v)} options={CONDITIONS.map(c => ({ value:c, label:cap(c) }))} /></div>
            <div><label className={lbl}>Sale method</label>
              <BopSelect size="md" value={L.sale_method} onChange={v => setCore('sale_method', v)} options={SALE_METHODS.map(c => ({ value:c, label:cap(c.replace(/_/g, ' ')) }))} /></div>
            <div><label className={lbl}>Status</label>
              <BopSelect size="md" value={L.status} onChange={v => setCore('status', v)} options={STATUSES.map(c => ({ value:c, label:cap(c) }))} /></div>
            <div><label className={lbl}>Country of origin</label>
              <BopSelect size="md" value={L.country_origin ?? ''} onChange={v => setCore('country_origin', v || null)}
                options={[{ value:'', label:'—' }, ...COUNTRIES.map(c => ({ value: c.code, label: `${c.code} - ${c.label}` }))]} /></div>
            <div><label className={lbl}>Ref no</label><input className={`${inp} text-slate-400`} value={L.ref_no ?? '(auto on save)'} readOnly disabled /></div>
            <div className="flex items-end pb-2"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={!!L.is_verified} onChange={e => setCore('is_verified', e.target.checked)} className="h-4 w-4 accent-emerald-600" /> Verified</label></div>
          </div>
          {matchedLayout && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5">
              <span className="text-xs font-semibold text-blue-700">Detail Layout</span>
              <span className="text-xs text-blue-600">{matchedLayout.name}</span>
              <span className="text-[10px] text-blue-400">{matchedLayout.body_type_code ? `body type ${matchedLayout.body_type_code}` : 'category default'}</span>
              <a href="/console/mkp/layout-manager" className="ml-auto text-[11px] font-medium text-blue-600 underline decoration-blue-300 hover:decoration-blue-600">Edit in Layout Manager →</a>
            </div>
          )}
        </Section>
      )}

      {/* ── PRICING ── */}
      {tab === 'Pricing' && (
        <Section>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div><label className={lbl}>Asking price</label><input className={inp} type="number" value={L.pricing.asking_price ?? ''} onChange={e => setPricing('asking_price', e.target.value ? Number(e.target.value) : null)} /></div>
            <div><label className={lbl}>Currency</label>
              <BopSelect size="md" value={L.pricing.currency ?? 'EUR'} onChange={v => setPricing('currency', v)}
                options={CURRENCIES.map(c => ({ value: c.code, label: `${c.code} - ${c.label}` }))} /></div>
            <div><label className={lbl}>VAT scheme</label>
              <BopSelect size="md" value={L.pricing.vat_scheme ?? 'standard'} onChange={v => setPricing('vat_scheme', v)} options={VAT_SCHEMES.map(c => ({ value:c, label:cap(c.replace(/_/g, ' ')) }))} /></div>
            <div><label className={lbl}>VAT rate (%)</label><input className={inp} type="number" value={L.pricing.vat_rate ?? ''} onChange={e => setPricing('vat_rate', e.target.value ? Number(e.target.value) : null)} /></div>
            <div className="flex items-end"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={!!L.pricing.vat_included} onChange={e => setPricing('vat_included', e.target.checked)} className="h-4 w-4 accent-blue-600" /> VAT included</label></div>
            <div><label className={lbl}>Purchase price (internal)</label><input className={inp} type="number" value={L.pricing.purchase_price ?? ''} onChange={e => setPricing('purchase_price', e.target.value ? Number(e.target.value) : null)} /></div>
            {(L.sale_method === 'auction' || L.sale_method === 'buy_now_bid') && <>
              <div><label className={lbl}>Auction start bid</label><input className={inp} type="number" value={L.pricing.auction_start_bid ?? ''} onChange={e => setPricing('auction_start_bid', e.target.value ? Number(e.target.value) : null)} /></div>
              <div><label className={lbl}>Reserve (hidden)</label><input className={inp} type="number" value={L.pricing.auction_reserve ?? ''} onChange={e => setPricing('auction_reserve', e.target.value ? Number(e.target.value) : null)} /></div>
            </>}
            <div className="flex items-end"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={!!L.pricing.finance_available} onChange={e => setPricing('finance_available', e.target.checked)} className="h-4 w-4 accent-blue-600" /> Finance available</label></div>
            <div className="flex items-end"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={!!L.pricing.lease_available} onChange={e => setPricing('lease_available', e.target.checked)} className="h-4 w-4 accent-blue-600" /> Lease available</label></div>
          </div>
        </Section>
      )}

      {/* ── SPECS ── */}
      {tab === 'Specs' && (
        <Section>
          <div className="mb-2 text-xs text-slate-400">Category: <span className="font-semibold capitalize">{L.category}</span> → table <code>{L.spec_table}</code></div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {specFields.map(f => (
              <div key={f.k}>
                <label className={lbl}>{f.label}</label>
                {f.type === 'bool'
                  ? <label className="flex h-9 items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={!!L.spec[f.k]} onChange={e => setSpec(f.k, e.target.checked)} className="h-4 w-4 accent-blue-600" /> Yes</label>
                  : <input className={inp} type={f.type === 'num' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                      value={L.spec[f.k] ?? ''} onChange={e => setSpec(f.k, f.type === 'num' ? (e.target.value ? Number(e.target.value) : null) : e.target.value)} />}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── FEATURES ── */}
      {tab === 'Features' && (
        <Section>
          {catalog.length === 0 ? <p className="text-sm text-slate-400">No feature catalog for this category.</p> :
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {catalog.map(f => {
              const on = L.feature_ids.includes(f.id);
              return (
                <label key={f.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${on ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <input type="checkbox" checked={on} className="h-4 w-4 accent-blue-600"
                    onChange={e => setL((p: any) => ({ ...p, feature_ids: e.target.checked ? [...p.feature_ids, f.id] : p.feature_ids.filter((x: number) => x !== f.id) }))} />
                  {f.label_nl || f.key}
                </label>
              );
            })}
          </div>}
        </Section>
      )}

      {/* ── MEDIA ── */}
      {tab === 'Media' && <MediaTab listingId={id} media={L.media} onRefresh={() => { void load(true); }} showToast={showToast} readOnly={readOnly} />}

      {/* ── CONTENT ── */}
      {tab === 'Content' && (
        <ContentEditor L={L} setL={setL} onDirty={() => markDirty('content')} />
      )}

      {/* ── DOCUMENTS ── */}
      {tab === 'Documents' && (
        <Section>
          <ArrayEditor
            rows={L.docs}
            onChange={(rows: any[]) => { setL((p: any) => ({ ...p, docs: rows })); markDirty('docs'); }}
            newRow={{ doc_type:'inspection', url:'', verified:false, expiry_date:'' }}
            columns={[
              { k:'doc_type', label:'Type', type:'select', opts:DOC_TYPES },
              { k:'url', label:'URL', type:'text', w:'flex-1' },
              { k:'expiry_date', label:'Expiry', type:'date' },
              { k:'verified', label:'Verified', type:'bool' },
            ]} />
        </Section>
      )}

      {/* ── TRUST ── */}
      {tab === 'Trust' && (
        <Section>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {TRUST_KEYS.map(k => {
              const on = L.attrs.some((a: any) => a.attr_key === k);
              return (
                <label key={k} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm capitalize ${on ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <input type="checkbox" checked={on} className="h-4 w-4 accent-emerald-600"
                    onChange={e => setL((p: any) => ({ ...p, attrs: e.target.checked ? [...p.attrs, { attr_key:k, attr_value:'true' }] : p.attrs.filter((a: any) => a.attr_key !== k) }))} />
                  {k.replace(/_/g, ' ')}
                </label>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── DELIVERY ── */}
      {tab === 'Delivery' && (
        <Section>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="flex items-end"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={!!L.delivery?.delivery_available} onChange={e => setDelivery('delivery_available', e.target.checked)} className="h-4 w-4 accent-blue-600" /> Delivery available</label></div>
            <div className="flex items-end"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={!!L.delivery?.delivery_included} onChange={e => setDelivery('delivery_included', e.target.checked)} className="h-4 w-4 accent-blue-600" /> Delivery included in price</label></div>
            <div><label className={lbl}>Delivery price</label><input className={inp} type="number" value={L.delivery?.delivery_price ?? ''} onChange={e => setDelivery('delivery_price', e.target.value ? Number(e.target.value) : null)} /></div>
            <div><label className={lbl}>Currency</label>
              <BopSelect size="md" value={L.delivery?.delivery_currency ?? 'EUR'} onChange={v => setDelivery('delivery_currency', v)}
                options={CURRENCIES.map(c => ({ value: c.code, label: `${c.code} - ${c.label}` }))} /></div>
            <div><label className={lbl}>Delivery radius (km)</label><input className={inp} type="number" value={L.delivery?.delivery_radius_km ?? ''} onChange={e => setDelivery('delivery_radius_km', e.target.value ? Number(e.target.value) : null)} /></div>
            <div><label className={lbl}>Delivery time (days)</label><input className={inp} type="number" value={L.delivery?.delivery_time_days ?? ''} onChange={e => setDelivery('delivery_time_days', e.target.value ? Number(e.target.value) : null)} /></div>
            <div className="flex items-end"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={L.delivery?.pickup_available !== false} onChange={e => setDelivery('pickup_available', e.target.checked)} className="h-4 w-4 accent-blue-600" /> Pickup available</label></div>
            <div className="col-span-2"><label className={lbl}>Pickup location</label><input className={inp} type="text" value={L.delivery?.pickup_location ?? ''} onChange={e => setDelivery('pickup_location', e.target.value || null)} /></div>
            <div className="flex items-end"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={!!L.delivery?.export_ready} onChange={e => setDelivery('export_ready', e.target.checked)} className="h-4 w-4 accent-blue-600" /> Export ready</label></div>
          </div>
          <div className="mt-4">
            <label className={lbl}>Transport options</label>
            <div className="flex flex-wrap gap-2">
              {TRANSPORT_OPTIONS.map(opt => {
                const on = (L.delivery?.transport_options ?? []).includes(opt);
                return (
                  <label key={opt} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm capitalize ${on ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <input type="checkbox" checked={on} className="h-4 w-4 accent-blue-600"
                      onChange={e => {
                        const cur = L.delivery?.transport_options ?? [];
                        setDelivery('transport_options', e.target.checked ? [...cur, opt] : cur.filter((o: string) => o !== opt));
                      }} />
                    {opt.replace(/_/g, ' ')}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="mt-4">
            <label className={lbl}>Delivery notes</label>
            <textarea className={`${inp} min-h-[80px]`} value={L.delivery?.delivery_notes ?? ''} onChange={e => setDelivery('delivery_notes', e.target.value || null)} />
          </div>
        </Section>
      )}

      {/* ── CHANNELS ── */}
      {tab === 'Channels' && (
        <Section>
          <div className="space-y-2">
            {CHANNELS.map(ch => {
              const row = L.channels.find((c: any) => c.channel === ch);
              const on = !!row;
              return (
                <div key={ch} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                  <label className="flex w-40 items-center gap-2 text-sm font-medium capitalize text-slate-700">
                    <input type="checkbox" checked={on} className="h-4 w-4 accent-blue-600"
                      onChange={e => setL((p: any) => ({ ...p, channels: e.target.checked ? [...p.channels, { channel:ch, status:'pending', boost_days:0 }] : p.channels.filter((c: any) => c.channel !== ch) }))} />
                    {ch.replace(/_/g, '.')}
                  </label>
                  {on && <>
                    <div className="w-40"><BopSelect size="sm" value={row.status ?? 'pending'} onChange={v => { setL((p: any) => ({ ...p, channels: p.channels.map((c: any) => c.channel === ch ? { ...c, status:v } : c) })); markDirty('channels'); }}
                      options={['pending','synced','failed','paused'].map(s => ({ value:s, label:s }))} /></div>
                    <input className="w-24 rounded border border-slate-200 px-2 py-1 text-sm" type="number" placeholder="boost" value={row.boost_days ?? 0}
                      onChange={e => setL((p: any) => ({ ...p, channels: p.channels.map((c: any) => c.channel === ch ? { ...c, boost_days:Number(e.target.value) } : c) }))} />
                    {row.views !== null && <span className="text-xs text-slate-400">{row.views} views · {row.messages ?? 0} msg</span>}
                    {ch !== 'des' && (
                      <button
                        onClick={() => { void publishChannel(ch); }}
                        className="ml-auto rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                        disabled={readOnly}
                        title={`Push to ${ch} now`}
                      >Publish →</button>
                    )}
                  </>}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      </fieldset>

      {/* Global action bar — Save calls saveAll() which skips non-dirty sections */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <button onClick={() => router.push('/console/mkp/listings')}
          className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Close
        </button>
        <button
          onClick={() => void saveAll()}
          disabled={savingAll || readOnly}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {savingAll ? 'Saving…' : dirty.size > 0 ? `Save (${dirty.size})` : 'Save'}
        </button>
      </div>

      {/* Category-change confirm */}
      {confirmCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setConfirmCat(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-bold text-slate-900">Change category?</h2>
            <p className="text-sm text-slate-600">
              Switching <b className="capitalize">{origCat}</b> → <b className="capitalize">{L.category}</b> will:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>Use the <b>{L.category}</b> specification set (a new spec row is created)</li>
              <li>Clear the current <b>Features</b> (they are category-specific)</li>
              <li>Previously entered specs for <b className="capitalize">{origCat}</b> are kept but hidden</li>
            </ul>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => { setConfirmCat(false); setCore('category', origCat); }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { void confirmCoreSave(); }}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">Change &amp; save</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}

      {showComposer && (
        <EmailComposer
          contextType="listing" recordId={L.id} tenantId={L.tenant_id}
          onClose={() => setShowComposer(false)}
          onSent={() => { setShowComposer(false); setToast('✓ Email sent'); }}
        />
      )}
    </div>
  );
}

// ── reusable section wrapper ────────────────────────────────────────────────
function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}

// ── generic array-of-rows editor (media, docs) ──────────────────────────────
function ArrayEditor({ rows, onChange, columns, newRow }: any) {
  function upd(i: number, k: string, v: any) { const r = [...rows]; r[i] = { ...r[i], [k]: v }; onChange(r); }
  function del(i: number) { onChange(rows.filter((_: any, x: number) => x !== i)); }
  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-sm text-slate-400">No rows yet.</p>}
      {rows.map((row: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          {columns.map((c: any) => (
            <div key={c.k} className={c.w ?? ''}>
              {c.type === 'bool'
                ? <label className="flex items-center gap-1 text-xs text-slate-500"><input type="checkbox" checked={!!row[c.k]} onChange={e => upd(i, c.k, e.target.checked)} className="h-4 w-4 accent-blue-600" />{c.label}</label>
                : c.type === 'select'
                ? <select className="rounded border border-slate-200 px-2 py-1.5 text-sm" value={row[c.k] ?? ''} onChange={e => upd(i, c.k, e.target.value)}>{c.opts.map((o: string) => <option key={o} value={o}>{o}</option>)}</select>
                : <input className={`${c.w ? 'w-full ' : 'w-32 '}rounded border border-slate-200 px-2 py-1.5 text-sm`} type={c.type === 'date' ? 'date' : 'text'} placeholder={c.label} value={row[c.k] ?? ''} onChange={e => upd(i, c.k, e.target.value)} />}
            </div>
          ))}
          <button onClick={() => del(i)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      ))}
      <button onClick={() => onChange([...rows, { ...newRow }])} className="mt-2 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50">+ Add row</button>
    </div>
  );
}

// ── multilingual content editor ─────────────────────────────────────────────
// Per-language rows — stacked, collapsible, distinctly colored — matching descamper's
// listing-form.tsx Content tab exactly (functionally): each language is its own
// expand/collapse card with a "has content" indicator, rather than a single form
// behind tab-buttons. Default collapsed.
const CONTENT_LANGS = [
  { code: 'en', label: 'English', card: 'bg-blue-50 border-blue-200', hover: 'hover:bg-blue-100/60', inner: 'border-blue-100', badge: 'text-blue-500' },
  { code: 'nl', label: 'Dutch', card: 'bg-orange-50 border-orange-200', hover: 'hover:bg-orange-100/60', inner: 'border-orange-100', badge: 'text-orange-500' },
  { code: 'de', label: 'German', card: 'bg-slate-100 border-slate-300', hover: 'hover:bg-slate-200/60', inner: 'border-slate-200', badge: 'text-slate-500' },
  { code: 'fr', label: 'French', card: 'bg-violet-50 border-violet-200', hover: 'hover:bg-violet-100/60', inner: 'border-violet-100', badge: 'text-violet-500' },
  { code: 'tr', label: 'Turkish', card: 'bg-red-50 border-red-200', hover: 'hover:bg-red-100/60', inner: 'border-red-100', badge: 'text-red-500' },
];

function ContentEditor({ L, setL, onSave, saving, onDirty }: any) {
  const [openLangs, setOpenLangs] = useState<Record<string, boolean>>({});
  const toggleLang = (code: string) => setOpenLangs(p => ({ ...p, [code]: !p[code] }));

  // bop_listing_content.locale is char(5) — Postgres blank-pads short values ('en' -> 'en   '),
  // so comparisons against a clean 2-letter code must trim first, or the row is never found
  // (silently creates a SECOND row for the same locale, which then fails on save with
  // "ON CONFLICT DO UPDATE command cannot affect row a second time").
  const sameLoc = (a: any, code: string) => (a ?? '').trim() === code;
  const rowFor = (code: string) => L.content.find((c: any) => sameLoc(c.locale, code)) ?? { locale: code };
  function upd(code: string, k: string, v: any) {
    setL((p: any) => {
      const exists = p.content.some((c: any) => sameLoc(c.locale, code));
      const content = exists
        ? p.content.map((c: any) => sameLoc(c.locale, code) ? { ...c, locale: code, [k]: v } : c)
        : [...p.content, { locale: code, [k]: v }];
      return { ...p, content };
    });
    onDirty?.();
  }

  return (
    <Section>
      <div className="space-y-3">
        {CONTENT_LANGS.map(({ code, label, card, hover, inner, badge }) => {
          const row = rowFor(code);
          const isOpen = !!openLangs[code];
          const hasContent = !!(row.title || row.short_desc || row.full_desc);
          return (
            <div key={code} className={`rounded-xl border ${card}`}>
              <button type="button" onClick={() => toggleLang(code)} className={`flex w-full items-center justify-between rounded-xl px-5 py-4 text-left transition-colors ${hover}`}>
                <div>
                  <span className="font-semibold text-sm text-slate-800">{label}</span>
                  <span className={`ml-2 text-xs font-bold uppercase ${badge}`}>{code}</span>
                  {hasContent && !isOpen && <span className="ml-2 text-xs font-medium text-emerald-500">• has content</span>}
                </div>
                <Chevron open={isOpen} />
              </button>
              {isOpen && (
                <div className={`space-y-4 border-t px-5 pb-5 pt-4 ${inner}`}>
                  <div><label className={lbl}>Title ({code.toUpperCase()})</label><input className={inp} value={row.title ?? ''} onChange={e => upd(code, 'title', e.target.value)} /></div>
                  <div><label className={lbl}>Short description ({code.toUpperCase()})</label><input className={inp} value={row.short_desc ?? ''} onChange={e => upd(code, 'short_desc', e.target.value)} /></div>
                  <div><label className={lbl}>Full description ({code.toUpperCase()})</label><textarea className={`${inp} h-32`} value={row.full_desc ?? ''} onChange={e => upd(code, 'full_desc', e.target.value)} /></div>
                  <div><label className={lbl}>Highlights (one per line — always visible)</label><textarea className={`${inp} h-24`} value={(row.highlights ?? []).join('\n')} onChange={e => upd(code, 'highlights', e.target.value.split('\n').filter(Boolean))} /></div>
                  <div><label className={lbl}>Features text (one per line — expandable)</label><textarea className={`${inp} h-24`} value={(row.features ?? []).join('\n')} onChange={e => upd(code, 'features', e.target.value.split('\n').filter(Boolean))} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={lbl}>SEO title</label><input className={inp} value={row.seo_title ?? ''} onChange={e => upd(code, 'seo_title', e.target.value)} /></div>
                    <div><label className={lbl}>SEO keywords</label><input className={inp} value={row.seo_keywords ?? ''} onChange={e => upd(code, 'seo_keywords', e.target.value)} /></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// ── Media tab: per-language cover, unified drag-reorder gallery, 360° tour ──
// Language codes are shown as plain text badges (EN/NL/DE/FR/TR), not flag
// emoji — flag glyphs render as literal 2-letter text ("GB"/"NL"/…) on systems
// without emoji-flag font support (e.g. Windows), so a real flag was never
// reliably shown anyway. English is the primary/first slot (no separate
// "Primary" locale=null slot — legacy null-locale covers are migrated to EN
// automatically the first time a new EN cover is uploaded).
const COVER_LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'nl', label: 'Dutch' },
  { code: 'de', label: 'German' },
  { code: 'fr', label: 'French' },
  { code: 'tr', label: 'Turkish' },
];
const MAX_VIDEOS = 2;
const MAX_PHOTOS = 100;

function fileLabel(url: string) {
  const name = url.split('/').pop() || '';
  // strip our own "<kind>-<timestamp>-" prefix so only the meaningful part shows
  return name.replace(/^(cover|gallery)-\d+-/, '');
}

// expand/collapse chevron — matches descamper's per-section toggle behavior
function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function MediaTab({ listingId, media, onRefresh, showToast, readOnly }: { listingId: string; media: any[]; onRefresh: () => void; showToast: (m: string) => void; readOnly?: boolean }) {
  const guard = () => { if (readOnly) { showToast('✗ Read-only — listing locked by another session'); return true; } return false; };
  const router = useRouter();
  const [uploading, setUploading] = useState<string | null>(null); // slot key while uploading, for spinner state
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [tourUrl, setTourUrl] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  // collapsible sections — matches descamper's toggleMediaSection behavior (default open)
  const [open, setOpen] = useState({ cover: false, gallery: false, tour: false });
  const toggle = (k: keyof typeof open) => setOpen(o => ({ ...o, [k]: !o[k] }));

  const covers = media.filter(m => m.is_cover);
  // EN falls back to a legacy locale=NULL cover (the old "Primary" slot) until it's replaced.
  const coverByLocale = (loc: string) => covers.find(m => m.locale === loc) ?? (loc === 'en' ? covers.find(m => m.locale === null) : undefined);
  const gallery = media.filter(m => !m.is_cover && m.media_type !== 'tour_360').sort((a, b) => a.sort_order - b.sort_order);
  const tour = media.find(m => m.media_type === 'tour_360');
  const photoCount = gallery.filter(m => m.media_type === 'photo').length;
  const videoCount = gallery.filter(m => m.media_type === 'video').length;

  useEffect(() => { setTourUrl(tour?.url ?? '');   }, [tour?.url]);

  // Any failure (server error, network blip, or a non-JSON response like an nginx
  // 413/502 HTML page) always surfaces a toast — previously a non-JSON response made
  // `.json()` throw before the error toast fired, so uploads could fail completely
  // silently ("dropped a file, nothing happened").
  async function uploadFile(file: File, kind: 'cover' | 'gallery', locale?: string) {
    const fd = new FormData();
    fd.append('file', file); fd.append('listing_id', listingId); fd.append('kind', kind);
    if (locale) fd.append('locale', locale);
    let res: Response;
    try { res = await fetch('/api/bop/mkp/media/upload', { method: 'POST', body: fd }); }
    catch { throw new Error('Network error — upload did not reach the server'); }
    let j: any;
    try { j = await res.json(); }
    catch { throw new Error(res.status === 413 ? 'File too large' : `Upload failed (HTTP ${res.status})`); }
    if (!res.ok || j.error) throw new Error(j.error || `Upload failed (HTTP ${res.status})`);
    return j;
  }

  async function uploadCover(file: File, code: string) {
    if (guard()) return;
    setUploading(`cover-${code}`);
    try { await uploadFile(file, 'cover', code); onRefresh(); }
    catch (e: any) { showToast('✗ ' + e.message); }
    finally { setUploading(null); }
  }

  // Uploads run SEQUENTIALLY (each one's sort_order depends on the previous having
  // committed — parallel uploads raced and all got the same sort_order) but the page
  // refreshes only ONCE at the end. The original "locked" symptom was NOT from
  // sequential uploading itself — it was from refreshing (and briefly unmounting
  // the whole editor) after every single file.
  async function uploadMany(files: FileList, isVideo: boolean) {
    if (guard()) return;
    const key = isVideo ? 'video' : 'photo';
    setUploading(key);
    const errors: string[] = [];
    try {
      for (const f of Array.from(files)) { await uploadFile(f, 'gallery').catch((e: any) => { errors.push(`${f.name}: ${e.message}`); }); }
      onRefresh();
      if (errors.length) showToast('✗ ' + errors.join(' · '));
    } finally { setUploading(null); }
  }

  async function removeMedia(id: number) {
    if (guard()) return;
    await fetch(`/api/bop/mkp/media/${id}`, { method: 'DELETE' });
    onRefresh();
  }

  async function setCategory(id: number, category: string) {
    if (guard()) return;
    const res = await fetch(`/api/bop/mkp/media/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category }),
    }).then(r => r.json()).catch(() => ({ error: 'network error' }));
    if (res.error) { showToast(res.error); return; }
    onRefresh();
  }

  async function saveTour() {
    if (guard()) return;
    if (!tourUrl.trim()) return;
    const fd = new FormData();
    fd.append('listing_id', listingId); fd.append('kind', 'tour_360'); fd.append('url', tourUrl.trim());
    const j = await fetch('/api/bop/mkp/media/upload', { method: 'POST', body: fd }).then(r => r.json());
    if (j.error) { showToast('✗ ' + j.error); return; }
    showToast('✓ Saved'); onRefresh();
  }

  function onGalleryDrop(dropIdx: number) {
    if (dragIdx === null || dragIdx === dropIdx) return;
    const reordered = [...gallery];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);
    setDragIdx(null);
    void fetch('/api/bop/mkp/media/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: reordered.map(m => m.id) }) })
      .then(onRefresh);
  }

  // Tailwind's JIT scanner needs full literal class strings — no `${color}` interpolation.
  const DROP_ACTIVE: Record<string, string> = {
    orange: 'border-orange-500 bg-orange-50 text-orange-600 cursor-copy',
    blue: 'border-blue-500 bg-blue-50 text-blue-600 cursor-copy',
    purple: 'border-purple-500 bg-purple-50 text-purple-600 cursor-copy',
  };
  const DROP_IDLE: Record<string, string> = {
    orange: 'border-slate-300 bg-slate-50 text-slate-400 hover:border-orange-400 hover:bg-orange-50 cursor-pointer',
    blue: 'border-slate-300 bg-slate-50 text-slate-400 hover:border-blue-400 hover:bg-blue-50 cursor-pointer',
    purple: 'border-slate-300 bg-slate-50 text-slate-400 hover:border-purple-400 hover:bg-purple-50 cursor-pointer',
  };
  const dropZoneCls = (active: boolean, disabled: boolean, color: string) =>
    `flex flex-col items-center justify-center w-full min-h-[100px] rounded-lg border-2 border-dashed text-xs transition-colors ${
      disabled ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300'
      : active ? DROP_ACTIVE[color]
      : DROP_IDLE[color]
    }`;

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-400">Uploads save instantly — no Save button needed for photos or videos.</p>
      {/* Cover Image (per language) */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <button type="button" onClick={() => toggle('cover')} className="flex w-full items-center justify-between text-left">
          <div>
            <h3 className="font-semibold text-slate-800">Cover Image</h3>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Per-language optimization</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600">{covers.length} set</span>
            <Chevron open={open.cover} />
          </div>
        </button>
        {open.cover && <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
          {COVER_LOCALES.map(({ code, label }, i) => {
            const row = coverByLocale(code);
            const key = `cover-${code}`;
            return (
              <div key={key} className={i === 0 ? 'col-span-2 md:col-span-3' : ''}>
                <div className="mb-1.5 flex items-center gap-1.5 text-xs">
                  <span className={`rounded px-1.5 py-0.5 font-mono font-bold uppercase ${row ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>{code}</span>
                  <span className={`font-semibold ${row ? 'text-orange-500' : 'text-slate-500'}`}>{label}</span>
                </div>
                <div className={`group relative w-full ${i === 0 ? 'h-48' : 'h-28'} overflow-hidden rounded-lg border bg-slate-100`}>
                  {row ? (
                    <>
                      <img src={row.url} alt={label} className="h-full w-full object-cover" />
                      <span className="absolute bottom-1 right-1 z-10 max-w-[90%] truncate rounded bg-red-600/90 px-1.5 py-0.5 font-mono text-[9px] leading-tight text-white" title={fileLabel(row.url)}>{fileLabel(row.url)}</span>
                      <button onClick={() => { void removeMedia(row.id); }} className="absolute right-1 top-1 z-20 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">✕</button>
                    </>
                  ) : (
                    <label
                      onDragOver={e => { e.preventDefault(); setDragOver(key); }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={e => { e.preventDefault(); setDragOver(null); const f = e.dataTransfer.files?.[0]; if (f) void uploadCover(f, code); }}
                      className={dropZoneCls(dragOver === key, uploading === key, 'orange') + ' h-full'}>
                      <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={e => { const f = e.target.files?.[0]; if (f) void uploadCover(f, code); }} />
                      {uploading === key ? 'Uploading…' : dragOver === key ? 'Drop image' : 'Drop or click'}
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>}
      </div>

      {/* Gallery Assets (unified photo+video, drag to reorder) */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <button type="button" onClick={() => toggle('gallery')} className="flex w-full items-center justify-between text-left">
          <div>
            <h3 className="font-semibold text-slate-800">Gallery Assets</h3>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Photo & video showcase</p>
          </div>
          <div className="flex items-center gap-1.5">
            {photoCount > 0 && <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-600">{photoCount} ph</span>}
            {videoCount > 0 && <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-600">{videoCount}/{MAX_VIDEOS} vid</span>}
            <Chevron open={open.gallery} />
          </div>
        </button>
        {open.gallery && <>
        <p className="mt-1 text-xs text-slate-400">Drag to reorder — first item is the main display.</p>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {gallery.map((m, i) => (
            <div key={m.id}>
              <div draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => onGalleryDrop(i)}
                className={`group relative h-24 cursor-move overflow-hidden rounded-md border ${m.media_type === 'video' ? 'border-purple-300 bg-black' : 'border-slate-200 bg-slate-100'}`}>
                <span className={`absolute left-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${m.media_type === 'video' ? 'bg-purple-500' : 'bg-blue-500'}`}>{i + 1}</span>
                {m.media_type === 'video'
                  ? <video src={m.url} muted preload="metadata" className="h-full w-full object-cover opacity-70" />
                  : <img src={m.url} alt="" className="h-full w-full object-cover" />}
                <span className="absolute bottom-1 left-1 right-1 z-10 truncate rounded bg-red-600/90 px-1 py-0.5 text-center font-mono text-[8px] leading-tight text-white" title={fileLabel(m.url)}>{fileLabel(m.url)}</span>
                <button onClick={() => { void removeMedia(m.id); }} className="absolute right-1 top-1 z-20 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">✕</button>
              </div>
              {m.media_type === 'photo' && (
                <div className="mt-1">
                  <BopSelect size="sm" value={m.category ?? ''} onChange={(v) => { void setCategory(m.id, v); }}
                    options={[{ value:'', label:'— tag —' }, ...MEDIA_CATEGORIES.map(c => ({ value:c, label:cap(c.replace(/_/g,' ')) }))]} />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label
            onDragOver={e => { e.preventDefault(); if (photoCount < MAX_PHOTOS) setDragOver('gallery-photo'); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => { e.preventDefault(); setDragOver(null); if (e.dataTransfer.files?.length) void uploadMany(e.dataTransfer.files, false); }}
            className={dropZoneCls(dragOver === 'gallery-photo', photoCount >= MAX_PHOTOS || !!uploading, 'blue')}>
            <input type="file" accept="image/*" multiple className="hidden" disabled={photoCount >= MAX_PHOTOS || !!uploading} onChange={(e) => { if (e.target.files) void uploadMany(e.target.files, false); }} />
            {uploading === 'photo' ? 'Uploading…' : photoCount >= MAX_PHOTOS ? `Max ${MAX_PHOTOS} photos` : `Drop photos here · ${photoCount}/${MAX_PHOTOS}`}
          </label>
          <label
            onDragOver={e => { e.preventDefault(); if (videoCount < MAX_VIDEOS) setDragOver('gallery-video'); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => { e.preventDefault(); setDragOver(null); if (videoCount < MAX_VIDEOS && e.dataTransfer.files?.length) void uploadMany(e.dataTransfer.files, true); }}
            className={dropZoneCls(dragOver === 'gallery-video', videoCount >= MAX_VIDEOS || !!uploading, 'purple')}>
            <input type="file" accept="video/*" multiple className="hidden" disabled={videoCount >= MAX_VIDEOS || !!uploading} onChange={(e) => { if (e.target.files) void uploadMany(e.target.files, true); }} />
            {uploading === 'video' ? 'Uploading…' : videoCount >= MAX_VIDEOS ? `Max ${MAX_VIDEOS} videos` : `Drop videos here · ${videoCount}/${MAX_VIDEOS}`}
          </label>
        </div>
        </>}
      </div>

      {/* 360 Virtual Tour */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <button type="button" onClick={() => toggle('tour')} className="flex w-full items-center justify-between text-left">
          <div>
            <h3 className="font-semibold text-slate-800">360° Virtual Tour URL</h3>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">{tour ? 'Set' : 'Not set'}</p>
          </div>
          <Chevron open={open.tour} />
        </button>
        {open.tour && <div className="mt-3">
          <p className="mb-2 text-xs text-slate-400">Kuula, 3DVista, or hosted 360° tour embed URL.</p>
          <input className={inp} placeholder="https://kuula.co/share/..." value={tourUrl} onChange={e => setTourUrl(e.target.value)} />
        </div>}
      </div>
      {/* Always visible, independent of the tour section's expand/collapse state —
          it must not appear/disappear as a side effect of an unrelated toggle click. */}
      <div className="flex justify-end gap-2">
        <button onClick={() => router.push('/console/mkp/listings')}
          className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Close</button>
        <button onClick={() => { void saveTour(); }} disabled={!tourUrl.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap">Save 360° URL</button>
      </div>
    </div>
  );
}
