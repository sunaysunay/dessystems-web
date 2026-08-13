'use client';
/* eslint-disable complexity, max-lines-per-function, max-lines */
// app/console/mkt/studio/[sessionId]/page.tsx — MK007 workspace v2
// Realtime status, before/after canvas, step-node click, EdgePanel, BrandingPanel, FinalizeBar

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// ─── Supabase realtime client (anon, client-side) ────────────────────────────
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface StudioStep {
  id: string; step_no: number; kind: string;
  status: 'pending'|'running'|'done'|'failed';
  output?: Record<string,unknown>; error?: string; cost_cents?: number;
}
interface StudioImage {
  id: string; position: number;
  status: 'pending'|'processing'|'done'|'failed';
  selected: boolean; original_path: string;
  overrides?: Record<string,unknown>;
  bop_studio_steps?: StudioStep[];
}
interface Session {
  id: string; status: string; preset_code?: string;
  listing_id?: string; cost_cents: number;
  settings?: {
    plateOp?: string; logoEnabled?: boolean; logoPosition?: string;
    featherPx?: number; logoSizePercent?: number; exportTargets?: string[];
  };
  bop_studio_images?: StudioImage[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STEP_LABELS = ['Segment','Compose','Plate','Brand','Export'];
const STATUS_PILL: Record<string,string> = {
  pending:'bg-slate-100 text-slate-500', processing:'bg-blue-100 text-blue-700',
  done:'bg-green-100 text-green-700',    failed:'bg-red-100 text-red-700',
  review:'bg-amber-100 text-amber-700',  completed:'bg-green-100 text-green-700',
  cancelled:'bg-slate-100 text-slate-400', draft:'bg-slate-100 text-slate-500',
};
const STEP_ICON: Record<string,string> = {
  pending:'○', running:'◌', done:'✓', failed:'✗',
};
const EXPORT_TARGETS = ['mobile_de','autoscout24','marktplaats','website'];
const EXPORT_LABELS: Record<string,string> = {
  mobile_de:'Mobile.de', autoscout24:'AutoScout24', marktplaats:'Marktplaats', website:'Website',
};

function getStepOutputUrl(step?: StudioStep): string|null {
  if (!step || step.status !== 'done') return null;
  const o = step.output as Record<string,unknown>|null;
  if (!o) return null;
  return (o.resultPath ?? o.cutoutPath ?? o.maskPath) as string|null;
}

// ─── Canvas component ─────────────────────────────────────────────────────────
function StudioCanvas({ image, activeStep }: { image: StudioImage|null; activeStep: number }) {
  const [split, setSplit] = useState(50);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setSplit(Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100)));
  };

  if (!image) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-100 text-sm text-slate-400">
        Select an image
      </div>
    );
  }

  const step = image.bop_studio_steps?.find(s => s.step_no === activeStep);
  const stepUrl = getStepOutputUrl(step);
  const isProcessing = image.status === 'processing';
  const isFailed = image.status === 'failed';

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-slate-900 select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={() => { dragging.current = false; }}
      onMouseLeave={() => { dragging.current = false; }}
    >
      {/* Background: original or step output */}
      <div className="absolute inset-0 flex items-center justify-center">
        {stepUrl ? (
          <img src={`/api/bop/mkt/studio/proxy?path=${encodeURIComponent(stepUrl)}`}
            alt="step output" className="max-h-full max-w-full object-contain" />
        ) : image.original_path ? (
          <>
            <img src={`/api/bop/mkt/studio/proxy?path=${encodeURIComponent(image.original_path)}`}
              alt="original" className="max-h-full max-w-full object-contain" />
            {(isProcessing || isFailed) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-sm">
                {isProcessing && <span className="animate-pulse">⏳ Processing…</span>}
                {isFailed && <span className="text-red-300">✗ Failed — see step timeline</span>}
              </div>
            )}
            {!isProcessing && !isFailed && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
                Original · awaiting pipeline
              </div>
            )}
          </>
        ) : (
          <div className="text-slate-500 text-sm text-center px-4">
            {isProcessing && <><div className="text-2xl mb-2 animate-spin inline-block">⟳</div><br/>Processing…</>}
            {isFailed && <><div className="text-2xl mb-2">✗</div><br/>Failed — see step timeline</>}
            {!isProcessing && !isFailed && <><div className="text-2xl mb-2">📷</div><br/>Photo {image.position} · awaiting pipeline</>}
          </div>
        )}
      </div>

      {/* Before/after split slider (only when step output available) */}
      {stepUrl && activeStep > 0 && (
        <>
          <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100-split}% 0 0)` }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">Before</div>
            </div>
          </div>
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white cursor-col-resize shadow-lg"
            style={{ left: `${split}%` }}
            onMouseDown={() => { dragging.current = true; }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-slate-600 text-xs select-none">
              ⇔
            </div>
          </div>
          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">After</div>
        </>
      )}

      {/* Failed image overlay */}
      {isFailed && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center">
          <div className="bg-red-600 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow">
            ✗ AI fallback — original preserved
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StudioWorkspacePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session|null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<StudioImage|null>(null);
  const [activeStep, setActiveStep] = useState(4); // show latest step by default
  const [processing, setProcessing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [listingId, setListingId] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<string[]>(['mobile_de','website']);
  const [featherPx, setFeatherPx] = useState(4);
  const [logoEnabled, setLogoEnabled] = useState(false);
  const [logoPosition, setLogoPosition] = useState<'TL'|'TR'|'BL'|'BR'>('BR');
  const [error, setError] = useState('');
  const settingsTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const reload = useCallback(() =>
    fetch(`/api/bop/mkt/studio/sessions/${sessionId}`)
      .then(r => r.json())
      .then(d => {
        const s: Session = d.session;
        setSession(s);
        if (s?.listing_id) setListingId(s.listing_id);
        if (s?.settings?.featherPx !== null && s?.settings?.featherPx !== undefined) setFeatherPx(s.settings.featherPx ?? 4);
        if (s?.settings?.logoEnabled !== null && s?.settings?.logoEnabled !== undefined) setLogoEnabled(s.settings.logoEnabled ?? false);
        if (s?.settings?.logoPosition) setLogoPosition(s.settings.logoPosition as 'TL'|'TR'|'BL'|'BR');
        if (s?.bop_studio_images?.length) {
          setActiveImage(prev =>
            s.bop_studio_images!.find(i => i.id === prev?.id) ?? s.bop_studio_images![0] ?? null
          );
        }
      })
      .finally(() => setLoading(false)),
  [sessionId]);

  useEffect(() => { void reload(); }, [reload]);

  // Polling fallback — 5s while processing (Realtime may miss updates without REPLICA IDENTITY FULL)
  useEffect(() => {
    if (!session || session.status !== 'processing') return;
    const t = setInterval(() => { void reload(); }, 5000);
    return () => clearInterval(t);
  }, [session, reload]);

  // Supabase Realtime — replace polling
  useEffect(() => {
    const channel = sb
      .channel(`studio-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bop_studio_images',
        filter: `session_id=eq.${sessionId}`,
      }, () => { void reload(); })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bop_studio_sessions',
        filter: `id=eq.${sessionId}`,
      }, () => { void reload(); })
      .subscribe();
    return () => { void sb.removeChannel(channel); };
  }, [sessionId, reload]);

  const patchSettings = useCallback((patch: Record<string,unknown>) => {
    if (settingsTimer.current) clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(() => {
      void fetch(`/api/bop/mkt/studio/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ settings: patch }),
      });
    }, 500);
  }, [sessionId]);

  const handleProcess = async () => {
    setProcessing(true); setError('');
    const res = await fetch(`/api/bop/mkt/studio/sessions/${sessionId}/process`, { method: 'POST' });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Failed'); }
    else await reload();
    setProcessing(false);
  };

  const handleFinalize = async () => {
    if (!listingId.trim()) { setError('Enter a listing ID first'); return; }
    setFinalizing(true); setError('');
    await fetch(`/api/bop/mkt/studio/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId.trim(), settings: { ...session?.settings, exportTargets: selectedTargets } }),
    });
    const res = await fetch(`/api/bop/mkt/studio/sessions/${sessionId}/finalize`, { method: 'POST' });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Finalize failed'); }
    else await reload();
    setFinalizing(false);
  };

  const handleCancel = async () => {
    if (!confirm('Cancel processing and reset to draft?')) return;
    setCancelling(true);
    try {
      await fetch(`/api/bop/mkt/studio/sessions/${sessionId}/cancel`, { method: 'POST' });
      void reload();
    } finally { setCancelling(false); }
  };

  const handleReset = async () => {
    if (!confirm('Reset all steps and re-run the full pipeline?')) return;
    setResetting(true);
    try {
      await fetch(`/api/bop/mkt/studio/sessions/${sessionId}/reset`, { method: 'POST' });
      void reload();
      void handleProcess();
    } finally { setResetting(false); }
  };

  const handleBgUpload = async (file: File) => {
    setBgUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/bop/mkt/studio/sessions/${sessionId}/background`, {
        method: 'POST', body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      void reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally { setBgUploading(false); }
  };

  const handleRerun = async (imageId: string, fromStep: number) => {
    await fetch(`/api/bop/mkt/studio/images/${imageId}/rerun`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fromStep }),
    });
    await reload();
  };

  const toggleSelected = async (img: StudioImage) => {
    await fetch(`/api/bop/mkt/studio/images/${img.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ selected: !img.selected }),
    });
    await reload();
  };

  if (loading) return <div className="p-6 text-sm text-slate-400">Loading session…</div>;
  if (!session) return <div className="p-6 text-sm text-red-500">Session not found</div>;

  const images = session.bop_studio_images ?? [];
  const canProcess = ['draft','review'].includes(session.status) && images.length > 0;
  const canFinalize = session.status === 'review' && images.some(i => i.status === 'done');
  const isTerminal = ['completed','cancelled'].includes(session.status);
  const costPct = (session.cost_cents / 500) * 100; // cap = 500 cents

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/console/mkt/studio')}
            className="text-slate-400 hover:text-slate-600 text-sm">← Sessions</button>
          <span className="text-slate-200">|</span>
          <span className="text-sm font-mono text-slate-400">{sessionId.slice(0,8)}…</span>
          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_PILL[session.status] ?? 'bg-slate-100 text-slate-500'}`}>
            {session.status}
          </span>
          {session.preset_code && <span className="text-xs text-slate-400">· {session.preset_code}</span>}
        </div>
        <div className="flex items-center gap-3">
          {/* Cost badge */}
          <div className="flex items-center gap-1.5">
            <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${costPct > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, costPct)}%` }} />
            </div>
            <span className={`text-xs font-mono ${costPct > 80 ? 'text-red-600' : 'text-slate-400'}`}>
              €{(session.cost_cents/100).toFixed(2)}
            </span>
          </div>
          {session.status === 'processing' && (
            <button onClick={() => { void handleCancel(); }} disabled={cancelling}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50">
              {cancelling ? 'Cancelling…' : '✕ Cancel'}
            </button>
          )}
          {!isTerminal && canProcess && (
            <button onClick={() => { void handleProcess(); }} disabled={processing}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
              {processing ? 'Starting…' : '▶ Run Pipeline'}
            </button>
          )}
          {isTerminal && (
            <button onClick={() => { void handleReset(); }} disabled={resetting}
              className="px-3 py-1.5 rounded-lg bg-slate-600 text-white text-xs font-medium hover:bg-slate-700 disabled:opacity-50">
              {resetting ? 'Resetting…' : '↺ Reset & Re-run'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 shrink-0">
          {error}
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Image strip */}
        <div className="w-24 shrink-0 border-r border-slate-200 overflow-y-auto bg-slate-50 flex flex-col gap-1.5 p-1.5">
          {images.map(img => (
            <div key={img.id} onClick={() => setActiveImage(img)}
              className={`relative rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${
                activeImage?.id === img.id ? 'border-blue-500' : 'border-transparent hover:border-slate-300'
              }`}>
              <div className="aspect-[4/3] bg-slate-200 relative overflow-hidden">
                {img.original_path
                  ? <img src={`/api/bop/mkt/studio/proxy?path=${encodeURIComponent(img.original_path)}`}
                      alt={`Photo ${img.position}`} className="w-full h-full object-cover" />
                  : <span className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">#{img.position}</span>}
              </div>
              <div className={`absolute top-1 right-1 w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold ${
                img.status==='done' ? 'bg-green-500 text-white' :
                img.status==='failed' ? 'bg-red-500 text-white' :
                img.status==='processing' ? 'bg-blue-500 text-white animate-pulse' :
                'bg-slate-300 text-slate-600'
              }`}>
                {img.status==='done'?'✓':img.status==='failed'?'!':img.status==='processing'?'…':'○'}
              </div>
              <input type="checkbox" checked={img.selected}
                onChange={() => { void toggleSelected(img); }}
                onClick={e => e.stopPropagation()}
                className="absolute top-1 left-1 w-3 h-3" />
            </div>
          ))}
        </div>

        {/* Canvas + timeline */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <StudioCanvas image={activeImage} activeStep={activeStep} />

          {/* Step timeline */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-2.5">
            {activeImage && (() => {
              const done = activeImage.bop_studio_steps?.filter(s => s.status === 'done').length ?? 0;
              const total = STEP_LABELS.length - 1;
              return done > 0 ? <p className="text-xs text-slate-400 mb-1.5">{done} of {total} steps completed</p> : null;
            })()}
            <div className="flex items-center gap-1">
              {STEP_LABELS.map((label, i) => {
                const step = activeImage?.bop_studio_steps?.find(s => s.step_no === i);
                const st = step?.status ?? 'pending';
                const isActive = activeStep === i;
                return (
                  <div key={i} className="flex items-center gap-1">
                    {i > 0 && <div className="w-4 h-px bg-slate-200 shrink-0" />}
                    <button
                      onClick={() => setActiveStep(i)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                        isActive ? 'ring-2 ring-blue-400 ring-offset-1' : ''
                      } ${STATUS_PILL[st]}`}
                      title={step?.error ?? label}
                    >
                      <span>{STEP_ICON[st] ?? '○'}</span>
                      <span>{label}</span>
                      {step?.cost_cents ? <span className="opacity-60">€{(step.cost_cents/100).toFixed(2)}</span> : null}
                    </button>
                  </div>
                );
              })}
            </div>
            {/* Retry buttons for failed steps */}
            {activeImage?.status === 'failed' && (
              <div className="mt-1.5 flex gap-2 flex-wrap">
                {activeImage.bop_studio_steps?.filter(s => s.status === 'failed').map(s => (
                  <button key={s.id} onClick={() => { void handleRerun(activeImage.id, s.step_no); }}
                    className="text-xs text-blue-600 hover:text-blue-800 underline">
                    ↺ Retry from {STEP_LABELS[s.step_no]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Settings panel */}
        <div className="w-60 shrink-0 border-l border-slate-200 bg-white overflow-y-auto flex flex-col divide-y divide-slate-100">

          {/* Stats */}
          <div className="p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600"><span>Images</span><span className="font-mono">{images.length}</span></div>
            <div className="flex justify-between text-slate-600"><span>Selected</span><span className="font-mono">{images.filter(i=>i.selected).length}</span></div>
            <div className="flex justify-between text-slate-600"><span>Done</span><span className="font-mono">{images.filter(i=>i.status==='done').length}</span></div>
            <div className="flex justify-between text-slate-600"><span>Cost</span><span className="font-mono">€{(session.cost_cents/100).toFixed(2)}/€5.00</span></div>
          </div>

          {/* Background */}
          <div className="p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Background</h3>
            {(session.settings as import("@/lib/studio/types").StudioSettings)?.backgroundPath ? (
              <div className="space-y-2">
                <img src={`/api/bop/mkt/studio/proxy?path=${encodeURIComponent((session.settings as Record<string, unknown>).backgroundPath as string)}`}
                  alt="background" className="w-full rounded-lg object-cover h-20" />
                <div className="flex gap-2">
                  <button onClick={() => bgInputRef.current?.click()}
                    className="flex-1 text-xs text-blue-600 hover:text-blue-800 underline">
                    Replace
                  </button>
                  <button onClick={() => patchSettings({ ...session.settings, backgroundPath: null })}
                    className="text-xs text-red-500 hover:text-red-700 underline">
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => bgInputRef.current?.click()} disabled={bgUploading}
                className="w-full border-2 border-dashed border-slate-200 rounded-lg py-4 text-xs text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors disabled:opacity-50">
                {bgUploading ? 'Uploading…' : '+ Upload showroom photo'}
              </button>
            )}
            <input ref={bgInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void handleBgUpload(f); }} />
            <p className="text-xs text-slate-400 mt-1.5">Used as COMPOSE layer background</p>
          </div>

          {/* Plate treatment */}
          <div className="p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Plate</h3>
            {(['keep','blur','blank','dealer'] as const).map(op => (
              <label key={op} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer py-0.5">
                <input type="radio" name="plateOp" value={op}
                  defaultChecked={op === (session.settings?.plateOp ?? 'blur')}
                  onChange={() => patchSettings({ ...session.settings, plateOp: op })} />
                <span className="capitalize">{op}</span>
              </label>
            ))}
          </div>

          {/* Edge panel */}
          <div className="p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Edge Blend</h3>
            <div className="flex items-center gap-2">
              <input type="range" min={0} max={30} value={featherPx}
                onChange={e => {
                  const v = Number(e.target.value);
                  setFeatherPx(v);
                  patchSettings({ ...session.settings, featherPx: v });
                }}
                className="flex-1 accent-blue-600" />
              <span className="text-xs font-mono text-slate-500 w-8">{featherPx}px</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">0 = hard edge · 30 = soft blend</p>
          </div>

          {/* Branding panel */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Logo Overlay</h3>
              <button
                onClick={() => {
                  const next = !logoEnabled;
                  setLogoEnabled(next);
                  patchSettings({ ...session.settings, logoEnabled: next }); // patchSettings is sync (debounces internally)
                }}
                className={`relative w-9 h-5 rounded-full transition-colors ${logoEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${logoEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {logoEnabled && (
              <>
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Corner</p>
                  <div className="grid grid-cols-2 gap-1">
                    {(['TL','TR','BL','BR'] as const).map(pos => (
                      <button key={pos}
                        onClick={() => { setLogoPosition(pos); patchSettings({ ...session.settings, logoPosition: pos }); }}
                        className={`py-1 rounded text-xs font-medium border transition-colors ${
                          logoPosition === pos ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}>
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Finalize */}
          {canFinalize && !isTerminal && (
            <div className="p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Export & Save</h3>
              <div className="space-y-1">
                {EXPORT_TARGETS.map(t => (
                  <label key={t} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={selectedTargets.includes(t)}
                      onChange={() => setSelectedTargets(prev =>
                        prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
                      )} />
                    {EXPORT_LABELS[t]}
                  </label>
                ))}
              </div>
              <input type="text" placeholder="Listing ID (UUID)"
                value={listingId} onChange={e => setListingId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={() => { void handleFinalize(); }} disabled={finalizing || !listingId.trim()}
                className="w-full px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {finalizing ? 'Saving…' : '✓ Push to Listing'}
              </button>
            </div>
          )}

          {session.status === 'completed' && (
            <div className="p-4">
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                ✓ Finalized — images saved to listing
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
