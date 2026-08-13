'use client';
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';

// SY036 — Email Style Library. Governing doc: BOP_COMM_CENTER_PLAN.md §1.
// Lists the 7 master MJML layouts (platform defaults, tenant_id=0) plus any
// tenant-specific override, and the branding token editor for the selected
// tenant. Mirrors SY003 Tenant Management's structure/styling.

const lbl = 'mb-1 block text-xs font-semibold text-slate-500';
const inp = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const Card = ({ children }: any) => <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>;

const ALL_STYLE_CODES = ['corporate', 'premium_automotive', 'minimal', 'marketplace', 'dark', 'gradient', 'fleet'] as const;

interface StyleRow { id: string; tenant_id: number; code: string; name: string; mjml_source: string; is_active: boolean }
interface Branding {
  tenant_id?: number; brand_id?: string; master_style_code?: string;
  logo_url?: string; primary_color?: string; secondary_color?: string; font_stack?: string; btn_radius?: string;
  company_name?: string; address?: string; domain?: string; support_email?: string; unsub_url?: string;
}

export default function CM001Page() {
  const { unit } = useScope();
  const tid = unit.id;
  const [styles, setStyles] = useState<StyleRow[]>([]);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }
  function set(k: keyof Branding, v: any) { setBranding((p: any) => ({ ...(p ?? {}), [k]: v })); }

  const load = useCallback(() => {
    if (tid === null) return;
    void fetch(`/api/bop/comm/styles?tenant=${tid}`).then(r => r.json()).then(j => setStyles(j.styles ?? []));
    void fetch(`/api/bop/comm/branding?tenant=${tid}&brand=default`).then(r => r.json()).then(j => setBranding(j.branding));
  }, [tid]);
  useEffect(() => { load(); }, [load]);

  async function saveBranding() {
    if (!branding) return;
    setSaving(true);
    const j = await fetch('/api/bop/comm/branding', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...branding, tenant_id: tid, brand_id: 'default' }),
    }).then(r => r.json());
    setSaving(false);
    showToast(j.error ? '✗ ' + j.error : '✓ Branding saved');
  }

  // Row per style code: platform default always shown; tenant override shown
  // alongside if one exists, so the shadowing relationship is visible, not implicit.
  const rowsByCode = ALL_STYLE_CODES.map(code => ({
    code,
    platformRow: styles.find(s => s.tenant_id === 0 && s.code === code) ?? null,
    tenantRow: tid !== null ? styles.find(s => s.tenant_id === tid && s.code === code) ?? null : null,
  }));

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <ScreenHeader title="Email Style Library" description="7 master MJML layouts + per-brand token editor — CM001" />

      </div>

      {toast && <div className="mb-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">{toast}</div>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Master styles */}
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Master styles</h2>
          <p className="mb-4 text-xs text-slate-400">
            Platform defaults ship seeded (Corporate, Premium Automotive live — 5 more planned per BOP_COMM_CENTER_PLAN.md §14).
            A tenant row shadows the platform default for that code without deleting it — every other tenant keeps using the default.
          </p>
          <div className="space-y-2">
            {rowsByCode.map(({ code, platformRow, tenantRow }) => (
              <div key={code} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">{code}</span>
                  {platformRow
                    ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">seeded</span>
                    : <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">not yet built</span>}
                </div>
                {tenantRow && (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-600">
                    <span>⚠</span><span>This tenant has its own override — the platform default above is shadowed, not deleted, for this tenant only.</span>
                  </div>
                )}
                {platformRow && <div className="mt-1 text-[11px] text-slate-400">{platformRow.mjml_source.length.toLocaleString()} chars · {platformRow.is_active ? 'active' : 'inactive'}</div>}
              </div>
            ))}
          </div>
        </Card>

        {/* Branding editor */}
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Branding — brand: default</h2>
          <p className="mb-4 text-xs text-slate-400">Token values ($LOGO_URL, $PRIMARY, etc.) injected into whichever master style a template selects.</p>
          {branding && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Company name</label><input className={inp} value={branding.company_name ?? ''} onChange={e => set('company_name', e.target.value)} /></div>
                <div><label className={lbl}>Domain</label><input className={inp} value={branding.domain ?? ''} onChange={e => set('domain', e.target.value)} /></div>
                <div><label className={lbl}>Logo URL</label><input className={inp} value={branding.logo_url ?? ''} onChange={e => set('logo_url', e.target.value)} /></div>
                <div><label className={lbl}>Font stack</label><input className={inp} value={branding.font_stack ?? ''} onChange={e => set('font_stack', e.target.value)} placeholder="Helvetica, Arial, sans-serif" /></div>
                <div><label className={lbl}>Primary color</label><input className={inp} value={branding.primary_color ?? ''} onChange={e => set('primary_color', e.target.value)} placeholder="#2b6cff" /></div>
                <div><label className={lbl}>Secondary color</label><input className={inp} value={branding.secondary_color ?? ''} onChange={e => set('secondary_color', e.target.value)} /></div>
                <div><label className={lbl}>Button radius</label><input className={inp} value={branding.btn_radius ?? ''} onChange={e => set('btn_radius', e.target.value)} placeholder="6px" /></div>
                <div><label className={lbl}>Support email</label><input className={inp} value={branding.support_email ?? ''} onChange={e => set('support_email', e.target.value)} /></div>
                <div className="col-span-2"><label className={lbl}>Address</label><input className={inp} value={branding.address ?? ''} onChange={e => set('address', e.target.value)} /></div>
                <div className="col-span-2"><label className={lbl}>Unsubscribe URL</label><input className={inp} value={branding.unsub_url ?? ''} onChange={e => set('unsub_url', e.target.value)} /></div>
              </div>
              <div className="mt-5 flex justify-end">
                <button onClick={() => { void saveBranding(); }} disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save branding'}
                </button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
