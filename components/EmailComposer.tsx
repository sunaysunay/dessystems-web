'use client';
import { useState, useEffect, useCallback } from 'react';

// EmailComposer — reusable, context-driven. Governing docs:
// EmailComposer.spec.md (contract/pipeline) + BOP_COMM_CENTER_PLAN.md (schema,
// tenant conventions, "companyId" renamed "tenantId" throughout — plan §7).
// Embedded as a slide-over panel on module record screens (CR002, SA002/SA004,
// MP002, FI002 — plan §1) via an "Email" action button, NOT a standalone nav
// screen — matches how "Ask AI" is contextual rather than its own screen.

export type ContextType = 'vehicle' | 'customer' | 'invoice' | 'listing';

interface EmailComposerProps {
  contextType: ContextType;
  recordId: string;
  tenantId: number;
  brandId?: string;
  defaultCategory?: string;
  onSent?: (historyId: string) => void;
  onClose?: () => void;
}

interface ContextInfo {
  scope: Record<string, Record<string, string>>;
  recipients: { to: string; name: string }[];
  categories: string[];
  smartObjects: string[];
  primaryStyle: string;
}
interface Template { id: string; category: string; locale: string; subject?: string; tenant_id: number }
interface PreviewResult { html: string; subject: string; missing: string[]; recipients: { to: string; name: string }[] }

// Categories are '{contextType}.{name}' — label is just the name, prettified.
function categoryLabel(category: string): string {
  const name = category.split('.').pop() ?? category;
  return name.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
}

export default function EmailComposer({ contextType, recordId, tenantId, brandId = 'default', defaultCategory, onSent, onClose }: EmailComposerProps) {
  const [ctx, setCtx] = useState<ContextInfo | null>(null);
  const [ctxError, setCtxError] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [category, setCategory] = useState(defaultCategory ?? '');
  const [locale, setLocale] = useState('en');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipientOverride, setRecipientOverride] = useState('');
  const [error, setError] = useState('');
  const [sentId, setSentId] = useState('');

  // ContextRail data — loader-only, independent of template selection.
  useEffect(() => {
    setCtxError('');
    void fetch(`/api/bop/comm/context?contextType=${contextType}&recordId=${recordId}&tenantId=${tenantId}`)
      .then(r => r.json())
      .then(j => {
        if (j.error) { setCtxError(j.error); return; }
        setCtx(j);
        if (!category && j.categories?.[0]) setCategory(j.categories[0]);
      });
  }, [contextType, recordId, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Templates filtered to this context's allowed categories (both use the
  // same '{contextType}.{name}' naming, so a direct includes() check works).
  useEffect(() => {
    void fetch(`/api/bop/comm/templates?tenant=${tenantId}`).then(r => r.json())
      .then(j => setTemplates((j.templates ?? []).filter((t: Template) => ctx?.categories?.includes(t.category))));
  }, [tenantId, ctx]);

  const runPreview = useCallback(() => {
    if (!category) return;
    setPreviewing(true); setError('');
    void fetch('/api/bop/comm/compose/preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contextType, recordId, tenantId, category, locale }),
    }).then(r => r.json()).then(j => {
      setPreviewing(false);
      if (j.error) { setError(j.error); setPreview(null); return; }
      setPreview(j);
    });
  }, [contextType, recordId, tenantId, category, locale]);

  useEffect(() => { if (category) runPreview(); }, [category, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    setSending(true); setError('');
    const toOverride = recipientOverride.trim()
      ? [{ to: recipientOverride.trim(), name: recipientOverride.trim() }]
      : undefined;
    const j = await fetch('/api/bop/comm/compose/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contextType, recordId, tenantId, category, locale, brandId, toOverride }),
    }).then(r => r.json());
    setSending(false);
    if (j.error) { setError(j.error + (j.missing ? `: ${j.missing.join(', ')}` : '')); return; }
    setSentId(j.historyId);
    onSent?.(j.historyId);
  }

  const matchingTemplates = templates.filter(t => t.category === category);
  const hasTemplateForCategory = matchingTemplates.length > 0;
  const recipients = preview?.recipients?.length ? preview.recipients : ctx?.recipients ?? [];
  const canSend = !!category && (recipients.length > 0 || recipientOverride.trim().length > 0) && (preview?.missing?.length ?? 1) === 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="flex h-full w-full max-w-5xl overflow-hidden bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* ContextRail */}
        <div className="w-64 shrink-0 border-r border-slate-200 bg-slate-50 p-4 overflow-y-auto">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{contextType}</h3>
          {ctxError && <p className="text-xs text-red-600">{ctxError}</p>}
          {ctx && Object.entries(ctx.scope).map(([ns, kv]) => (
            <div key={ns} className="mb-4">
              <div className="mb-1 text-[11px] font-semibold text-slate-500">{ns}</div>
              {Object.entries(kv).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="text-xs text-slate-700"><span className="text-slate-400">{k}:</span> {v.length > 40 ? v.slice(0, 40) + '…' : v}</div>
              ))}
            </div>
          ))}
        </div>

        {/* ComposePane */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Compose email</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Category</label>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={category} onChange={e => setCategory(e.target.value)}>
                {(ctx?.categories ?? []).map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Locale</label>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={locale} onChange={e => setLocale(e.target.value)}>
                {['en', 'nl', 'de', 'fr', 'tr'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {!hasTemplateForCategory && category && (
            <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              No template exists yet for "{category}" — create one in Template Studio (CM004) first.
            </div>
          )}

          {preview && (
            <>
              <div className="mb-2 text-xs"><span className="font-semibold text-slate-500">Subject:</span> {preview.subject}</div>
              {preview.missing.length > 0 && (
                <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">Missing (blocks send): {preview.missing.join(', ')}</div>
              )}
              <iframe title="preview" srcDoc={preview.html} className="h-[55vh] w-full rounded-lg border border-slate-200" />
            </>
          )}
          {previewing && <p className="text-xs text-slate-400">Rendering preview…</p>}
        </div>

        {/* SendRail */}
        <div className="w-72 shrink-0 border-l border-slate-200 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Send</h3>

          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-slate-500">Recipient</label>
            {recipients.length > 0 ? (
              recipients.map(r => <div key={r.to} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">{r.name} · {r.to}</div>)
            ) : (
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" placeholder="email@example.com"
                value={recipientOverride} onChange={e => setRecipientOverride(e.target.value)} />
            )}
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs font-semibold text-slate-500">AI actions</label>
            <div className="space-y-1.5">
              {['Improve', 'Make more luxury', 'Shorten', 'Translate'].map(a => (
                <button key={a} disabled className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-left text-xs text-slate-400" title="AI editing lives in Template Studio (CM004), where content persists — this composer previews existing templates">
                  ✦ {a}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
          {sentId && <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">✓ Sent — history #{sentId.slice(0, 8)}</div>}

          <button onClick={() => { void send(); }} disabled={!canSend || sending}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
            {sending ? 'Sending…' : 'Send email'}
          </button>
        </div>
      </div>
    </div>
  );
}
