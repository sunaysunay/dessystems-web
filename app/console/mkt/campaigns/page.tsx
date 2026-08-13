'use client';
// app/console/mkt/campaigns/page.tsx — MK006 AI Marketing Cockpit (3-stage)
import { useEffect, useState } from 'react';

type Channel = { channel: string; label: string; char_limit: number | null; supports_image: boolean };
type Brand = { tenant_id: number; entity: string; tone: string };
type Ctx = Record<string, any>;
type Output = {
  id: string; channel: string; locale: string; subject?: string; body: string;
  hashtags: string[]; cta?: string; image_prompt?: string; status: string; verify_warnings: any[];
};

const LOCALES = ['nl', 'en', 'de', 'fr', 'tr'];
const OBJECTIVES = ['new_arrival', 'lead_gen', 'price_drop', 'feature_highlight', 'brand_awareness'];

export default function CockpitPage() {
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [tenant, setTenant] = useState<number>(0);

  // brief
  const [sourceType, setSourceType] = useState<'listing' | 'manual'>('listing');
  const [listingQ, setListingQ] = useState('');
  const [listingHits, setListingHits] = useState<any[]>([]);
  const [listingId, setListingId] = useState<string | null>(null);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [manualPrompt, setManualPrompt] = useState('');
  const [objective, setObjective] = useState('new_arrival');
  const [audience, setAudience] = useState('');
  const [selChannels, setSelChannels] = useState<string[]>(['linkedin', 'facebook', 'instagram']);
  const [selLocales, setSelLocales] = useState<string[]>(['nl', 'en']);

  // gen
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [, setCampaignId] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    void fetch('/api/bop/mkt/meta').then(r => r.json()).then(d => {
      setChannels(d.channels || []); setBrands(d.brand_profiles || []);
      if (d.brand_profiles?.[0]) setTenant(d.brand_profiles[0].tenant_id);
    });
  }, []);

  // listing search (debounced)
  useEffect(() => {
    if (sourceType !== 'listing') return;
    const t = setTimeout(() => {
      void fetch(`/api/bop/mkt/meta?listing_q=${encodeURIComponent(listingQ)}&tenant_id=${tenant}&locale=${selLocales[0] || 'nl'}`)
        .then(r => r.json()).then(d => setListingHits(d.listings || []));
    }, 250);
    return () => clearTimeout(t);
  }, [listingQ, tenant, sourceType, selLocales]);

  async function pickListing(id: string) {
    setListingId(id);
    const d = await (await fetch(`/api/bop/mkt/meta?listing_id=${id}&locale=${selLocales[0] || 'nl'}`)).json();
    setCtx(d.context);
  }

  const canGenerate = tenant && selChannels.length && selLocales.length &&
    (sourceType === 'manual' ? manualPrompt.trim().length > 3 : !!listingId);

  async function generate() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/bop/mkt/generate', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant, source_type: sourceType, listing_source: 'bop',
          listing_id: sourceType === 'listing' ? listingId : null,
          manual_prompt: sourceType === 'manual' ? manualPrompt : null,
          objective, target_audience: audience, channels: selChannels, locales: selLocales, verify: true,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'generation failed');
      setCampaignId(d.campaign_id); setOutputs(d.outputs); setActiveTab(0); setStage(2);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function patchOutput(id: string, patch: any) {
    const r = await fetch(`/api/bop/mkt/outputs/${id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch),
    });
    const d = await r.json();
    if (r.ok) setOutputs(os => os.map(o => o.id === id ? d.output : o));
    return r.ok;
  }

  async function publish(id: string, platform: string) {
    const r = await fetch('/api/bop/mkt/publish', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ output_id: id, platform }),
    });
    const d = await r.json();
    if (!r.ok) { alert(d.error || 'publish failed'); return; }
    setOutputs(os => os.map(o => o.id === id ? { ...o, status: 'published' } : o));
  }

  const limitFor = (ch: string) => channels.find(c => c.channel === ch)?.char_limit ?? null;
  const approvedCount = outputs.filter(o => o.status === 'approved' || o.status === 'published').length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-slate-800">AI Marketing Cockpit <span className="text-xs font-normal text-slate-400">MK006</span></h1>
        <p className="text-sm text-slate-500">Turn a listing into multi-channel marketing — grounded, reviewed, published.</p>
      </header>

      {/* stepper */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        {['Brief', 'Review', 'Publish'].map((s, i) => (
          <div key={s} className={`px-3 py-1 rounded-full ${stage === i + 1 ? 'bg-blue-600 text-white' : stage > i + 1 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
            {i + 1}. {s}
          </div>
        ))}
      </div>

      {err && <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

      {/* ── STAGE 1 · BRIEF ─────────────────────────────────────────── */}
      {stage === 1 && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Entity / tenant</label>
              <select value={tenant} onChange={e => setTenant(Number(e.target.value))} className="w-full rounded border-slate-300 text-sm">
                {brands.map(b => <option key={b.tenant_id} value={b.tenant_id}>{b.entity} ({b.tenant_id})</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              {(['listing', 'manual'] as const).map(s => (
                <button key={s} onClick={() => setSourceType(s)} className={`px-3 py-1.5 rounded text-sm border ${sourceType === s ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 text-slate-600'}`}>
                  {s === 'listing' ? 'From listing' : 'Manual prompt'}
                </button>
              ))}
            </div>

            {sourceType === 'listing' ? (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Find listing (ref)</label>
                <input value={listingQ} onChange={e => setListingQ(e.target.value)} placeholder="BOP-2026-…" className="w-full rounded border-slate-300 text-sm" />
                {listingHits.length > 0 && !listingId && (
                  <ul className="mt-1 border rounded divide-y max-h-48 overflow-auto text-sm">
                    {listingHits.map(h => (
                      <li key={h.id}><button onClick={() => { void pickListing(h.id); }} className="w-full text-left px-3 py-2 hover:bg-slate-50">
                        <span className="font-medium">{h.ref_no}</span> — {h.title}
                      </button></li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Prompt</label>
                <textarea value={manualPrompt} onChange={e => setManualPrompt(e.target.value)} rows={4} className="w-full rounded border-slate-300 text-sm" placeholder="What should this campaign say?" />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Objective</label>
              <select value={objective} onChange={e => setObjective(e.target.value)} className="w-full rounded border-slate-300 text-sm">
                {OBJECTIVES.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Target audience (optional)</label>
              <input value={audience} onChange={e => setAudience(e.target.value)} className="w-full rounded border-slate-300 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Channels</label>
              <div className="flex flex-wrap gap-2">
                {channels.map(c => (
                  <button key={c.channel} onClick={() => setSelChannels(s => s.includes(c.channel) ? s.filter(x => x !== c.channel) : [...s, c.channel])}
                    className={`px-2.5 py-1 rounded text-xs border ${selChannels.includes(c.channel) ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 text-slate-600'}`}>{c.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Languages</label>
              <div className="flex gap-2">
                {LOCALES.map(l => (
                  <button key={l} onClick={() => setSelLocales(s => s.includes(l) ? s.filter(x => x !== l) : [...s, l])}
                    className={`px-2.5 py-1 rounded text-xs border uppercase ${selLocales.includes(l) ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 text-slate-600'}`}>{l}</button>
                ))}
              </div>
            </div>

            <button disabled={!canGenerate || busy} onClick={() => { void generate(); }}
              className="w-full rounded bg-blue-600 py-2 text-sm font-medium text-white disabled:opacity-40">
              {busy ? 'Generating…' : `Generate ${selChannels.length * selLocales.length} assets`}
            </button>
          </div>

          {/* grounding card */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium text-slate-500 mb-2">Grounding — only these facts reach the AI</div>
            {sourceType === 'manual' ? (
              <p className="text-sm text-slate-400">Manual mode: the AI uses only your prompt above.</p>
            ) : !ctx ? (
              <p className="text-sm text-slate-400">Pick a listing to preview its grounded facts.</p>
            ) : (
              <dl className="text-sm space-y-1">
                {Object.entries(ctx).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="w-28 shrink-0 text-slate-400">{k}</dt>
                    <dd className="text-slate-700 break-words">{Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      )}

      {/* ── STAGE 2 · REVIEW ────────────────────────────────────────── */}
      {stage === 2 && (
        <div>
          <div className="flex flex-wrap gap-1 border-b border-slate-200 mb-4">
            {outputs.map((o, i) => (
              <button key={o.id} onClick={() => setActiveTab(i)}
                className={`px-3 py-1.5 text-sm -mb-px border-b-2 ${activeTab === i ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>
                {o.channel} · {o.locale.toUpperCase()}
                {o.status === 'approved' && ' ✓'}
                {o.verify_warnings?.length ? <span className="ml-1 text-amber-500">!</span> : null}
              </button>
            ))}
          </div>
          {outputs[activeTab] && <OutputEditor key={outputs[activeTab].id} o={outputs[activeTab]} limit={limitFor(outputs[activeTab].channel)} onSave={patchOutput} />}
          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setStage(1)} className="text-sm text-slate-500">← Back to brief</button>
            <div className="text-sm text-slate-500">{approvedCount}/{outputs.length} approved</div>
            <button disabled={!approvedCount} onClick={() => setStage(3)} className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-40">Continue to publish →</button>
          </div>
        </div>
      )}

      {/* ── STAGE 3 · PUBLISH ───────────────────────────────────────── */}
      {stage === 3 && (
        <div className="space-y-3">
          {outputs.filter(o => o.status === 'approved' || o.status === 'published').map(o => (
            <div key={o.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-slate-700">{o.channel} · {o.locale.toUpperCase()}</div>
                <span className={`text-xs px-2 py-0.5 rounded ${o.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{o.status}</span>
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-4">{o.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => { void navigator.clipboard.writeText([o.subject, o.body, (o.hashtags || []).join(' ')].filter(Boolean).join('\n\n')); }} className="rounded border border-slate-300 px-3 py-1 text-xs">Copy</button>
                <button onClick={() => download(o)} className="rounded border border-slate-300 px-3 py-1 text-xs">Download</button>
                <button onClick={() => { void publish(o.id, 'telegram'); }} disabled={o.status === 'published'} className="rounded bg-sky-600 text-white px-3 py-1 text-xs disabled:opacity-40">Send to Telegram</button>
                <button onClick={() => { void publish(o.id, 'blog'); }} disabled={o.status === 'published'} className="rounded bg-slate-700 text-white px-3 py-1 text-xs disabled:opacity-40">Post to blog</button>
              </div>
            </div>
          ))}
          <button onClick={() => setStage(2)} className="text-sm text-slate-500">← Back to review</button>
        </div>
      )}
    </div>
  );
}

function OutputEditor({ o, limit, onSave }: { o: Output; limit: number | null; onSave: (id: string, p: any) => Promise<boolean> }) {
  const [subject, setSubject] = useState(o.subject || '');
  const [body, setBody] = useState(o.body);
  const [cta, setCta] = useState(o.cta || '');
  const [tags, setTags] = useState((o.hashtags || []).join(' '));
  const [saving, setSaving] = useState(false);
  const over = limit !== null && body.length > limit;
  return (
    <div className="space-y-3">
      {o.verify_warnings?.length > 0 && (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚠ Unverified claims: {o.verify_warnings.map((w: any) => w.claim).join('; ')}
        </div>
      )}
      <div>
        <label className="block text-xs text-slate-500 mb-1">Subject / headline</label>
        <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full rounded border-slate-300 text-sm" />
      </div>
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Body</span>
          <span className={over ? 'text-red-600 font-medium' : ''}>{body.length}{limit ? ` / ${limit}` : ''}</span>
        </div>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={8} className={`w-full rounded text-sm ${over ? 'border-red-400' : 'border-slate-300'}`} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-xs text-slate-500 mb-1">CTA</label><input value={cta} onChange={e => setCta(e.target.value)} className="w-full rounded border-slate-300 text-sm" /></div>
        <div><label className="block text-xs text-slate-500 mb-1">Hashtags</label><input value={tags} onChange={e => setTags(e.target.value)} className="w-full rounded border-slate-300 text-sm" /></div>
      </div>
      <div className="flex gap-2">
        <button disabled={saving} onClick={() => { void (async () => { setSaving(true); await onSave(o.id, { subject, body, cta, hashtags: tags.split(/\s+/).filter(Boolean) }); setSaving(false); })(); }}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm">Save edits</button>
        <button disabled={saving} onClick={() => { void (async () => { setSaving(true); await onSave(o.id, { subject, body, cta, hashtags: tags.split(/\s+/).filter(Boolean), action: 'approve' }); setSaving(false); })(); }}
          className="rounded bg-green-600 text-white px-3 py-1.5 text-sm">Approve</button>
        {o.status === 'approved' && <span className="self-center text-xs text-green-600">approved ✓</span>}
      </div>
    </div>
  );
}

function download(o: Output) {
  const text = [`# ${o.channel} (${o.locale})`, o.subject, '', o.body, '', (o.hashtags || []).join(' '), o.cta && `\nCTA: ${o.cta}`].filter(Boolean).join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${o.channel}-${o.locale}.txt`; a.click();
}
