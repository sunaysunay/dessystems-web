'use client';
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

// --- Taxonomy constants ---

const GROUP_ORDER = ['seo','ux','b2b','pricing','conversion','accounts','content','system'] as const;
type GroupKey = typeof GROUP_ORDER[number];

const GROUP_LABELS: Record<GroupKey, string> = {
  seo:        'SEO & Discovery',
  ux:         'Storefront UX',
  b2b:        'B2B & Commercial',
  pricing:    'Pricing & Finance',
  conversion: 'Conversion & Leads',
  accounts:   'User Accounts',
  content:    'Content & Media',
  system:     'System',
};

const GROUP_CHIP: Record<GroupKey, string> = {
  seo:        'bg-blue-50 text-blue-700 border-blue-200',
  ux:         'bg-emerald-50 text-emerald-700 border-emerald-200',
  b2b:        'bg-amber-50 text-amber-700 border-amber-200',
  pricing:    'bg-orange-50 text-orange-700 border-orange-200',
  conversion: 'bg-violet-50 text-violet-700 border-violet-200',
  accounts:   'bg-indigo-50 text-indigo-700 border-indigo-200',
  content:    'bg-pink-50 text-pink-700 border-pink-200',
  system:     'bg-slate-50 text-slate-600 border-slate-200',
};

const GROUP_ACTIVE: Record<GroupKey, string> = {
  seo:        'bg-blue-600 text-white border-blue-600',
  ux:         'bg-emerald-600 text-white border-emerald-600',
  b2b:        'bg-amber-500 text-white border-amber-500',
  pricing:    'bg-orange-500 text-white border-orange-500',
  conversion: 'bg-violet-600 text-white border-violet-600',
  accounts:   'bg-indigo-600 text-white border-indigo-600',
  content:    'bg-pink-500 text-white border-pink-500',
  system:     'bg-slate-600 text-white border-slate-600',
};

// --- Audience / user_context ---
const AUD_LABELS: Record<string, string> = { b2b: 'B2B', b2c: 'B2C', both: 'Both' };
const AUD_PILL: Record<string, string> = {
  b2b:  'bg-amber-50 text-amber-700 border-amber-200',
  b2c:  'bg-indigo-50 text-indigo-700 border-indigo-200',
  both: 'bg-slate-100 text-slate-500 border-slate-200',
};
const CTX_LABELS: Record<string, string> = { any: 'Any', logged_in: 'Login req.', b2b: 'B2B acct.' };
const CTX_PILL: Record<string, string> = {
  any:       'bg-slate-100 text-slate-500 border-slate-200',
  logged_in: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  b2b:       'bg-amber-50 text-amber-700 border-amber-200',
};

// --- Importance level ---
const IMP_LABELS: Record<string, string> = { P0: 'P0 Core', P1: 'P1 High', P2: 'P2 Medium', P3: 'P3 Advanced' };
const IMP_PILL: Record<string, string> = {
  P0: 'bg-rose-50 text-rose-700 border-rose-200',
  P1: 'bg-amber-50 text-amber-700 border-amber-200',
  P2: 'bg-blue-50 text-blue-700 border-blue-200',
  P3: 'bg-slate-100 text-slate-500 border-slate-200',
};
const IMP_ACTIVE: Record<string, string> = {
  P0: 'bg-rose-600 text-white border-rose-600',
  P1: 'bg-amber-500 text-white border-amber-500',
  P2: 'bg-blue-600 text-white border-blue-600',
  P3: 'bg-slate-600 text-white border-slate-600',
};

// --- Protection fallback (used when DB columns not yet added via migration 58) ---
const CRITICAL_KEYS = new Set([
  'listing_meta','seo_faceted_urls','vehicles_meta',
  'sell_funnel','save_search_email','btw_toggle',
]);
const LOCKED_KEYS = new Set(['dm_accounts']);
const LOCKED_REASONS: Record<string, string> = {
  dm_accounts: 'Disabling logs out all users and destroys active sessions. Contact super-admin.',
};

// --- Impact warnings per feature ---
function getImpactWarning(key: string, enabling: boolean): string {
  const warnings: Record<string, { enable: string; disable: string }> = {
    listing_meta: {
      disable: 'All vehicle detail pages will lose their SEO title, description, and Open Graph tags. Google will stop displaying rich results for these pages. Rankings can take weeks to recover.',
      enable:  'SEO metadata will be re-enabled on all vehicle detail pages.',
    },
    seo_faceted_urls: {
      disable: 'All category landing pages (e.g. /vehicles/bestelwagens) will return 404. Currently indexed pages will be de-ranked. SEO recovery can take weeks.',
      enable:  'Category landing pages will become active and indexable again.',
    },
    vehicles_meta: {
      disable: 'The /vehicles listing page will lose its dynamic meta title. Filtered pages (e.g. "Volkswagen Bestelwagens") will no longer have unique titles in Google.',
      enable:  'Dynamic meta titles will be restored on the vehicles listing page.',
    },
    sell_funnel: {
      disable: 'All lead capture forms and sell CTAs will be hidden. No new leads will be generated. Existing leads in CRM are unaffected.',
      enable:  'Sell funnel and contact forms will be re-activated.',
    },
    save_search_email: {
      disable: 'Users with active saved searches will stop receiving email alerts for new matching listings. They will not be notified of the change.',
      enable:  'Email alerts will resume for users with saved searches.',
    },
    btw_toggle: {
      disable: 'The BTW incl./excl. toggle will be removed from the toolbar. B2B buyers currently viewing ex-BTW prices will see incl. prices without warning.',
      enable:  'The BTW toggle will become available in the listing toolbar.',
    },
    dm_accounts: {
      disable: 'ALL user accounts will be immediately deactivated. Active sessions will be terminated. Users will lose access to favorites, saved searches, and messages.',
      enable:  'User account system will be re-activated.',
    },
  };
  const w = warnings[key];
  if (!w) return `You are about to ${enabling ? 'enable' : 'disable'} this feature. This change takes effect immediately.`;
  return enabling ? w.enable : w.disable;
}

// --- SVG previews for known flags ---
const SF_SVG_PREVIEWS: Record<string, string> = {
  btw_badge:   `<svg width="200" height="100" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="100" rx="8" fill="#f5f5f5"/><rect x="8" y="8" width="90" height="60" rx="6" fill="#ddd"/><rect x="8" y="54" width="60" height="12" rx="3" fill="#2563eb" opacity="0.9"/><text x="11" y="64" fontSize="7" fill="white" fontFamily="sans-serif">BTW verrekenbaar</text><rect x="106" y="16" width="86" height="8" rx="3" fill="#333" opacity="0.7"/><rect x="106" y="28" width="60" height="6" rx="3" fill="#888" opacity="0.5"/><rect x="106" y="52" width="50" height="10" rx="3" fill="#e57300" opacity="0.8"/><text x="109" y="61" fontSize="8" fill="white" fontFamily="sans-serif">€18.500</text></svg>`,
  btw_toggle:  `<svg width="200" height="100" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="100" rx="8" fill="#f5f5f5"/><rect x="10" y="38" width="80" height="26" rx="13" fill="#e57300"/><circle cx="78" cy="51" r="11" fill="white"/><text x="18" y="55" fontSize="9" fill="white" fontFamily="sans-serif" fontWeight="bold">Ex. BTW</text><rect x="110" y="38" width="80" height="26" rx="13" fill="#ddd"/><circle cx="122" cy="51" r="11" fill="white"/><text x="136" y="55" fontSize="9" fill="#888" fontFamily="sans-serif">Incl. BTW</text></svg>`,
  deal:        `<svg width="200" height="100" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="100" rx="8" fill="#f5f5f5"/><rect x="8" y="8" width="90" height="60" rx="6" fill="#ddd"/><rect x="12" y="12" width="40" height="12" rx="3" fill="#10b981"/><text x="15" y="21" fontSize="7" fill="white" fontFamily="sans-serif" fontWeight="bold">TOP DEAL</text></svg>`,
  monthly:     `<svg width="200" height="80" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="80" rx="8" fill="#f5f5f5"/><text x="12" y="35" fontSize="16" fill="#e57300" fontFamily="sans-serif" fontWeight="bold">€18.500</text><text x="12" y="50" fontSize="9" fill="#888" fontFamily="sans-serif">Vanaf ~€417/mo</text></svg>`,
  chips:       `<svg width="200" height="70" viewBox="0 0 200 70" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="70" rx="8" fill="#f5f5f5"/><rect x="8" y="20" width="58" height="20" rx="10" fill="none" stroke="#e57300" strokeWidth="1.5"/><text x="14" y="34" fontSize="8" fill="#e57300" fontFamily="sans-serif">Volkswagen ×</text><rect x="72" y="20" width="40" height="20" rx="10" fill="none" stroke="#e57300" strokeWidth="1.5"/><text x="78" y="34" fontSize="8" fill="#e57300" fontFamily="sans-serif">Diesel ×</text></svg>`,
  seo:         `<svg width="200" height="80" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="80" rx="8" fill="#f5f5f5"/><text x="10" y="28" fontSize="9" fill="#888" fontFamily="sans-serif">desmobil.com /nl/</text><text x="10" y="44" fontSize="11" fill="#2563eb" fontFamily="sans-serif" fontWeight="bold">vehicles/bestelwagens</text><rect x="10" y="52" width="130" height="6" rx="3" fill="#ddd"/><text x="148" y="44" fontSize="8" fill="#10b981" fontFamily="sans-serif">indexed ✓</text></svg>`,
  counts:      `<svg width="200" height="80" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="80" rx="8" fill="#f5f5f5"/><rect x="8" y="20" width="55" height="40" rx="6" fill="#fff" stroke="#ddd" strokeWidth="1"/><text x="13" y="36" fontSize="8" fill="#333" fontFamily="sans-serif">Bestelwagens</text><text x="13" y="50" fontSize="9" fill="#e57300" fontFamily="sans-serif" fontWeight="bold">(47)</text><rect x="70" y="20" width="55" height="40" rx="6" fill="#fff" stroke="#ddd" strokeWidth="1"/><text x="75" y="36" fontSize="8" fill="#333" fontFamily="sans-serif">Campers</text><text x="75" y="50" fontSize="9" fill="#e57300" fontFamily="sans-serif" fontWeight="bold">(8)</text></svg>`,
  card_v2:     `<svg width="200" height="100" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="100" rx="8" fill="#f5f5f5"/><rect x="8" y="8" width="80" height="50" rx="6" fill="#ddd"/><rect x="96" y="12" width="96" height="7" rx="3" fill="#333" opacity="0.7"/><rect x="96" y="34" width="50" height="9" rx="3" fill="#e57300" opacity="0.9"/><text x="99" y="42" fontSize="7" fill="white" fontFamily="sans-serif">€18.500</text><rect x="96" y="45" width="40" height="6" rx="2" fill="#bbb" opacity="0.5"/><text x="99" y="50" fontSize="5" fill="#666" fontFamily="sans-serif">Ex. BTW: €15.289</text><rect x="96" y="58" width="22" height="10" rx="4" fill="#e8e8e8"/><text x="99" y="66" fontSize="6" fill="#555" fontFamily="sans-serif">2019</text><rect x="121" y="58" width="26" height="10" rx="4" fill="#e8e8e8"/><text x="124" y="66" fontSize="6" fill="#555" fontFamily="sans-serif">142k km</text></svg>`,
};

const SF_DETAIL: Record<string, string> = {
  seo_faceted_urls:     'Creates dedicated URLs per vehicle category. Each page has a unique title, meta description, and is listed in sitemap.xml. Improves organic rankings for "bestelwagens te koop" type queries.',
  listing_meta:         'Generates <title>, description, hreflang, og:image and schema.org/Vehicle structured data per listing. Google uses this for rich snippets.',
  vehicles_meta:        'When filtered by brand or category the page title updates dynamically. Helps Google understand context of filtered results.',
  show_btw_badge:       'B2B buyers can reclaim 21% VAT. The badge signals deductibility upfront on the card. Shown automatically for vans, trucks, buses, trailers.',
  btw_toggle:           'Ex. BTW mode divides all displayed prices by 1.21. B2B buyers evaluate vehicles on ex-BTW prices.',
  listing_card_v2:      'Upgrades vehicle cards to show incl. + ex-BTW prices plus scannable spec pills. Buyers shortlist faster without opening each listing.',
  live_category_counts: 'Shows "(47)" next to each category button on the homepage. Removes the trust gap where buyers wonder if inventory is real or stale.',
  show_financing_teaser:'Calculated as price × 1.08 ÷ 48 months — a rough approximation, not a real financing offer. Makes large prices more accessible.',
  show_deal_score:      'deal_score is computed in BOP by comparing listing price vs market average. Score ≥ 75 = priced below market. Badge increases click-through.',
  show_comparison:      'Adds a Compare button to each card. Up to 3 vehicles stack into a spec comparison tray at the bottom of the screen.',
  active_filter_chips:  'When filters are active they appear as chips (e.g. "Volkswagen ×"). Click any chip to remove that single filter without opening the sidebar.',
  export_readiness:     "Collapsible section on each detail page explaining what a cross-border buyer needs to import the vehicle. DESMobil's key differentiator.",
  sell_funnel:          'Activates the multi-step sell flow for private sellers and the "Contact seller" form on detail pages that generates leads in BOP CRM.',
  dm_accounts:          'Allows buyers to create accounts, save favorites, and message sellers. Requires Google OAuth credentials and a configured email provider.',
  save_search:          'Adds a Save search button to the listing toolbar. Saved searches appear in user accounts. Foundation for email alert notifications.',
  save_search_email:    'When a new listing is published and matches a saved search, the user receives an email. Requires save_search + dm_accounts enabled.',
};

const SVG_KEY_MAP: Record<string, string> = {
  show_btw_badge: 'btw_badge', btw_toggle: 'btw_toggle', show_deal_score: 'deal',
  show_financing_teaser: 'monthly', active_filter_chips: 'chips',
  seo_faceted_urls: 'seo', listing_meta: 'seo', vehicles_meta: 'seo',
  live_category_counts: 'counts', listing_card_v2: 'card_v2',
};

// --- Page ---

interface FeatureRow {
  id: string;
  tenant_id: number;
  feature_key: string;
  enabled: boolean;
  label: string;
  description: string;
  notes: string | null;
  config: Record<string, unknown>;
  sort_order: number;
  group_key: string;
  audience: string;
  user_context: string;
  importance_level: string;
  // Protection columns (may not exist until migration 58 is applied -- fallback sets used)
  is_critical?: boolean | null;
  is_locked?: boolean | null;
  lock_reason?: string | null;
}

function isCritical(f: FeatureRow): boolean {
  return f.is_critical ?? CRITICAL_KEYS.has(f.feature_key);
}

function isLocked(f: FeatureRow): boolean {
  return f.is_locked ?? LOCKED_KEYS.has(f.feature_key);
}

function getLockReason(f: FeatureRow): string {
  return f.lock_reason ?? LOCKED_REASONS[f.feature_key] ?? 'Locked -- contact super-admin.';
}

export default function SY050Page() {
  const [tenants, setTenants] = useState<{ tenant_id: number; name: string }[]>([]);
  const [tid, setTid] = useState<number>(300);
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [audFilter, setAudFilter] = useState<string | null>(null);
  const [ctxFilter, setCtxFilter] = useState<string | null>(null);
  const [impFilter, setImpFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState('');
  const [bulkGroup, setBulkGroup] = useState<string>('');

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{ feature: FeatureRow; newValue: boolean } | null>(null);
  const [confirmText, setConfirmText] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  useEffect(() => {
    void fetch('/api/bop/sys/tenant-config')
      .then(r => r.json())
      .then(j => setTenants(j.tenants ?? []));
    const urlTid = typeof window !== 'undefined'
      ? Number(new URLSearchParams(window.location.search).get('tenant_id')) || 300
      : 300;
    setTid(urlTid);
  }, []);

  const loadFeatures = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/bop/sys/site-features?tenant_id=${tid}`);
    const j = await res.json();
    setFeatures(j.data ?? []);
    setLoading(false);
  }, [tid]);

  useEffect(() => { void loadFeatures(); }, [loadFeatures]);

  async function doToggle(feature: FeatureRow, newValue: boolean) {
    const key = feature.feature_key;
    setSavingKey(key);
    setFeatures(prev => prev.map(f => f.feature_key === key ? { ...f, enabled: newValue } : f));
    const res = await fetch('/api/bop/sys/site-features', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tid, feature_key: key, enabled: newValue }),
    });
    setSavingKey(null);
    if (res.ok) {
      showToast(`${key} ${newValue ? 'enabled' : 'disabled'}`);
    } else {
      const j = await res.json().catch(() => ({})) as { error?: string; reason?: string };
      setFeatures(prev => prev.map(f => f.feature_key === key ? { ...f, enabled: !newValue } : f));
      if (j.error === 'Feature is locked') {
        showToast(`Locked: ${j.reason ?? 'Contact super-admin'}`);
      } else {
        showToast('Save failed');
      }
    }
  }

  function handleToggleAttempt(feature: FeatureRow, newValue: boolean) {
    if (isLocked(feature)) return;
    if (isCritical(feature)) {
      setConfirmModal({ feature, newValue });
      setConfirmText('');
      return;
    }
    void doToggle(feature, newValue);
  }

  async function bulkToggle(group: string, enable: boolean) {
    const targets = features.filter(f => f.group_key === group);
    for (const f of targets) {
      if (isLocked(f)) continue;
      await fetch('/api/bop/sys/site-features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tid, feature_key: f.feature_key, enabled: enable }),
      });
    }
    await loadFeatures();
    showToast(`${enable ? 'Enabled' : 'Disabled'} all ${GROUP_LABELS[group as GroupKey] ?? group} features`);
  }

  const filtered = features.filter(f => {
    const s = search.toLowerCase();
    const matchSearch = !s ||
      f.feature_key.includes(s) ||
      (f.label ?? '').toLowerCase().includes(s) ||
      (f.description ?? '').toLowerCase().includes(s);
    const matchGroup  = !groupFilter || f.group_key === groupFilter;
    const matchAud    = !audFilter   || f.audience === audFilter;
    const matchCtx    = !ctxFilter   || f.user_context === ctxFilter;
    const matchImp    = !impFilter   || (f.importance_level ?? 'P2') === impFilter;
    const matchStatus = statusFilter === 'all' || (statusFilter === 'enabled' ? f.enabled : !f.enabled);
    return matchSearch && matchGroup && matchAud && matchCtx && matchImp && matchStatus;
  });

  const byGroup: [GroupKey, FeatureRow[]][] = GROUP_ORDER
    .map(g => [g, filtered.filter(f => f.group_key === g)])
    .filter(([, rows]) => (rows as FeatureRow[]).length > 0) as [GroupKey, FeatureRow[]][];

  const groupCounts = Object.fromEntries(
    GROUP_ORDER.map(g => [g, features.filter(f => f.group_key === g).length])
  );

  const filterChipBase = 'rounded-full border px-3 py-1 text-xs font-medium cursor-pointer transition-colors select-none';

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-5 flex items-start gap-4 flex-wrap">
        <a
          href={`/console/sys/tenants?tenant=${tid}`}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 shrink-0 mt-1"
        >
          ← SY003
        </a>
        <div className="flex-1 min-w-0">
          <ScreenHeader title="Feature Matrix" description="Per-tenant feature control — SY050" />
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <select
          value={tid}
          onChange={e => setTid(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {tenants.map(t => (
            <option key={t.tenant_id} value={t.tenant_id}>{t.name ?? t.tenant_id} ({t.tenant_id})</option>
          ))}
        </select>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search features…"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'all' | 'enabled' | 'disabled')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All status</option>
          <option value="enabled">Enabled only</option>
          <option value="disabled">Disabled only</option>
        </select>
        <span className="ml-auto text-xs text-slate-400 shrink-0">
          {filtered.length} of {features.length} features
        </span>
      </div>

      {/* Group filter chips */}
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => setGroupFilter(null)}
          className={`${filterChipBase} ${!groupFilter ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
        >
          All groups
        </button>
        {GROUP_ORDER.map(g => (
          <button
            key={g}
            onClick={() => setGroupFilter(groupFilter === g ? null : g)}
            className={`${filterChipBase} ${groupFilter === g ? GROUP_ACTIVE[g] : GROUP_CHIP[g] + ' hover:opacity-80'}`}
          >
            {GROUP_LABELS[g]}
            {groupCounts[g] > 0 && (
              <span className="ml-1.5 opacity-70">{groupCounts[g]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Audience + context chips */}
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Audience:</span>
          {(['all', 'b2b', 'b2c', 'both'] as const).map(a => (
            <button
              key={a}
              onClick={() => setAudFilter(a === 'all' ? null : (audFilter === a ? null : a))}
              className={`${filterChipBase} ${
                (a === 'all' && !audFilter) || audFilter === a
                  ? a === 'b2b' ? 'bg-amber-500 text-white border-amber-500'
                    : a === 'b2c' ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'bg-slate-700 text-white border-slate-700'
                  : a === 'b2b' ? AUD_PILL.b2b + ' hover:opacity-80'
                  : a === 'b2c' ? AUD_PILL.b2c + ' hover:opacity-80'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {a === 'all' ? 'All' : AUD_LABELS[a]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Context:</span>
          {(['all', 'any', 'logged_in', 'b2b'] as const).map(c => (
            <button
              key={c}
              onClick={() => setCtxFilter(c === 'all' ? null : (ctxFilter === c ? null : c))}
              className={`${filterChipBase} ${
                (c === 'all' && !ctxFilter) || ctxFilter === c
                  ? c === 'logged_in' ? 'bg-emerald-600 text-white border-emerald-600'
                    : c === 'b2b' ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-slate-700 text-white border-slate-700'
                  : c === 'logged_in' ? CTX_PILL.logged_in + ' hover:opacity-80'
                  : c === 'b2b' ? CTX_PILL.b2b + ' hover:opacity-80'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {c === 'all' ? 'All' : CTX_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Importance filter chips */}
      <div className="mb-5 flex flex-wrap gap-2 items-center">
        <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Importance:</span>
        <button
          onClick={() => setImpFilter(null)}
          className={`${filterChipBase} ${!impFilter ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
        >
          All
        </button>
        {(['P0','P1','P2','P3'] as const).map(p => (
          <button
            key={p}
            onClick={() => setImpFilter(impFilter === p ? null : p)}
            className={`${filterChipBase} ${impFilter === p ? IMP_ACTIVE[p] : IMP_PILL[p] + ' hover:opacity-80'}`}
          >
            {IMP_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2">
        <span className="text-xs font-semibold text-slate-500">Bulk:</span>
        <select
          value={bulkGroup}
          onChange={e => setBulkGroup(e.target.value)}
          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
        >
          <option value="">Select group…</option>
          {GROUP_ORDER.map(g => (
            <option key={g} value={g}>{GROUP_LABELS[g]}</option>
          ))}
        </select>
        <button
          disabled={!bulkGroup}
          onClick={() => { if (bulkGroup) void bulkToggle(bulkGroup, true); }}
          className="rounded border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-30"
        >
          Enable all
        </button>
        <button
          disabled={!bulkGroup}
          onClick={() => { if (bulkGroup) void bulkToggle(bulkGroup, false); }}
          className="rounded border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30"
        >
          Disable all
        </button>
      </div>

      {/* Feature matrix */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          Loading features…
        </div>
      ) : byGroup.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          No features match the current filters.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {byGroup.map(([group, rows], gi) => {
            const enabledCount = rows.filter(f => f.enabled).length;
            return (
              <div key={group}>
                <div className={`flex items-center gap-3 px-5 py-3 ${gi > 0 ? 'border-t border-slate-100' : ''} bg-slate-50`}>
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${GROUP_CHIP[group]}`}>
                    {GROUP_LABELS[group]}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {enabledCount} / {rows.length} enabled
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {rows.map(f => {
                    const locked     = isLocked(f);
                    const critical   = isCritical(f);
                    const imp        = f.importance_level ?? 'P2';
                    const isExpanded = expanded[f.feature_key] ?? false;
                    const svgKey     = SVG_KEY_MAP[f.feature_key];
                    const svgHtml    = svgKey ? SF_SVG_PREVIEWS[svgKey] : null;
                    const detail     = SF_DETAIL[f.feature_key] ?? null;

                    return (
                      <div
                        key={f.feature_key}
                        className={`px-5 py-4 transition-colors ${
                          locked ? 'bg-red-50/30 hover:bg-red-50/50' :
                          critical ? 'hover:bg-amber-50/30' :
                          'hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Toggle */}
                          <button
                            onClick={() => handleToggleAttempt(f, !f.enabled)}
                            disabled={locked || savingKey === f.feature_key}
                            title={
                              locked ? getLockReason(f) :
                              critical ? 'Critical feature — requires confirmation to change' :
                              f.enabled ? 'Click to disable' : 'Click to enable'
                            }
                            className={`relative mt-0.5 flex-none rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                              locked ? 'opacity-40 cursor-not-allowed' :
                              savingKey === f.feature_key ? 'opacity-50 cursor-wait' :
                              'cursor-pointer'
                            } ${f.enabled ? (locked ? 'bg-slate-400' : 'bg-emerald-500') : 'bg-slate-200'}`}
                            style={{ width: 40, height: 22 }}
                          >
                            <span
                              className={`absolute top-0.5 block h-[18px] w-[18px] rounded-full bg-white shadow transition-transform duration-200 ${
                                f.enabled ? 'translate-x-[20px]' : 'translate-x-0.5'
                              }`}
                            />
                          </button>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                              {locked && (
                                <span title={getLockReason(f)} className="cursor-help text-sm leading-none">🔒</span>
                              )}
                              {!locked && critical && (
                                <span title="Critical feature — requires confirmation to change" className="cursor-help text-sm leading-none">⚠️</span>
                              )}
                              <p className={`text-sm font-semibold ${locked ? 'text-slate-500' : 'text-slate-800'}`}>
                                {f.label ?? f.feature_key}
                              </p>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">{f.feature_key}</span>
                              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${IMP_PILL[imp] ?? IMP_PILL.P2}`}>
                                {IMP_LABELS[imp] ?? imp}
                              </span>
                              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${GROUP_CHIP[f.group_key as GroupKey] ?? GROUP_CHIP.system}`}>
                                {GROUP_LABELS[f.group_key as GroupKey] ?? f.group_key}
                              </span>
                              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${AUD_PILL[f.audience] ?? AUD_PILL.both}`}>
                                {AUD_LABELS[f.audience] ?? f.audience}
                              </span>
                              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${CTX_PILL[f.user_context] ?? CTX_PILL.any}`}>
                                {CTX_LABELS[f.user_context] ?? f.user_context}
                              </span>
                              {locked && (
                                <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                                  LOCKED
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500">{f.description}</p>

                            {locked && (
                              <p className="mt-1 text-[11px] text-red-500 font-medium">{getLockReason(f)}</p>
                            )}

                            {isExpanded && (detail || svgHtml) && (
                              <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 space-y-2">
                                {detail && <p className="text-[11px] text-slate-600 leading-relaxed">{detail}</p>}
                                {svgHtml && (
                                  <div className="mt-2 overflow-x-auto" dangerouslySetInnerHTML={{ __html: svgHtml }} />
                                )}
                              </div>
                            )}

                            {(detail || svgHtml) && (
                              <button
                                onClick={() => setExpanded(p => ({ ...p, [f.feature_key]: !p[f.feature_key] }))}
                                className="mt-1 flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                <span className={`inline-block transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                                {isExpanded ? 'Less info' : 'More info'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* Confirmation modal for critical features */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <path d="M12 9v4"/><path d="M12 17h.01"/>
                </svg>
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-slate-900">Critical Feature Change</h2>
                <p className="text-[12px] text-slate-500 mt-0.5">This action requires confirmation</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 mb-4 border border-slate-100">
              <div className="text-[11px] text-slate-500 mb-1">
                You are about to{' '}
                <span className={`font-bold ${confirmModal.newValue ? 'text-emerald-600' : 'text-red-600'}`}>
                  {confirmModal.newValue ? 'ENABLE' : 'DISABLE'}
                </span>:
              </div>
              <div className="text-[14px] font-semibold text-slate-800">
                {confirmModal.feature.label ?? confirmModal.feature.feature_key}
              </div>
              {confirmModal.feature.description && (
                <div className="text-[11px] text-slate-500 mt-1">{confirmModal.feature.description}</div>
              )}
            </div>

            <div className={`text-[12px] leading-relaxed mb-4 p-3 rounded-lg border ${
              confirmModal.newValue
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                : 'bg-red-50 border-red-100 text-red-800'
            }`}>
              {getImpactWarning(confirmModal.feature.feature_key, confirmModal.newValue)}
            </div>

            <div className="mb-4">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Type <span className="text-blue-600 font-mono">CONFIRM</span> to proceed
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && confirmText === 'CONFIRM') {
                    void doToggle(confirmModal.feature, confirmModal.newValue);
                    setConfirmModal(null); setConfirmText('');
                  }
                  if (e.key === 'Escape') { setConfirmModal(null); setConfirmText(''); }
                }}
                placeholder="CONFIRM"
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setConfirmModal(null); setConfirmText(''); }}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={confirmText !== 'CONFIRM'}
                onClick={() => {
                  if (confirmText === 'CONFIRM') {
                    void doToggle(confirmModal.feature, confirmModal.newValue);
                    setConfirmModal(null); setConfirmText('');
                  }
                }}
                className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-600 transition-colors"
              >
                Confirm Change →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
