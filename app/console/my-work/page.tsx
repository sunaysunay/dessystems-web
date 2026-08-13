'use client';
// My Work — personal ServiceNow-style workspace landing.
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ScreenHeader } from '@/components/ScreenBadge';
import { DEALER_TEMPLATE, type Pin } from '@/lib/my-work';

type Section = { id: string; label: string; items: { screen_id: string; title: string; route: string }[] };

export default function MyWorkPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  useEffect(() => {
    void supabase?.auth.getUser().then(({ data }) => {
      const id = data?.user?.id ?? null;
      setUid(id);
      if (!id) { setLoading(false); return; }
      supabase!.from('bop_user_prefs').select('key,value').eq('user_id', id)
        .in('key', ['pinned_screens', 'custom_nav_sections'])
        .then(({ data }) => {
          const p = data?.find(r => r.key === 'pinned_screens');
          const cs = data?.find(r => r.key === 'custom_nav_sections');
          if (p?.value) { try { setPins(JSON.parse(p.value)); } catch {} }
          if (cs?.value) { try { setSections(JSON.parse(cs.value)); } catch {} }
          setLoading(false);
        });
    });
  }, []);

  const savePins = useCallback((next: Pin[]) => {
    setPins(next);
    if (uid) void fetch('/api/bop/user/prefs', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: uid, key: 'pinned_screens', value: JSON.stringify(next) }),
    });
    try { window.dispatchEvent(new CustomEvent('bop:pins-changed', { detail: next })); } catch {}
  }, [uid]);

  // Live-sync: reflect favorites changed from the My Work dropdown (or elsewhere).
  useEffect(() => {
    function onPins(e: Event) { setPins((e as CustomEvent).detail); }
    window.addEventListener('bop:pins-changed', onPins);
    return () => window.removeEventListener('bop:pins-changed', onPins);
  }, []);

  const remove = (route: string) => savePins(pins.filter(p => p.route !== route));
  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const n = [...pins]; const [m] = n.splice(from, 1); n.splice(to, 0, m); savePins(n);
  };
  const loadTemplate = () => savePins([...DEALER_TEMPLATE, ...pins.filter(p => !DEALER_TEMPLATE.some(t => t.route === p.route))].slice(0, 12));

  return (
    <div className="p-6">
      <ScreenHeader title="My Work" description="Your personal workspace — favorites, shortcuts and assigned work" />

      {/* Favorites */}
      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-700"><span className="h-4 w-1 rounded bg-teal-500" /> Favorites</h2>
          {pins.length > 0 && <span className="text-[11px] text-slate-400">{pins.length} pinned · drag to reorder</span>}
        </div>
        {loading ? (
          <div className="flex h-24 items-center justify-center text-sm text-slate-400">Loading…</div>
        ) : pins.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10">
            <p className="mb-3 text-sm text-slate-400">No favorites yet. Pin screens from the ⭐ button in the top bar, or start from a template.</p>
            <button onClick={loadTemplate} className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-700 hover:bg-teal-100">Load dealer starter set</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pins.map((pin, i) => (
              <div key={pin.route}
                draggable
                onDragStart={() => setDrag(i)}
                onDragOver={e => { e.preventDefault(); setOver(i); }}
                onDrop={() => { if (drag !== null) reorder(drag, i); setDrag(null); setOver(null); }}
                onDragEnd={() => { setDrag(null); setOver(null); }}
                className={`group relative cursor-pointer rounded-xl border bg-white p-4 transition-all hover:border-teal-300 hover:shadow-sm ${drag === i ? 'opacity-40' : ''} ${over === i && drag !== i ? 'border-teal-400 ring-1 ring-teal-200' : 'border-slate-200'}`}
                onClick={() => router.push(pin.route)}>
                <div className="flex items-start justify-between">
                  <span className="cursor-grab text-slate-300 group-hover:text-slate-400" title="Drag to reorder" onClick={e => e.stopPropagation()}>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
                  </span>
                  <button onClick={e => { e.stopPropagation(); remove(pin.route); }} title="Remove"
                    className="rounded p-1 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-slate-800">{pin.label}</p>
                <p className="font-mono text-[10px] text-slate-400">{pin.tc}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Shortcut groups */}
      {sections.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><span className="h-4 w-1 rounded bg-indigo-500" /> Shortcut Groups</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sections.map(cs => (
              <div key={cs.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{cs.label}</p>
                <ul className="space-y-0.5">
                  {cs.items.map(it => (
                    <li key={it.route}>
                      <button onClick={() => router.push(it.route)}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                        <span className="truncate">{it.title}</span><span className="ml-2 font-mono text-[9px] text-slate-300">{it.screen_id}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Assigned work — future ServiceNow-style queues */}
      <section className="mt-8">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><span className="h-4 w-1 rounded bg-amber-500" /> Assigned to me</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {['My leads', 'My tasks', 'My approvals'].map(q => (
            <div key={q} className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-5 text-center">
              <p className="text-sm font-semibold text-slate-500">{q}</p>
              <p className="mt-1 text-[11px] text-slate-400">Coming soon — assigned-work queues</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
