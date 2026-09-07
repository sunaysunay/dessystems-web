'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

interface ThemePreset {
  id: string;
  name: string;
  concept: string;
  description: string;
  colors: { bg: string; card: string; text: string; accent: string; muted: string; border: string };
  font: string;
  radius: string;
  sample: { heading: string; body: string };
}

const THEMES: ThemePreset[] = [
  {
    id: 'hyper-clean',
    name: 'Hyper Clean',
    concept: 'Concept 9',
    description: 'Pure monochrome. Black on white, extreme whitespace, Inter 900 typography. Only green (#22c55e) for cost savings.',
    colors: { bg: '#ffffff', card: '#fafafa', text: '#0a0a0a', accent: '#0a0a0a', muted: '#999999', border: '#f0f0f0' },
    font: 'Inter',
    radius: '12px',
    sample: { heading: 'Your team costs less with AI.', body: 'Deploy AI workers across your supply chain.' },
  },
  {
    id: 'swiss-minimal',
    name: 'Swiss Minimal',
    concept: 'Concept 4',
    description: 'Helvetica-inspired grid system. Red accent on clean white, rigid structure, editorial precision.',
    colors: { bg: '#ffffff', card: '#f8f8f8', text: '#1a1a1a', accent: '#e63322', muted: '#888888', border: '#e5e5e5' },
    font: 'Helvetica Neue',
    radius: '0px',
    sample: { heading: 'Precision-engineered operations.', body: 'Swiss engineering meets supply chain automation.' },
  },
  {
    id: 'warm-editorial',
    name: 'Warm Editorial',
    concept: 'Concept 1',
    description: 'Warm cream palette with serif headings. Deep navy accent, soft shadows, approachable and trustworthy.',
    colors: { bg: '#faf8f5', card: '#ffffff', text: '#1c1917', accent: '#1e3a5f', muted: '#78716c', border: '#e7e5e4' },
    font: 'Georgia',
    radius: '16px',
    sample: { heading: 'Commerce, simplified.', body: 'AI agents that feel like part of your team.' },
  },
];

export default function SY044Page() {
  const [active, setActive] = useState('hyper-clean');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  useEffect(() => {
    void fetch('/api/bop/sys/theme-config')
      .then(r => r.json())
      .then(j => { setActive(j.theme ?? 'hyper-clean'); setLoading(false); });
  }, []);

  async function saveTheme(id: string) {
    setSaving(true);
    setActive(id);
    const res = await fetch('/api/bop/sys/theme-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: id }),
    });
    setSaving(false);
    if (res.ok) {
      showToast(`Theme "${THEMES.find(t => t.id === id)?.name}" activated`);
    } else {
      showToast('Failed to save theme');
    }
  }

  return (
    <div>
      <ScreenHeader title="UI Theme Configuration" description="Site visual theme for dessystems.io — SY044" />

      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading…</div>
      ) : (
        <div className="space-y-6">
          {/* Active indicator */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <p className="text-sm font-medium text-slate-700">
                Active theme: <span className="font-bold text-slate-900">{THEMES.find(t => t.id === active)?.name}</span>
                <span className="ml-2 text-xs text-slate-400">({THEMES.find(t => t.id === active)?.concept})</span>
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              The selected theme applies to dessystems.io public-facing pages. Changes take effect on next page load.
            </p>
          </div>

          {/* Theme cards */}
          <div className="grid gap-5 lg:grid-cols-3">
            {THEMES.map(theme => {
              const isActive = theme.id === active;
              return (
                <div
                  key={theme.id}
                  className={`rounded-xl border-2 transition-all ${
                    isActive ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
                  } bg-white overflow-hidden`}
                >
                  {/* Preview */}
                  <div
                    className="p-6 min-h-[200px] flex flex-col justify-between"
                    style={{ background: theme.colors.bg, borderBottom: `1px solid ${theme.colors.border}` }}
                  >
                    <div>
                      <div
                        className="text-lg font-bold leading-tight mb-2"
                        style={{ color: theme.colors.text, fontFamily: theme.font, borderRadius: theme.radius }}
                      >
                        {theme.sample.heading}
                      </div>
                      <div className="text-xs" style={{ color: theme.colors.muted, fontFamily: theme.font }}>
                        {theme.sample.body}
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <div
                        className="px-3 py-1.5 text-xs font-semibold text-white"
                        style={{ background: theme.colors.accent, borderRadius: theme.radius === '0px' ? '0' : '6px' }}
                      >
                        Deploy AI
                      </div>
                      <div
                        className="px-3 py-1.5 text-xs font-semibold"
                        style={{
                          color: theme.colors.text,
                          border: `1px solid ${theme.colors.border}`,
                          borderRadius: theme.radius === '0px' ? '0' : '6px',
                        }}
                      >
                        Learn more
                      </div>
                    </div>

                    {/* Color swatches */}
                    <div className="mt-4 flex gap-1.5">
                      {Object.entries(theme.colors).map(([key, val]) => (
                        <div key={key} className="group relative">
                          <div
                            className="h-5 w-5 rounded-full border border-slate-200"
                            style={{ background: val }}
                          />
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            {key}: {val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-bold text-slate-900">{theme.name}</h3>
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{theme.concept}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">{theme.description}</p>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-3">
                      <span>Font: {theme.font}</span>
                      <span>·</span>
                      <span>Radius: {theme.radius}</span>
                    </div>

                    {isActive ? (
                      <div className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 py-2 text-xs font-semibold text-blue-600">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Active
                      </div>
                    ) : (
                      <button
                        onClick={() => { void saveTheme(theme.id); }}
                        disabled={saving}
                        className="w-full rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                      >
                        {saving ? 'Applying…' : 'Activate Theme'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Token reference */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">CSS Token Reference</p>
            <p className="text-xs text-slate-500 mb-3">
              The public site reads the active theme via <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">/api/bop/sys/theme-config</code> and applies CSS custom properties accordingly.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="py-2 pr-4 font-semibold text-slate-500">Token</th>
                    {THEMES.map(t => (
                      <th key={t.id} className="py-2 pr-4 font-semibold text-slate-500">{t.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono text-[10px]">
                  {(['bg', 'card', 'text', 'accent', 'muted', 'border'] as const).map(key => (
                    <tr key={key} className="border-b border-slate-50">
                      <td className="py-1.5 pr-4 text-slate-600">--des-{key}</td>
                      {THEMES.map(t => (
                        <td key={t.id} className="py-1.5 pr-4">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="inline-block h-3 w-3 rounded-sm border border-slate-200" style={{ background: t.colors[key] }} />
                            {t.colors[key]}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-b border-slate-50">
                    <td className="py-1.5 pr-4 text-slate-600">--des-font</td>
                    {THEMES.map(t => <td key={t.id} className="py-1.5 pr-4">{t.font}</td>)}
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-4 text-slate-600">--des-radius</td>
                    {THEMES.map(t => <td key={t.id} className="py-1.5 pr-4">{t.radius}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
