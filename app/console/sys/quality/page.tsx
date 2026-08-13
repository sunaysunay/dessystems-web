'use client';
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

type QaScore = {
  id: string; run_at: string; commit_hash: string | null;
  tsc_errors: number | null; eslint_errors: number | null;
  knip_findings: number | null; duplication_pct: number | null; audit_high: number | null;
  db_checks_pass: number | null; db_checks_fail: number | null; db_checks_warn: number | null;
  ai_risk_score: number | null; ai_findings_critical: number | null; ai_findings_high: number | null;
  overall_score: number | null; triggered_by: string | null;
};

type QaCheck = {
  id: string; code: string; description: string; severity: string; enabled: boolean;
  latest_run?: { run_at: string; violation_count: number; sample: Record<string, unknown>[] | null } | null;
};

type GateFile = { file: string; count: number; errors: { line: number; col: number; code?: string; rule?: string; message: string }[] };
type GateData = {
  gate_dir: string; summary: Record<string, unknown> | null;
  tsc: { total: number; top_files: GateFile[] };
  eslint: { total: number; top_rules: { rule: string; count: number }[]; top_files: GateFile[] };
} | null;

type RunResult = { ok: boolean; pass: number; fail: number; warn: number; skip: number; duration_ms: number; output: string } | null;

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-400 text-sm">—</span>;
  const color = score >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : score >= 60 ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-red-100 text-red-700 border-red-200';
  return <span className={`inline-flex items-center justify-center rounded-lg border px-3 py-1 text-lg font-bold tabular-nums ${color}`}>{score}</span>;
}

function Sev({ s }: { s: string }) {
  const c: Record<string, string> = {
    critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700',
    medium: 'bg-amber-100 text-amber-700', low: 'bg-slate-100 text-slate-600',
  };
  return <span className={`rounded px-1.5 py-0.5 text-xs font-semibold uppercase ${c[s] ?? 'bg-slate-100 text-slate-500'}`}>{s}</span>;
}

function MetricRow({ label, value, unit = '', clickable, onClick }: {
  label: string; value: number | null; unit?: string; clickable?: boolean; onClick?: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      {clickable && value !== null && value > 0 ? (
        <button onClick={onClick} className="font-mono text-sm font-medium tabular-nums text-red-600 underline decoration-dotted hover:text-red-700">
          {value}{unit} ↓
        </button>
      ) : (
        <span className="font-mono text-sm font-medium tabular-nums text-slate-800">{value ?? '—'}{value !== null && unit}</span>
      )}
    </div>
  );
}

function ViolationDetail({ check }: { check: QaCheck }) {
  const [open, setOpen] = useState(false);
  const run = check.latest_run;
  if (!run) return <span className="text-slate-300">—</span>;
  if (run.violation_count === 0) return <span className="text-emerald-600 font-medium">0 ✓</span>;
  return (
    <div>
      <button onClick={() => setOpen(v => !v)} className="text-red-600 font-semibold tabular-nums underline decoration-dotted hover:text-red-700">
        {run.violation_count} {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-red-100 bg-red-50 p-3 text-left">
          <div className="mb-1.5 text-xs font-semibold text-red-700 uppercase tracking-wide">Affected records (sample)</div>
          {run.sample && run.sample.length > 0 ? (
            <div className="space-y-1">
              {run.sample.map((row, i) => (
                <div key={i} className="font-mono text-xs text-red-800 bg-white rounded px-2 py-1 border border-red-100 flex flex-wrap gap-x-3">
                  {Object.entries(row).map(([k, v]) => (
                    <span key={k}><span className="text-red-400">{k}:</span> {String(v ?? '—')}</span>
                  ))}
                </div>
              ))}
              {run.violation_count > (run.sample.length) && (
                <div className="text-xs text-red-400 pt-1">… and {run.violation_count - run.sample.length} more</div>
              )}
            </div>
          ) : <div className="text-xs text-red-400">No sample data recorded</div>}
        </div>
      )}
    </div>
  );
}

function GateDetail({ gate, mode }: { gate: GateData; mode: 'tsc' | 'eslint' }) {
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  if (!gate) return <div className="py-4 text-sm text-slate-400">Loading gate details…</div>;

  if (mode === 'tsc') {
    const { total, top_files } = gate.tsc;
    return (
      <div>
        <div className="mb-3 text-xs text-slate-500">{total} TypeScript errors across {top_files.length} files (showing top offenders)</div>
        <div className="space-y-1">
          {top_files.map(f => (
            <div key={f.file} className="rounded border border-slate-100 bg-slate-50">
              <button
                onClick={() => setExpandedFile(expandedFile === f.file ? null : f.file)}
                className="flex w-full items-center justify-between px-3 py-2 text-left"
              >
                <code className="text-xs text-slate-700 truncate max-w-[80%]">{f.file}</code>
                <span className="ml-2 shrink-0 text-xs font-semibold text-red-600">{f.count} errors {expandedFile === f.file ? '▲' : '▼'}</span>
              </button>
              {expandedFile === f.file && (
                <div className="border-t border-slate-100 bg-white px-3 py-2 space-y-1">
                  {f.errors.map((e, i) => (
                    <div key={i} className="font-mono text-xs text-slate-600">
                      <span className="text-slate-400">L{e.line}:{e.col}</span>
                      <span className="ml-2 text-amber-600">{e.code}</span>
                      <span className="ml-2">{e.message}</span>
                    </div>
                  ))}
                  {f.count > f.errors.length && <div className="text-xs text-slate-400">… +{f.count - f.errors.length} more in this file</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // eslint mode
  const { total, top_rules, top_files } = gate.eslint;
  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-500">{total} ESLint errors (errors only, warnings excluded)</div>
      <div>
        <div className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">By rule</div>
        <div className="flex flex-wrap gap-2">
          {top_rules.map(r => (
            <span key={r.rule} className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-800">
              {r.rule} <span className="font-semibold">{r.count}</span>
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">By file (top offenders)</div>
        <div className="space-y-1">
          {top_files.map(f => (
            <div key={f.file} className="rounded border border-slate-100 bg-slate-50">
              <button
                onClick={() => setExpandedFile(expandedFile === f.file ? null : f.file)}
                className="flex w-full items-center justify-between px-3 py-2 text-left"
              >
                <code className="text-xs text-slate-700 truncate max-w-[80%]">{f.file}</code>
                <span className="ml-2 shrink-0 text-xs font-semibold text-amber-600">{f.count} errors {expandedFile === f.file ? '▲' : '▼'}</span>
              </button>
              {expandedFile === f.file && (
                <div className="border-t border-slate-100 bg-white px-3 py-2 space-y-1">
                  {f.errors.map((e, i) => (
                    <div key={i} className="font-mono text-xs text-slate-600">
                      <span className="text-slate-400">L{e.line}:{e.col}</span>
                      <span className="ml-2 text-amber-600">{e.rule}</span>
                      <span className="ml-2">{e.message}</span>
                    </div>
                  ))}
                  {f.count > f.errors.length && <div className="text-xs text-slate-400">… +{f.count - f.errors.length} more</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SY042Page() {
  const [scores, setScores]     = useState<QaScore[]>([]);
  const [checks, setChecks]     = useState<QaCheck[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning]   = useState(false);
  const [runResult, setRunResult] = useState<RunResult>(null);
  const [showOutput, setShowOutput] = useState(false);
  const [gateData, setGateData] = useState<GateData>(null);
  const [gatePanel, setGatePanel] = useState<'tsc' | 'eslint' | null>(null);

  const reload = useCallback(async () => {
    const [scoreRes, checkRes] = await Promise.all([
      fetch('/api/bop/sys/quality').then(r => r.json()),
      fetch('/api/bop/sys/quality/checks').then(r => r.json()),
    ]);
    setScores(scoreRes.scores ?? []);
    setChecks(checkRes.checks ?? []);
  }, []);

  useEffect(() => { void reload().then(() => setLoading(false)); }, [reload]);

  const loadGate = useCallback(async (mode: 'tsc' | 'eslint') => {
    if (gatePanel === mode) { setGatePanel(null); return; }
    setGatePanel(mode);
    if (!gateData) {
      const res = await fetch('/api/bop/sys/quality/gate');
      const data = await res.json();
      setGateData(data);
    }
  }, [gateData, gatePanel]);

  const runInspection = async () => {
    setRunning(true); setRunResult(null);
    try {
      const res = await fetch('/api/bop/sys/quality/run', { method: 'POST' });
      const data = await res.json();
      setRunResult(data);
      await reload();
    } catch(e) {
      setRunResult({ ok: false, pass: 0, fail: 0, warn: 0, skip: 0, duration_ms: 0, output: String(e) });
    } finally { setRunning(false); }
  };

  const latest = scores[0] ?? null;
  const prev   = scores[1] ?? null;

  const fmt = (ms: number) => ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(1)}s`;

  return (
    <div className="p-6 max-w-6xl">
      <ScreenHeader title="Quality Inspector" description="Code quality dashboard — gate scores, DB invariants, AI risk" />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">Loading…</div>
      ) : (
        <div className="space-y-6">

          {/* ── Actions bar ── */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">
              {latest ? `Last score run: ${new Date(latest.run_at).toLocaleString()}` : 'No score runs yet'}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { void runInspection(); }} disabled={running}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-wait">
                {running ? <><span className="animate-spin inline-block">⟳</span> Running…</> : <>▶ Run DB Inspection</>}
              </button>
              <button onClick={() => { void (async () => { setRefreshing(true); await reload(); setRefreshing(false); })(); }} disabled={refreshing}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                {refreshing ? <span className="animate-spin inline-block">⟳</span> : <>↻</>}
              </button>
            </div>
          </div>

          {/* ── Run result banner ── */}
          {runResult && (
            <div className={`rounded-xl border px-5 py-3 flex items-center justify-between gap-4 flex-wrap ${runResult.fail > 0 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <span className={`font-semibold ${runResult.fail > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {runResult.fail > 0 ? `✗ ${runResult.fail} failing` : '✓ All passed'}
                </span>
                <span className="text-slate-500">Pass: {runResult.pass} · Warn: {runResult.warn} · Skip: {runResult.skip}</span>
                <span className="text-slate-400 text-xs">⏱ {fmt(runResult.duration_ms)}</span>
              </div>
              <button onClick={() => setShowOutput(v => !v)} className="text-xs text-slate-400 hover:text-slate-600 underline shrink-0">
                {showOutput ? 'Hide output' : 'Show output'}
              </button>
            </div>
          )}
          {showOutput && runResult?.output && (
            <pre className="rounded-xl border border-slate-200 bg-slate-900 text-slate-100 p-4 text-xs overflow-x-auto max-h-80 leading-5">{runResult.output}</pre>
          )}

          {/* ── Score card + latest run ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col items-center justify-center gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Overall Score</div>
              <ScoreBadge score={latest?.overall_score ?? null} />
              {prev && <div className="text-xs text-slate-400">prev: {prev.overall_score ?? '—'}</div>}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-3">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Latest Score Run</div>
              {latest ? (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><div className="text-xs text-slate-400 mb-1">Commit</div><code className="font-mono text-slate-700">{latest.commit_hash ?? '—'}</code></div>
                  <div><div className="text-xs text-slate-400 mb-1">Run at</div><span className="text-slate-700">{new Date(latest.run_at).toLocaleString()}</span></div>
                  <div><div className="text-xs text-slate-400 mb-1">Triggered by</div><span className="text-slate-700 capitalize">{latest.triggered_by ?? '—'}</span></div>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">No score runs yet. Run <code className="bg-slate-100 px-1 rounded">bop-inspect score</code> after DB inspection.</p>
              )}
            </div>
          </div>

          {/* ── Layer panels ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

            {/* Layer 1 — Gate */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
                <span className="text-sm font-semibold text-slate-700">Gate — Deterministic</span>
              </div>
              <MetricRow label="TSC errors" value={latest?.tsc_errors ?? null}
                clickable onClick={() => void loadGate('tsc')} />
              <MetricRow label="ESLint errors" value={latest?.eslint_errors ?? null}
                clickable onClick={() => void loadGate('eslint')} />
              <MetricRow label="Knip findings" value={latest?.knip_findings ?? null} />
              <MetricRow label="Duplication" value={latest?.duplication_pct ?? null} unit="%" />
              <MetricRow label="Audit high/crit" value={latest?.audit_high ?? null} />
              {(latest?.tsc_errors ?? 0) > 0 || (latest?.eslint_errors ?? 0) > 0 ? (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => void loadGate('tsc')} className="text-xs text-blue-600 hover:underline">TSC details</button>
                  <span className="text-slate-300">·</span>
                  <button onClick={() => void loadGate('eslint')} className="text-xs text-blue-600 hover:underline">ESLint details</button>
                </div>
              ) : null}
            </div>

            {/* Layer 2 — DB */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">2</span>
                <span className="text-sm font-semibold text-slate-700">DB & Domain Rules</span>
              </div>
              <MetricRow label="Checks passing" value={latest?.db_checks_pass ?? null} />
              <MetricRow label="Checks failing" value={latest?.db_checks_fail ?? null} />
              <MetricRow label="Warnings" value={latest?.db_checks_warn ?? null} />
            </div>

            {/* Layer 3 — AI */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">3</span>
                <span className="text-sm font-semibold text-slate-700">AI Senior Review</span>
              </div>
              <MetricRow label="Risk score" value={latest?.ai_risk_score ?? null} unit="/100" />
              <MetricRow label="Critical findings" value={latest?.ai_findings_critical ?? null} />
              <MetricRow label="High findings" value={latest?.ai_findings_high ?? null} />
              {latest?.ai_risk_score === null && (
                <p className="mt-3 text-xs text-slate-400">Run <code className="bg-slate-100 px-1 rounded">bop-inspect review --diff HEAD~1</code> then <code className="bg-slate-100 px-1 rounded">bop-inspect score</code></p>
              )}
            </div>
          </div>

          {/* ── TSC / ESLint detail panel ── */}
          {gatePanel && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setGatePanel('tsc')}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${gatePanel === 'tsc' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    TSC errors {gateData ? `(${gateData.tsc.total})` : ''}
                  </button>
                  <button onClick={() => setGatePanel('eslint')}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${gatePanel === 'eslint' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    ESLint errors {gateData ? `(${gateData.eslint.total})` : ''}
                  </button>
                  {gateData && <span className="text-xs text-slate-400">gate run: {gateData.gate_dir}</span>}
                </div>
                <button onClick={() => setGatePanel(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
              </div>
              {gateData ? (
                <GateDetail gate={gateData} mode={gatePanel} />
              ) : (
                <div className="text-sm text-slate-400">Loading…</div>
              )}
            </div>
          )}

          {/* ── Business invariants ── */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Business Invariants (qa_checks)</span>
              <span className="text-xs text-slate-400">Click violation count to see affected records</span>
            </div>
            {checks.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-400">No checks — run <code>bop-inspect db</code> first</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Code</th>
                    <th className="px-4 py-2 text-left">Description</th>
                    <th className="px-4 py-2 text-left">Severity</th>
                    <th className="px-4 py-2 text-right">Last violations</th>
                    <th className="px-4 py-2 text-right">Last run</th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map(c => (
                    <tr key={c.id} className="border-t border-slate-50 align-top hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">{c.code}</td>
                      <td className="px-4 py-3 text-slate-600">{c.description}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><Sev s={c.severity} /></td>
                      <td className="px-4 py-3 text-right"><ViolationDetail check={c} /></td>
                      <td className="px-4 py-3 text-right text-xs text-slate-400 whitespace-nowrap">
                        {c.latest_run ? new Date(c.latest_run.run_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Score history ── */}
          {scores.length > 1 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3">
                <span className="text-sm font-semibold text-slate-700">Score History</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Run at</th>
                      <th className="px-4 py-2 text-left">Commit</th>
                      <th className="px-4 py-2 text-right">Score</th>
                      <th className="px-4 py-2 text-right">TSC</th>
                      <th className="px-4 py-2 text-right">ESLint</th>
                      <th className="px-4 py-2 text-right">DB fail</th>
                      <th className="px-4 py-2 text-right">AI risk</th>
                      <th className="px-4 py-2 text-left">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {scores.slice(0, 20).map(s => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">{new Date(s.run_at).toLocaleString()}</td>
                        <td className="px-4 py-2 font-mono text-xs text-slate-600">{s.commit_hash ?? '—'}</td>
                        <td className="px-4 py-2 text-right"><ScoreBadge score={s.overall_score ?? null} /></td>
                        <td className="px-4 py-2 text-right tabular-nums text-slate-700">{s.tsc_errors ?? '—'}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-slate-700">{s.eslint_errors ?? '—'}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-slate-700">{s.db_checks_fail ?? '—'}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-slate-700">{s.ai_risk_score ?? '—'}</td>
                        <td className="px-4 py-2 text-xs text-slate-400 capitalize">{s.triggered_by ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
