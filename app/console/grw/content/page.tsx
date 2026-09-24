'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

type Channel = { channel: string; label: string; char_limit: number | null; supports_image: boolean };
type Client = { id: string; name: string; client_type: string; brand_tone: string | null; brand_description: string | null; channels: string[]; languages: string[]; tenant_id: number | null; website: string | null; industry: string | null };
type Output = {
  id: string; channel: string; locale: string; subject?: string; body: string;
  hashtags: string[]; cta?: string; image_prompt?: string; status: string; verify_warnings: any[];
};

const ALL_CHANNELS = ['linkedin', 'facebook', 'instagram', 'x', 'email', 'telegram', 'blog', 'google_business'];
const LOCALES = ['nl', 'en', 'de', 'fr', 'tr', 'es', 'it', 'ro', 'bg', 'el'];
const OBJECTIVES = ['brand_awareness', 'lead_gen', 'promotion', 'seasonal', 'service_highlight', 'new_arrival', 'price_drop', 'event'];

export default function ContentStudioPage() {
  const [stage, setStage] = useState<'brief' | 'review' | 'publish'>('brief');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showNewClient, setShowNewClient] = useState(false);

  // Client form
  const [newName, setNewName] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newTone, setNewTone] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Brief
  const [clientId, setClientId] = useState('');
  const [sourceType, setSourceType] = useState<'manual' | 'listing'>('manual');
  const [prompt, setPrompt] = useState('');
  const [listingQ, setListingQ] = useState('');
  const [listingId, setListingId] = useState<string | null>(null);
  const [listingHits, setListingHits] = useState<any[]>([]);
  const [objective, setObjective] = useState('promotion');
  const [audience, setAudience] = useState('');
  const [selChannels, setSelChannels] = useState<string[]>(['email', 'linkedin', 'facebook']);
  const [selLocales, setSelLocales] = useState<string[]>(['nl', 'en']);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Outputs
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/bop/mkt/meta').then(r => r.json()).then(d => setChannels(d.channels || []));
    fetch('/api/bop/grw/clients').then(r => r.json()).then(d => setClients(d.clients || [])).catch(() => {});
  }, []);

  // Listing search
  useEffect(() => {
    if (sourceType !== 'listing' || !listingQ) return;
    const client = clients.find(c => c.id === clientId);
    const tenantId = client?.tenant_id || 200;
    const t = setTimeout(() => {
      fetch(`/api/bop/mkt/meta?listing_q=${encodeURIComponent(listingQ)}&tenant_id=${tenantId}&locale=${selLocales[0] || 'nl'}`)
        .then(r => r.json()).then(d => setListingHits(d.listings || []));
    }, 300);
    return () => clearTimeout(t);
  }, [listingQ, clientId, sourceType, selLocales, clients]);

  async function saveClient() {
    const r = await fetch('/api/bop/grw/clients', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newName, website: newWebsite, industry: newIndustry, brand_tone: newTone, brand_description: newDesc, client_type: 'external', channels: selChannels, languages: selLocales }),
    });
    const d = await r.json();
    if (r.ok && d.client) {
      setClients(cs => [...cs, d.client]);
      setClientId(d.client.id);
      setShowNewClient(false);
      setNewName(''); setNewWebsite(''); setNewIndustry(''); setNewTone(''); setNewDesc('');
    }
  }

  async function generate() {
    setBusy(true); setErr(null);
    const client = clients.find(c => c.id === clientId);
    const tenantId = client?.tenant_id || 200;
    const name = client?.name || 'Campaign';
    const brandContext = client?.brand_description ? `\n\nBusiness context: ${client.brand_description}\nBrand tone: ${client.brand_tone || 'professional'}\nIndustry: ${client.industry || 'general'}\nWebsite: ${client.website || 'n/a'}` : '';
    try {
      const r = await fetch('/api/bop/mkt/generate', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          source_type: sourceType,
          listing_source: 'bop',
          listing_id: sourceType === 'listing' ? listingId : null,
          manual_prompt: sourceType === 'manual' ? prompt + brandContext : null,
          name: `${name} — ${objective.replace(/_/g, ' ')}`,
          objective,
          target_audience: audience,
          channels: selChannels,
          locales: selLocales,
          verify: true,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'generation failed');
      setCampaignId(d.campaign_id);
      setOutputs(d.outputs || []);
      setActiveTab(0);
      setStage('review');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function patchOutput(id: string, patch: any) {
    const r = await fetch(`/api/bop/mkt/outputs/${id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch),
    });
    const d = await r.json();
    if (r.ok) setOutputs(os => os.map(o => o.id === id ? d.output : o));
  }

  async function publishOutput(id: string, platform: string) {
    const r = await fetch('/api/bop/mkt/publish', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ output_id: id, platform }),
    });
    if (!r.ok) { const d = await r.json(); alert(d.error || 'publish failed'); return; }
    setOutputs(os => os.map(o => o.id === id ? { ...o, status: 'published' } : o));
  }

  const canGenerate = selChannels.length > 0 && selLocales.length > 0 &&
    (sourceType === 'manual' ? prompt.trim().length > 5 : !!listingId);
  const approvedCount = outputs.filter(o => o.status === 'approved' || o.status === 'published').length;

  return (
    <div className="space-y-6">
      <ScreenHeader />

      {/* Stage indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['brief', 'review', 'publish'] as const).map((s, i) => (
          <button key={s} onClick={() => { if (s === 'brief' || (s === 'review' && outputs.length) || (s === 'publish' && approvedCount)) setStage(s); }}
            className={`px-3 py-1 rounded-full capitalize transition-colors ${stage === s ? 'bg-indigo-600 text-white' : 'bg-card border border-border text-muted hover:text-current'}`}>
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {err && <div className="rounded border border-red-300 bg-red-500/10 px-3 py-2 text-sm text-red-400">{err}</div>}

      {/* ── BRIEF ── */}
      {stage === 'brief' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {/* Client selector */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Client / Business</label>
              <div className="flex gap-2">
                <select value={clientId} onChange={e => { setClientId(e.target.value); setShowNewClient(false); }}
                  className="flex-1 rounded border border-border bg-card px-3 py-1.5 text-sm">
                  <option value="">Select client...</option>
                  <optgroup label="DES Tenants">
                    {clients.filter(c => c.client_type === 'des_tenant').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="External Clients">
                    {clients.filter(c => c.client_type === 'external').map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.website ? `(${c.website})` : ''}</option>
                    ))}
                  </optgroup>
                </select>
                <button onClick={() => setShowNewClient(!showNewClient)}
                  className="rounded border border-border px-3 py-1.5 text-sm hover:bg-card transition-colors">
                  + New
                </button>
              </div>
            </div>

            {/* New client form */}
            {showNewClient && (
              <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-3">
                <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">New External Client</div>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Business name (e.g. ColourKing)" className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm" />
                <input value={newWebsite} onChange={e => setNewWebsite(e.target.value)} placeholder="Website (e.g. colourking.nl)" className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm" />
                <input value={newIndustry} onChange={e => setNewIndustry(e.target.value)} placeholder="Industry (e.g. car body repair)" className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm" />
                <input value={newTone} onChange={e => setNewTone(e.target.value)} placeholder="Brand tone (e.g. professional, friendly)" className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm" />
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} placeholder="Business description — services, unique selling points, target market..." className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm" />
                <button onClick={saveClient} disabled={!newName.trim()} className="rounded bg-indigo-600 px-4 py-1.5 text-sm text-white disabled:opacity-40">Save Client</button>
              </div>
            )}

            {/* Source type */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Content Source</label>
              <div className="flex gap-2">
                {(['manual', 'listing'] as const).map(s => (
                  <button key={s} onClick={() => setSourceType(s)}
                    className={`px-3 py-1.5 rounded text-sm border transition-colors ${sourceType === s ? 'bg-indigo-600 text-white border-indigo-600' : 'border-border text-muted'}`}>
                    {s === 'manual' ? 'Custom brief' : 'From listing'}
                  </button>
                ))}
              </div>
            </div>

            {sourceType === 'manual' ? (
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Marketing Brief</label>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={5}
                  className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm"
                  placeholder="Describe what you want to promote. E.g.: ColourKing specializes in car body repair and custom paint jobs in Amsterdam. We want to promote our new ceramic coating service with a 20% launch discount..." />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Find listing</label>
                <input value={listingQ} onChange={e => { setListingQ(e.target.value); setListingId(null); }}
                  placeholder="Search by ref number..." className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm" />
                {listingHits.length > 0 && !listingId && (
                  <ul className="mt-1 border border-border rounded divide-y divide-border max-h-48 overflow-auto text-sm">
                    {listingHits.map((h: any) => (
                      <li key={h.id}><button onClick={() => setListingId(h.id)} className="w-full text-left px-3 py-2 hover:bg-card">
                        <span className="font-medium">{h.ref_no}</span> — {h.title}
                      </button></li>
                    ))}
                  </ul>
                )}
                {listingId && <div className="mt-1 text-xs text-emerald-500">Selected: {listingId.slice(0, 8)}...</div>}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Objective</label>
              <select value={objective} onChange={e => setObjective(e.target.value)} className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm">
                {OBJECTIVES.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Target audience (optional)</label>
              <input value={audience} onChange={e => setAudience(e.target.value)} className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm" placeholder="e.g. car owners in Amsterdam, fleet managers, young professionals" />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Channels</label>
              <div className="flex flex-wrap gap-2">
                {ALL_CHANNELS.map(ch => (
                  <button key={ch} onClick={() => setSelChannels(s => s.includes(ch) ? s.filter(x => x !== ch) : [...s, ch])}
                    className={`px-2.5 py-1 rounded text-xs border transition-colors ${selChannels.includes(ch) ? 'bg-indigo-600 text-white border-indigo-600' : 'border-border text-muted'}`}>{ch}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Languages</label>
              <div className="flex flex-wrap gap-2">
                {LOCALES.map(l => (
                  <button key={l} onClick={() => setSelLocales(s => s.includes(l) ? s.filter(x => x !== l) : [...s, l])}
                    className={`px-2.5 py-1 rounded text-xs border uppercase transition-colors ${selLocales.includes(l) ? 'bg-indigo-600 text-white border-indigo-600' : 'border-border text-muted'}`}>{l}</button>
                ))}
              </div>
            </div>

            <button disabled={!canGenerate || busy} onClick={generate}
              className="w-full rounded bg-indigo-600 py-2.5 text-sm font-medium text-white disabled:opacity-40 hover:bg-indigo-700 transition-colors">
              {busy ? 'Generating...' : `Generate ${selChannels.length * selLocales.length} assets`}
            </button>
          </div>

          {/* Preview panel */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="text-xs font-medium text-muted mb-3 uppercase tracking-wider">Preview — what the AI will use</div>
            {clientId ? (() => {
              const client = clients.find(c => c.id === clientId);
              return client ? (
                <dl className="text-sm space-y-2">
                  <div className="flex gap-2"><dt className="w-24 shrink-0 text-muted">Client</dt><dd className="font-medium">{client.name}</dd></div>
                  {client.website && <div className="flex gap-2"><dt className="w-24 shrink-0 text-muted">Website</dt><dd>{client.website}</dd></div>}
                  {client.industry && <div className="flex gap-2"><dt className="w-24 shrink-0 text-muted">Industry</dt><dd>{client.industry}</dd></div>}
                  {client.brand_tone && <div className="flex gap-2"><dt className="w-24 shrink-0 text-muted">Tone</dt><dd>{client.brand_tone}</dd></div>}
                  {client.brand_description && <div className="flex gap-2"><dt className="w-24 shrink-0 text-muted">Description</dt><dd className="text-xs">{client.brand_description}</dd></div>}
                  <div className="flex gap-2"><dt className="w-24 shrink-0 text-muted">Type</dt><dd className="text-xs">{client.client_type}</dd></div>
                </dl>
              ) : null;
            })() : (
              <p className="text-sm text-muted">Select a client or create a new one to preview the brand context.</p>
            )}
            {sourceType === 'manual' && prompt && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-xs text-muted mb-1">Brief</div>
                <p className="text-sm whitespace-pre-wrap">{prompt}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REVIEW ── */}
      {stage === 'review' && outputs.length > 0 && (
        <div>
          <div className="flex flex-wrap gap-1 border-b border-border mb-4">
            {outputs.map((o, i) => (
              <button key={o.id} onClick={() => setActiveTab(i)}
                className={`px-3 py-1.5 text-sm -mb-px border-b-2 transition-colors ${activeTab === i ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-muted'}`}>
                {o.channel} · {o.locale.toUpperCase()}
                {o.status === 'approved' && ' ✓'}
              </button>
            ))}
          </div>
          {outputs[activeTab] && (
            <OutputCard o={outputs[activeTab]} onSave={patchOutput} />
          )}
          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setStage('brief')} className="text-sm text-muted">← Back to brief</button>
            <div className="text-sm text-muted">{approvedCount}/{outputs.length} approved</div>
            <button disabled={!approvedCount} onClick={() => setStage('publish')}
              className="rounded bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-40">Publish →</button>
          </div>
        </div>
      )}

      {/* ── PUBLISH ── */}
      {stage === 'publish' && (
        <div className="space-y-3">
          {outputs.filter(o => o.status === 'approved' || o.status === 'published').map(o => (
            <div key={o.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">{o.channel} · {o.locale.toUpperCase()}</div>
                <span className={`text-xs px-2 py-0.5 rounded ${o.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-card border border-border text-muted'}`}>{o.status}</span>
              </div>
              <p className="text-sm text-muted whitespace-pre-wrap line-clamp-4">{o.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => navigator.clipboard.writeText([o.subject, o.body, (o.hashtags || []).join(' ')].filter(Boolean).join('\n\n'))}
                  className="rounded border border-border px-3 py-1 text-xs hover:bg-card transition-colors">Copy</button>
                <button onClick={() => publishOutput(o.id, 'telegram')} disabled={o.status === 'published'}
                  className="rounded bg-sky-600 text-white px-3 py-1 text-xs disabled:opacity-40">Telegram</button>
                <button onClick={() => publishOutput(o.id, 'blog')} disabled={o.status === 'published'}
                  className="rounded bg-slate-600 text-white px-3 py-1 text-xs disabled:opacity-40">Blog</button>
                <button onClick={() => publishOutput(o.id, 'email')} disabled={o.status === 'published'}
                  className="rounded bg-indigo-600 text-white px-3 py-1 text-xs disabled:opacity-40">Email</button>
              </div>
            </div>
          ))}
          <button onClick={() => setStage('review')} className="text-sm text-muted">← Back to review</button>
        </div>
      )}
    </div>
  );
}

function OutputCard({ o, onSave }: { o: Output; onSave: (id: string, p: any) => void }) {
  const [subject, setSubject] = useState(o.subject || '');
  const [body, setBody] = useState(o.body);
  const [cta, setCta] = useState(o.cta || '');
  const [tags, setTags] = useState((o.hashtags || []).join(' '));
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-3">
      {o.verify_warnings?.length > 0 && (
        <div className="rounded border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          Unverified claims: {o.verify_warnings.map((w: any) => w.claim).join('; ')}
        </div>
      )}
      <div>
        <label className="block text-xs text-muted mb-1">Subject / headline</label>
        <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">Body</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={8} className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-xs text-muted mb-1">CTA</label><input value={cta} onChange={e => setCta(e.target.value)} className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm" /></div>
        <div><label className="block text-xs text-muted mb-1">Hashtags</label><input value={tags} onChange={e => setTags(e.target.value)} className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm" /></div>
      </div>
      <div className="flex gap-2">
        <button disabled={saving} onClick={() => { setSaving(true); onSave(o.id, { subject, body, cta, hashtags: tags.split(/\s+/).filter(Boolean) }); setSaving(false); }}
          className="rounded border border-border px-3 py-1.5 text-sm hover:bg-card transition-colors">Save edits</button>
        <button disabled={saving} onClick={() => { setSaving(true); onSave(o.id, { subject, body, cta, hashtags: tags.split(/\s+/).filter(Boolean), action: 'approve' }); setSaving(false); }}
          className="rounded bg-emerald-600 text-white px-3 py-1.5 text-sm">Approve</button>
        {o.status === 'approved' && <span className="self-center text-xs text-emerald-500">approved ✓</span>}
      </div>
    </div>
  );
}
