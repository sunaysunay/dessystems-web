'use client';
/* eslint-disable max-lines-per-function */
// app/console/mkt/studio/new/page.tsx — MK007 create session + upload

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface LabelI18n { en?: string; nl?: string }
interface Preset { code: string; label_i18n: LabelI18n; fields?: { environment?: string } }
interface PresetBg { id: string; preset_code: string; label: string; storage_path: string; is_default: boolean }

export default function StudioNewPage() {
  const router = useRouter();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetBgs, setPresetBgs] = useState<PresetBg[]>([]);
  const [selectedBgId, setSelectedBgId] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void Promise.all([
      fetch('/api/bop/mkt/studio/presets').then(r => r.json()),
      fetch('/api/bop/mkt/studio/preset-backgrounds').then(r => r.json()),
    ]).then(([presetsData, bgsData]: [{ presets?: Preset[] }, { backgrounds?: PresetBg[] }]) => {
      const list: Preset[] = presetsData.presets ?? [];
      const bgs: PresetBg[] = bgsData.backgrounds ?? [];
      setPresets(list);
      setPresetBgs(bgs);
      if (list.length) {
        const firstCode = list[0]?.code ?? '';
        setSelectedPreset(firstCode);
        const def = bgs.find(b => b.preset_code === firstCode && b.is_default);
        if (def) setSelectedBgId(def.id);
      }
    });
  }, []);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const imgs = Array.from(incoming).filter(f => f.type.startsWith('image/'));
    setFiles(prev => {
      const combined = [...prev, ...imgs];
      return combined.slice(0, 10);
    });
  };

  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleCreate = async () => {
    if (!files.length) { setError('Add at least one photo.'); return; }
    setCreating(true);
    setError('');
    try {
      // 1. Create session
      const res = await fetch('/api/bop/mkt/studio/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          preset_code: selectedPreset || undefined,
          settings: selectedBgId
            ? { backgroundPath: presetBgs.find(b => b.id === selectedBgId)?.storage_path ?? null }
            : {},
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { session } = await res.json();

      // 2. Get signed upload URLs
      const uploadRes = await fetch(`/api/bop/mkt/studio/sessions/${session.id}/upload`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          files: files.map((f, i) => ({ position: i + 1, filename: f.name, contentType: f.type })),
        }),
      });
      if (!uploadRes.ok) throw new Error(await uploadRes.text());
      const { uploads } = await uploadRes.json();

      // 3. PUT each file to its signed URL
      await Promise.all(uploads.map(async (u: { signedUrl: string }, i: number) => {
        const file = files[i];
        if (!file) return;
        await fetch(u.signedUrl, { method: 'PUT', body: file, headers: { 'content-type': file.type } });
      }));

      router.push(`/console/mkt/studio/${session.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">New Studio Session</h1>
        <p className="text-sm text-slate-500 mt-0.5">Upload up to 10 vehicle photos and choose a scene preset</p>
      </div>

      {/* Preset picker */}
      {presets.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Scene Preset</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {presets.map(p => (
              <button
                key={p.code}
                onClick={() => {
              setSelectedPreset(p.code);
              const def = presetBgs.find(b => b.preset_code === p.code && b.is_default);
              setSelectedBgId(def?.id ?? null);
            }}
                className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                  selectedPreset === p.code
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium">{p.label_i18n?.en ?? p.code}</div>
                {p.fields?.environment && <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{p.fields.environment}</div>}
              </button>
            ))}
          </div>
        </div>
      )}


          {/* Preset Background Picker */}
          {(() => {
            const currentBgs = presetBgs.filter(b => b.preset_code === selectedPreset);
            if (currentBgs.length === 0) return null;
            return (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Scene Background <span className="text-slate-400 font-normal">(optional — leave empty to use AI generation)</span>
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedBgId(null)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      selectedBgId === null
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    AI Generate
                  </button>
                  {currentBgs.map(bg => (
                    <button
                      key={bg.id}
                      onClick={() => setSelectedBgId(bg.id)}
                      className={`relative flex items-center gap-2 pl-1 pr-3 py-1 rounded-lg border text-xs font-medium transition-colors ${
                        selectedBgId === bg.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <img
                        src={`/api/bop/mkt/studio/proxy?path=${encodeURIComponent(bg.storage_path)}`}
                        alt={bg.label}
                        className="w-10 h-7 object-cover rounded"
                      />
                      <span className="max-w-[100px] truncate">{bg.label}</span>
                      {bg.is_default && selectedBgId !== bg.id && (
                        <span className="text-[9px] text-slate-400 ml-0.5">default</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
        <div className="text-3xl mb-2">📂</div>
        <p className="text-sm text-slate-600 font-medium">Drop photos here or click to browse</p>
        <p className="text-xs text-slate-400 mt-1">JPEG, PNG, WEBP · max 10 photos · {files.length}/10 added</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span className="text-slate-700 truncate max-w-xs">{f.name}</span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-slate-400">{(f.size / 1024).toFixed(0)} KB</span>
                <button onClick={e => { e.stopPropagation(); removeFile(i); }} className="text-slate-400 hover:text-red-500">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => { void handleCreate(); }}
          disabled={creating || !files.length}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {creating ? 'Creating…' : 'Create Session & Upload'}
        </button>
        <button onClick={() => router.back()} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </div>
  );
}
