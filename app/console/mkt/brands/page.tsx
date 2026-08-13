'use client';
// app/console/mkt/brands/page.tsx — MK004 Brand Tracker → brand-voice profiles
import { useEffect, useState } from 'react';

type Brand = { tenant_id: number; entity: string; tone: string; voice_notes: string; banned_phrases: string[]; locale_defaults: string[] };

export default function Page() {
  const [rows, setRows] = useState<Brand[]>([]);
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => { void fetch('/api/bop/mkt/brand').then(r => r.json()).then(d => setRows(d.brand_profiles || [])); }, []);
  const set = (i: number, k: keyof Brand, v: any) => setRows(rs => rs.map((r, j) => j === i ? { ...r, [k]: v } : r));

  async function save(b: Brand) {
    setSaving(b.tenant_id);
    await fetch('/api/bop/mkt/brand', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...b, banned_phrases: (b.banned_phrases || []).join(', '), locale_defaults: (b.locale_defaults || []).join(', ') }),
    });
    setSaving(null);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Brand Voice Profiles <span className="text-xs font-normal text-slate-400">MK004</span></h1>
        <p className="mt-1 text-sm text-slate-500">Tone & voice per entity — used to ground the AI Marketing Cockpit (MK006).</p>
      </div>
      <div className="space-y-4">
        {rows.map((b, i) => (
          <div key={b.tenant_id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-slate-800">{b.entity} <span className="text-xs text-slate-400">tenant {b.tenant_id}</span></div>
              <button onClick={() => { void save(b); }} disabled={saving === b.tenant_id} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-40">
                {saving === b.tenant_id ? 'Saving…' : 'Save'}
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Tone</label>
                <input value={b.tone || ''} onChange={e => set(i, 'tone', e.target.value)} className="w-full rounded border-slate-300" />
                <label className="block text-xs text-slate-500 mb-1 mt-3">Banned phrases (comma-sep)</label>
                <input value={(b.banned_phrases || []).join(', ')} onChange={e => set(i, 'banned_phrases', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="w-full rounded border-slate-300" />
                <label className="block text-xs text-slate-500 mb-1 mt-3">Default locales (comma-sep)</label>
                <input value={(b.locale_defaults || []).join(', ')} onChange={e => set(i, 'locale_defaults', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="w-full rounded border-slate-300" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Voice notes</label>
                <textarea value={b.voice_notes || ''} onChange={e => set(i, 'voice_notes', e.target.value)} rows={7} className="w-full rounded border-slate-300" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
