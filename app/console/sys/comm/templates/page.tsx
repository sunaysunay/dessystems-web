'use client';
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { BopSelect } from '@/components/BopSelect';
import { useScope } from '@/lib/scope-context';

// SY039 — Template Studio. Governing doc: BOP_COMM_CENTER_PLAN.md §1.
// Per-event template content editor: subject/blocks/CTA, master style pick,
// live preview via the 3-stage pipeline against a real bound record.

const lbl = 'mb-1 block text-xs font-semibold text-slate-500';
const inp = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const Card = ({ children, className = '' }: any) => <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>{children}</div>;

const CONTEXT_TYPES = ['vehicle', 'customer', 'invoice', 'listing', 'sell_lead', 'crm_lead', 'order', 'quotation', 'handover'] as const;
const MASTER_STYLES = ['corporate', 'premium_automotive', 'minimal', 'marketplace', 'dark', 'gradient', 'fleet'] as const;
const LOCALES = ['en', 'nl', 'de', 'fr', 'tr', 'ro', 'bg', 'el', 'es', 'it'] as const;

interface Template {
  id?: string; tenant_id: number; category: string; context_type: string; master_style_code: string;
  subject?: string; preheader?: string; block_eyebrow?: string; block_heading?: string; block_body?: string;
  cta_label?: string; cta_url_pattern?: string; locale: string; is_active: boolean;
}

const BLANK: Template = {
  tenant_id: 0, category: '', context_type: 'vehicle', master_style_code: 'corporate',
  subject: '', preheader: '', block_eyebrow: '', block_heading: '', block_body: '',
  cta_label: '', cta_url_pattern: '', locale: 'en', is_active: true,
};

export default function CM004Page() {
  const { unit } = useScope();
  const tid = unit.id;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [sampleRecordId, setSampleRecordId] = useState('');
  const [preview, setPreview] = useState<{ html: string; subject: string; missing: string[] } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [aiBusy, setAiBusy] = useState<string | null>(null); // which action is running, for a per-button spinner
  const [genLocales, setGenLocales] = useState<string[]>([]);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }
  function set(k: keyof Template, v: any) { setSelected((p: any) => ({ ...(p ?? BLANK), [k]: v })); }

  useEffect(() => {
  }, []);

  const load = useCallback(() => {
    if (tid === null) return;
    void fetch(`/api/bop/comm/templates?tenant=${tid}`).then(r => r.json()).then(j => setTemplates(j.templates ?? []));
  }, [tid]);
  useEffect(() => { load(); }, [load]);

  async function saveTemplate() {
    if (!selected) return;
    if (!selected.category || !selected.context_type) { showToast('✗ Category and context type are required'); return; }
    setSaving(true);
    const isNew = !selected.id;
    const j = await fetch('/api/bop/comm/templates', {
      method: isNew ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...selected, tenant_id: selected.tenant_id ?? tid }),
    }).then(r => r.json());
    setSaving(false);
    if (j.error) { showToast('✗ ' + j.error); return; }
    showToast('✓ Template saved');
    setPreview(null);
    load();
    if (isNew && j.template) setSelected(j.template);
  }

  // AI actions (Phase 13) — operate on Block body only, never structure/branding,
  // never persist automatically: the result replaces the field, Save is still
  // a separate explicit step (matches "AI edits editable slots pre-compile,
  // must not touch structure" — EmailComposer.spec.md §5).
  async function aiAction(action: 'improve' | 'luxury' | 'shorter') {
    if (!selected?.block_body) { showToast('✗ Write some body text first'); return; }
    setAiBusy(action);
    const j = await fetch('/api/bop/comm/ai/action', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, text: selected.block_body }),
    }).then(r => r.json());
    setAiBusy(null);
    if (j.configured === false) { showToast('✗ ' + j.error); return; }
    if (j.error) { showToast('✗ ' + j.error); return; }
    set('block_body', j.result);
    showToast('✓ AI updated the body — review, then Save');
  }

  async function generateLocales() {
    if (!selected?.id) { showToast('✗ Save the template first'); return; }
    if (!genLocales.length) { showToast('✗ Pick at least one target locale'); return; }
    setAiBusy('generate_locales');
    const j = await fetch('/api/bop/comm/ai/action', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate_locales', templateId: selected.id, targetLocales: genLocales }),
    }).then(r => r.json());
    setAiBusy(null);
    if (j.configured === false) { showToast('✗ ' + j.error); return; }
    if (j.error) { showToast('✗ ' + j.error); return; }
    showToast(`✓ Generated: ${j.created.join(', ') || 'none new'}${j.skipped.length ? ` · skipped existing: ${j.skipped.join(', ')}` : ''}`);
    load();
  }

  async function runPreview() {
    if (!selected?.category || !sampleRecordId) { showToast('✗ Save the template and enter a sample record ID first'); return; }
    setPreviewing(true);
    const j = await fetch('/api/bop/comm/compose/preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contextType: selected.context_type, recordId: sampleRecordId,
        tenantId: selected.tenant_id ?? tid, category: selected.category, locale: selected.locale,
      }),
    }).then(r => r.json());
    setPreviewing(false);
    if (j.error) { showToast('✗ ' + j.error); setPreview(null); return; }
    setPreview(j);
  }

  const grouped = templates.reduce<Record<string, Template[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <ScreenHeader title="Template Studio" description="Per-event template content — subject, blocks, CTA, smart-object placement — CM004" />
        <div className="flex items-center gap-3">
<button onClick={() => { setSelected({ ...BLANK, tenant_id: tid ?? 0 }); setPreview(null); }}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">+ New template</button>
        </div>
      </div>

      {toast && <div className="mb-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">{toast}</div>}

      <div className="grid grid-cols-12 gap-5">
        {/* Template list */}
        <Card className="col-span-3">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Templates</h2>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            {Object.entries(grouped).map(([category, rows]) => (
              <div key={category}>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{category}</div>
                {rows.map(t => (
                  <button key={`${t.tenant_id}-${t.locale}`} onClick={() => { setSelected(t); setPreview(null); }}
                    className={`mb-1 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs ${selected?.id === t.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <span>{t.locale} · {t.master_style_code}</span>
                    {t.tenant_id === 0
                      ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">platform</span>
                      : <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">override</span>}
                  </button>
                ))}
              </div>
            ))}
            {templates.length === 0 && <p className="text-xs text-slate-400">No templates yet — create one.</p>}
          </div>
        </Card>

        {/* Editor */}
        <Card className="col-span-5">
          {!selected ? (
            <p className="text-sm text-slate-400">Select a template or create a new one.</p>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">{selected.id ? 'Edit template' : 'New template'}</h2>
                {selected.tenant_id === 0 && (
                  <span className="flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                    ⚠ Editing the platform default — affects every tenant without an override
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Category</label><input className={inp} value={selected.category} onChange={e => set('category', e.target.value)} placeholder="vehicle.offer" disabled={!!selected.id} /></div>
                <div><label className={lbl}>Locale</label><BopSelect size="md" value={selected.locale} onChange={v => set('locale', v)} options={LOCALES.map(l => ({ value: l, label: l }))} /></div>
                <div><label className={lbl}>Context type</label><BopSelect size="md" value={selected.context_type} onChange={v => set('context_type', v)} options={CONTEXT_TYPES.map(c => ({ value: c, label: c }))} /></div>
                <div><label className={lbl}>Master style</label><BopSelect size="md" value={selected.master_style_code} onChange={v => set('master_style_code', v)} options={MASTER_STYLES.map(s => ({ value: s, label: s }))} /></div>
                <div className="col-span-2"><label className={lbl}>Subject</label><input className={inp} value={selected.subject ?? ''} onChange={e => set('subject', e.target.value)} placeholder="Your {{Vehicle.Brand}} offer" /></div>
                <div className="col-span-2"><label className={lbl}>Preheader</label><input className={inp} value={selected.preheader ?? ''} onChange={e => set('preheader', e.target.value)} /></div>
                <div className="col-span-2"><label className={lbl}>Block eyebrow</label><input className={inp} value={selected.block_eyebrow ?? ''} onChange={e => set('block_eyebrow', e.target.value)} /></div>
                <div className="col-span-2"><label className={lbl}>Block heading</label><input className={inp} value={selected.block_heading ?? ''} onChange={e => set('block_heading', e.target.value)} /></div>
                <div className="col-span-2">
                  <div className="mb-1 flex items-center justify-between">
                    <label className={lbl}>Block body</label>
                    <div className="flex gap-1">
                      {(['improve', 'luxury', 'shorter'] as const).map(a => (
                        <button key={a} onClick={() => { void aiAction(a); }} disabled={aiBusy !== null}
                          className="rounded border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:border-blue-300 hover:text-blue-600 disabled:opacity-40">
                          {aiBusy === a ? '…' : `✦ ${a}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea className={`${inp} h-24`} value={selected.block_body ?? ''} onChange={e => set('block_body', e.target.value)} />
                </div>
                <div><label className={lbl}>CTA label</label><input className={inp} value={selected.cta_label ?? ''} onChange={e => set('cta_label', e.target.value)} /></div>
                <div><label className={lbl}>CTA URL pattern</label><input className={inp} value={selected.cta_url_pattern ?? ''} onChange={e => set('cta_url_pattern', e.target.value)} placeholder="/listing/{{Vehicle.Id}}" /></div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" checked={selected.is_active} onChange={e => set('is_active', e.target.checked)} id="active" />
                  <label htmlFor="active" className="text-xs text-slate-600">Active</label>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => { void saveTemplate(); }} disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save template'}
                </button>
              </div>

              {selected.id && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <label className={lbl}>Generate other locales (AI translates every field, never overwrites an existing translation)</label>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {LOCALES.filter(l => l !== selected.locale).map(l => (
                      <button key={l} onClick={() => setGenLocales(p => p.includes(l) ? p.filter(x => x !== l) : [...p, l])}
                        className={`rounded-full border px-2.5 py-1 text-[11px] ${genLocales.includes(l) ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { void generateLocales(); }} disabled={aiBusy !== null || !genLocales.length}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40">
                    {aiBusy === 'generate_locales' ? 'Generating…' : `✦ Generate ${genLocales.length || ''} translation${genLocales.length === 1 ? '' : 's'}`}
                  </button>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Live preview */}
        <Card className="col-span-4">
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Live preview</h2>
          <p className="mb-3 text-xs text-slate-400">Runs the full 3-stage pipeline against a real bound record — what's shown is what would send.</p>
          <div className="mb-3 flex gap-2">
            <input className={inp} value={sampleRecordId} onChange={e => setSampleRecordId(e.target.value)} placeholder="Sample record ID (e.g. a real listing UUID)" />
            <button onClick={() => { void runPreview(); }} disabled={previewing || !selected}
              className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              {previewing ? '…' : 'Preview'}
            </button>
          </div>
          {preview && (
            <>
              <div className="mb-2 text-xs"><span className="font-semibold text-slate-500">Subject:</span> {preview.subject}</div>
              {preview.missing.length > 0 && (
                <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  Missing (would block a real send): {preview.missing.join(', ')}
                </div>
              )}
              <iframe title="preview" srcDoc={preview.html} className="h-[50vh] w-full rounded-lg border border-slate-200" />
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
