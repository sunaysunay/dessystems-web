'use client';
/* eslint-disable max-lines-per-function */
// MK008 — Preset Background Manager

import { useEffect, useState, useRef, useCallback } from 'react';

interface LabelI18n { en?: string; nl?: string }
interface Preset { code: string; label_i18n: LabelI18n; sort: number }
interface Background {
  id: string;
  preset_code: string;
  label: string;
  storage_path: string;
  is_default: boolean;
  created_at: string;
}

function ProxyImg({ path, className }: { path: string; className?: string }) {
  return (
    <img
      src={`/api/bop/mkt/studio/proxy?path=${encodeURIComponent(path)}`}
      alt="background"
      className={className}
    />
  );
}

export default function PresetBackgroundsPage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null); // preset_code being uploaded
  const [error, setError] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState('');
  const [uploadingPreset, setUploadingPreset] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/bop/mkt/studio/preset-backgrounds');
    const data = await res.json() as { presets: Preset[]; backgrounds: Background[] };
    setPresets(data.presets ?? []);
    setBackgrounds(data.backgrounds ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const startUpload = (presetCode: string) => {
    setUploadingPreset(presetCode);
    setLabelInput('');
    setError(null);
    fileRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingPreset) return;
    e.target.value = '';

    const label = labelInput.trim() || file.name.replace(/\.[^.]+$/, '');
    setUploading(uploadingPreset);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('preset_code', uploadingPreset);
      fd.append('label', label);
      const res = await fetch('/api/bop/mkt/studio/preset-backgrounds', { method: 'POST', body: fd });
      if (!res.ok) {
        const j = await res.json() as { error?: string };
        throw new Error(j.error ?? 'Upload failed');
      }
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
      setUploadingPreset(null);
    }
  };

  const setDefault = async (id: string) => {
    await fetch(`/api/bop/mkt/studio/preset-backgrounds/${id}`, { method: 'PATCH' });
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this background?')) return;
    await fetch(`/api/bop/mkt/studio/preset-backgrounds/${id}`, { method: 'DELETE' });
    void load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Loading presets…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Preset Backgrounds</h1>
        <p className="text-slate-500 text-sm mt-1">
          Upload showroom background images for each AI Studio scene preset.
          The default is automatically offered when users select that preset.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { void handleFile(e); }} />

      <div className="grid gap-6">
        {presets.map(preset => {
          const presetBgs = backgrounds.filter(b => b.preset_code === preset.code);
          const isUploading = uploading === preset.code;

          return (
            <div key={preset.code} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Preset header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {preset.label_i18n?.en ?? preset.code}
                  </span>
                  <span className="ml-2 text-xs text-slate-400 font-mono">{preset.code}</span>
                  <span className="ml-3 text-xs text-slate-500">{presetBgs.length} background{presetBgs.length !== 1 ? 's' : ''}</span>
                </div>
                <button
                  onClick={() => startUpload(preset.code)}
                  disabled={isUploading}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isUploading ? 'Uploading…' : '+ Upload'}
                </button>
              </div>

              {/* Backgrounds grid */}
              {presetBgs.length === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">
                  No backgrounds uploaded yet — click Upload to add one.
                </div>
              ) : (
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {presetBgs.map(bg => (
                    <div key={bg.id} className={`group relative rounded-lg overflow-hidden border-2 transition-colors ${bg.is_default ? 'border-blue-500' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                      <ProxyImg path={bg.storage_path} className="w-full aspect-video object-cover" />

                      {bg.is_default && (
                        <div className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          DEFAULT
                        </div>
                      )}

                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                        <span className="text-white text-xs font-medium text-center line-clamp-2">{bg.label}</span>
                        <div className="flex gap-1.5 mt-1">
                          {!bg.is_default && (
                            <button
                              onClick={() => { void setDefault(bg.id); }}
                              className="px-2 py-1 rounded bg-blue-600 text-white text-[10px] font-semibold hover:bg-blue-700"
                            >
                              Set default
                            </button>
                          )}
                          <button
                            onClick={() => { void remove(bg.id); }}
                            className="px-2 py-1 rounded bg-red-600 text-white text-[10px] font-semibold hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
