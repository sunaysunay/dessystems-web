'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

interface FuncInfo {
  function_name: string;
  result_type: string;
  argument_types: string;
  function_type: string;
  volatility: string;
  security: string;
  language: string;
  description: string | null;
}

interface FuncSource {
  function_name: string;
  result_type: string;
  argument_types: string;
  language: string;
  source_code: string;
  volatility: string;
  security: string;
}

export default function FunctionsPage() {
  const [schemas, setSchemas] = useState<string[]>([]);
  const [selectedSchema, setSelectedSchema] = useState('public');
  const [functions, setFunctions] = useState<FuncInfo[]>([]);
  const [selectedFunc, setSelectedFunc] = useState<string | null>(null);
  const [source, setSource] = useState<FuncSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/bop/dba/schema?action=schemas')
      .then(r => r.json())
      .then(d => {
        const s = (d.schemas ?? []).filter((x: any) => !x.is_system).map((x: any) => x.schema_name);
        setSchemas(s);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    setFunctions([]);
    setSelectedFunc(null);
    setSource(null);
    fetch(`/api/bop/dba/functions?action=list&schema=${selectedSchema}`)
      .then(r => r.json())
      .then(d => setFunctions(d.functions ?? []))
      .catch(() => {});
  }, [selectedSchema]);

  function loadSource(name: string) {
    setSelectedFunc(name);
    setSourceLoading(true);
    fetch(`/api/bop/dba/functions?action=source&schema=${selectedSchema}&name=${name}`)
      .then(r => r.json())
      .then(d => {
        const fns = d.functions ?? [];
        setSource(fns.length > 0 ? fns[0] : null);
        setSourceLoading(false);
      })
      .catch(() => setSourceLoading(false));
  }

  const filtered = functions.filter(f => {
    if (filter && !f.function_name.toLowerCase().includes(filter.toLowerCase())) return false;
    if (typeFilter !== 'all' && f.function_type !== typeFilter) return false;
    return true;
  });

  const funcTypes = Array.from(new Set(functions.map(f => f.function_type)));

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4">
      <ScreenHeader />
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      <div className="flex gap-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* Left panel */}
        <div className="w-80 shrink-0 space-y-3">
          <div className="flex gap-2">
            <select
              value={selectedSchema}
              onChange={e => setSelectedSchema(e.target.value)}
              className="flex-1 border rounded px-2 py-1.5 text-sm bg-white"
            >
              {schemas.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {funcTypes.length > 1 && (
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm bg-white"
              >
                <option value="all">All types</option>
                {funcTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
          </div>

          <input
            type="text"
            placeholder="Filter functions..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm"
          />

          <div className="text-xs text-gray-400 px-1">{filtered.length} function{filtered.length !== 1 ? 's' : ''}</div>

          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[calc(100vh-360px)] overflow-y-auto">
              {loading ? (
                <div className="p-3 text-sm text-gray-500">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="p-3 text-sm text-gray-400">No functions found</div>
              ) : (
                filtered.map(f => (
                  <button
                    key={f.function_name + f.argument_types}
                    onClick={() => loadSource(f.function_name)}
                    className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 hover:bg-gray-50 ${
                      selectedFunc === f.function_name ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono px-1 rounded ${
                        f.security === 'DEFINER' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {f.function_type === 'function' ? 'fn' : 'proc'}
                      </span>
                      <span className="font-mono text-xs truncate flex-1">{f.function_name}</span>
                      <span className="text-[10px] text-gray-400">{f.language}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5 truncate pl-7">
                      ({f.argument_types || 'void'}) → {f.result_type}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right panel — source viewer */}
        <div className="flex-1 min-w-0">
          {!selectedFunc ? (
            <div className="border rounded-lg p-12 text-center text-gray-400">
              <div className="text-lg">Select a function to view source</div>
              <div className="text-sm mt-1">{functions.length} functions in <span className="font-mono">{selectedSchema}</span></div>
            </div>
          ) : sourceLoading ? (
            <div className="p-4 text-sm text-gray-500">Loading source...</div>
          ) : source ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-semibold font-mono">{source.function_name}</h2>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-0.5 bg-gray-100 rounded">{source.language}</span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded">{source.volatility}</span>
                  <span className={`px-2 py-0.5 rounded ${
                    source.security === 'DEFINER' ? 'bg-red-50 text-red-600' : 'bg-gray-100'
                  }`}>
                    SECURITY {source.security}
                  </span>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <span className="font-mono">({source.argument_types || 'void'})</span>
                <span className="mx-2">→</span>
                <span className="font-mono">{source.result_type}</span>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-1.5 text-xs text-gray-500 border-b font-medium">Source</div>
                <pre className="p-4 text-xs font-mono overflow-x-auto bg-gray-900 text-gray-100 leading-relaxed whitespace-pre-wrap">
                  {source.source_code}
                </pre>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-8 text-center text-gray-400">
              <div className="text-sm">Source not available</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
