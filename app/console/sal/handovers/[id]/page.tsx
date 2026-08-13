'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

const SC: Record<string,string> = {
  scheduled:'bg-blue-100 text-blue-700', in_progress:'bg-amber-100 text-amber-700',
  executed:'bg-cyan-100 text-cyan-700', completed:'bg-emerald-100 text-emerald-700',
  cancelled:'bg-red-100 text-red-600',
};

const FUEL_OPTIONS = [
  { value: 'empty', label: 'Empty' }, { value: 'quarter', label: '1/4' },
  { value: 'half', label: '1/2' }, { value: 'three_quarter', label: '3/4' },
  { value: 'full', label: 'Full' }, { value: 'electric_pct', label: 'EV %' },
];

interface Transition { to_status: string; guard: string | null }

export default function SA019Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ho, setHo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [signOpen, setSignOpen] = useState(false);
  const [signedBy, setSignedBy] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    const j = await fetch(`/api/bop/sal/handovers/${id}`).then(r => r.json());
    setHo(j.handover ?? null);
    setLoading(false);
  }, [id]);

  const loadTransitions = useCallback(async () => {
    const j = await fetch(`/api/bop/sal/handovers/${id}/transition`).then(r => r.json());
    setTransitions(j.transitions ?? []);
  }, [id]);

  useEffect(() => { void load(); void loadTransitions(); }, [load, loadTransitions]);

  async function doTransition(toStatus: string) {
    setSaving(true);
    const res = await fetch(`/api/bop/sal/handovers/${id}/transition`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_status: toStatus }),
    }).then(r => r.json());
    if (res.error) showToast(res.error);
    else showToast(`Status → ${toStatus}`);
    setSaving(false);
    void load(); void loadTransitions();
  }

  async function saveField(field: string, value: unknown) {
    await fetch(`/api/bop/sal/handovers/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    void load();
  }

  async function completeHandover() {
    if (!signedBy.trim()) { showToast('Enter name of signer'); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signature = canvas.toDataURL('image/png');
    setSaving(true);
    const res = await fetch(`/api/bop/sal/handovers/${id}/complete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature, signed_by: signedBy }),
    }).then(r => r.json());
    if (res.error) showToast(res.error);
    else showToast('Handover completed — vehicle delivered');
    setSaving(false); setSignOpen(false);
    void load(); void loadTransitions();
  }

  // Canvas drawing
  function initCanvas() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const getPos = (e: MouseEvent | TouchEvent) => {
      const r = c.getBoundingClientRect();
      if ('touches' in e) return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const start = (e: MouseEvent | TouchEvent) => { e.preventDefault(); drawingRef.current = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = (e: MouseEvent | TouchEvent) => { if (!drawingRef.current) return; e.preventDefault(); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    const end = () => { drawingRef.current = false; };

    c.addEventListener('mousedown', start); c.addEventListener('mousemove', move); c.addEventListener('mouseup', end); c.addEventListener('mouseleave', end);
    c.addEventListener('touchstart', start, { passive: false }); c.addEventListener('touchmove', move, { passive: false }); c.addEventListener('touchend', end);
  }

  useEffect(() => { if (signOpen) setTimeout(initCanvas, 100); }, [signOpen]);

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading...</div>;
  if (!ho) return <div className="p-8 text-slate-400">Handover not found. <button onClick={() => router.back()} className="text-blue-600 underline">Go back</button></div>;

  const partner = ho.mdm_business_partners;
  const order = ho.sal_orders;
  const isEditable = ho.status === 'in_progress';
  const isExecuted = ho.status === 'executed';

  return (
    <div className="max-w-2xl mx-auto space-y-4 p-4">
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}

      <div className="flex items-center justify-between">
        <ScreenHeader title={ho.handover_number ?? 'Handover'} description="SA019 — Vehicle Handover Checklist" />
        <button onClick={() => router.back()} className="text-xs text-slate-400 hover:text-slate-600">Back</button>
      </div>

      {/* Status + transitions */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${SC[ho.status]??'bg-slate-100 text-slate-500'}`}>{ho.status?.replace(/_/g,' ')}</span>
        {order && (
          <button onClick={() => router.push(`/console/sal/orders/${order.id}`)}
            className="text-xs text-blue-600 hover:underline">Order: {order.order_number}</button>
        )}
        {partner && <span className="text-xs text-slate-500">{partner.company_name ?? partner.name}</span>}
        <div className="flex gap-1.5 ml-auto">
          {transitions.filter(t => t.to_status !== 'completed').map(tr => (
            <button key={tr.to_status} onClick={() => { void doTransition(tr.to_status); }} disabled={saving}
              className={`rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50 ${
                tr.to_status === 'cancelled' ? 'border-red-200 text-red-500 hover:bg-red-50' :
                'border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600'
              }`}>→ {tr.to_status.replace(/_/g,' ')}</button>
          ))}
        </div>
      </div>

      {/* Completed banner */}
      {ho.status === 'completed' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <div>
              <div className="font-semibold text-emerald-700">Handover Completed</div>
              <div className="text-xs text-emerald-500">Signed by {ho.signed_by} at {ho.signed_at ? new Date(ho.signed_at).toLocaleString() : '—'}</div>
            </div>
          </div>
          {ho.signature_data && (
            <img src={ho.signature_data} alt="Signature" className="mt-3 h-20 border border-emerald-200 rounded-lg bg-white" />
          )}
        </div>
      )}

      {/* ── Checklist sections ── */}
      <div className="space-y-3">
        {/* 1. Odometer */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Odometer (km)</label>
          <input type="number" value={ho.odometer_km ?? ''} disabled={!isEditable}
            onChange={e => setHo((p: any) => ({ ...p, odometer_km: e.target.value ? parseInt(e.target.value) : null }))}
            onBlur={e => isEditable && saveField('odometer_km', e.target.value ? parseInt(e.target.value) : null)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-lg font-mono text-slate-800 disabled:bg-slate-50 focus:border-blue-400 focus:outline-none" />
        </div>

        {/* 2. Fuel level */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fuel Level</label>
          <div className="mt-2 flex gap-2 flex-wrap">
            {FUEL_OPTIONS.map(f => (
              <button key={f.value} disabled={!isEditable}
                onClick={() => { setHo((p: any) => ({ ...p, fuel_level: f.value })); saveField('fuel_level', f.value); }}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                  ho.fuel_level === f.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}>{f.label}</button>
            ))}
          </div>
        </div>

        {/* 3. Keys */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Keys Handed Over</label>
          <div className="mt-2 flex items-center gap-3">
            {[1, 2, 3].map(n => (
              <button key={n} disabled={!isEditable}
                onClick={() => { setHo((p: any) => ({ ...p, keys_count: n })); saveField('keys_count', n); }}
                className={`flex h-12 w-12 items-center justify-center rounded-xl border text-lg font-bold transition-colors disabled:opacity-60 ${
                  ho.keys_count === n ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                }`}>{n}</button>
            ))}
            <span className="text-xs text-slate-400 ml-2">key(s)</span>
          </div>
        </div>

        {/* 4. Accessories */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Accessories Checked</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {['Spare wheel', 'Jack', 'Warning triangle', 'First aid kit', 'Hi-vis vest', 'Manual/booklet', 'Service history', 'Navigation SD'].map(item => {
              const checked = (ho.accessories ?? []).includes(item);
              return (
                <button key={item} disabled={!isEditable}
                  onClick={() => {
                    const next = checked ? (ho.accessories ?? []).filter((a: string) => a !== item) : [...(ho.accessories ?? []), item];
                    setHo((p: any) => ({ ...p, accessories: next }));
                    saveField('accessories', next);
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                    checked ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}>
                  {checked ? '✓ ' : ''}{item}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. RDW */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">RDW Tenaamstelling</label>
          <input type="text" value={ho.rdw_tenaamstelling ?? ''} disabled={!isEditable} placeholder="RDW registration transfer status"
            onChange={e => setHo((p: any) => ({ ...p, rdw_tenaamstelling: e.target.value }))}
            onBlur={e => isEditable && saveField('rdw_tenaamstelling', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 disabled:bg-slate-50 focus:border-blue-400 focus:outline-none" />
          <input type="text" value={ho.rdw_ref ?? ''} disabled={!isEditable} placeholder="RDW reference number"
            onChange={e => setHo((p: any) => ({ ...p, rdw_ref: e.target.value }))}
            onBlur={e => isEditable && saveField('rdw_ref', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 disabled:bg-slate-50 focus:border-blue-400 focus:outline-none" />
        </div>

        {/* 6. Notes */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Notes</label>
          <textarea value={ho.notes ?? ''} disabled={!isEditable} rows={3} placeholder="Delivery notes, condition remarks..."
            onChange={e => setHo((p: any) => ({ ...p, notes: e.target.value }))}
            onBlur={e => isEditable && saveField('notes', e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 disabled:bg-slate-50 focus:border-blue-400 focus:outline-none" />
        </div>

        {/* 7. Complete + Signature */}
        {isExecuted && (
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
            {!signOpen ? (
              <button onClick={() => setSignOpen(true)}
                className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors">
                Complete Handover — Capture Signature
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Signed by (name)</label>
                  <input type="text" value={signedBy} onChange={e => setSignedBy(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                    placeholder="Customer full name" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Signature</label>
                  <canvas ref={canvasRef} width={500} height={150}
                    className="mt-1 w-full rounded-lg border-2 border-dashed border-slate-300 bg-white cursor-crosshair touch-none" />
                  <button onClick={() => { const c = canvasRef.current; if (c) { const ctx = c.getContext('2d'); if (ctx) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); } } }}
                    className="mt-1 text-xs text-slate-400 hover:text-slate-600">Clear signature</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { void completeHandover(); }} disabled={saving || !signedBy.trim()}
                    className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                    {saving ? 'Completing...' : 'Complete Handover'}
                  </button>
                  <button onClick={() => setSignOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-500">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info sidebar for wider screens */}
      {ho.scheduled_at && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Schedule</p>
          <div className="flex justify-between"><span className="text-slate-400">Scheduled</span><span className="font-medium text-slate-700">{new Date(ho.scheduled_at).toLocaleString()}</span></div>
          {ho.started_at && <div className="flex justify-between"><span className="text-slate-400">Started</span><span className="font-medium text-slate-700">{new Date(ho.started_at).toLocaleString()}</span></div>}
          {ho.completed_at && <div className="flex justify-between"><span className="text-slate-400">Completed</span><span className="font-medium text-emerald-600">{new Date(ho.completed_at).toLocaleString()}</span></div>}
        </div>
      )}
    </div>
  );
}
