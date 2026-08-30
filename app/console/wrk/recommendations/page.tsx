'use client';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useState, useEffect } from 'react';

/* ── types ── */
interface Recommendation {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  count: number;
  action_url: string;
}

interface RecommendationsData {
  recommendations: Recommendation[];
  total: number;
  generated_at: string;
}

/* ── severity styling ── */
const SEVERITY_STRIPE: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Kritiek',
  warning: 'Waarschuwing',
  info: 'Informatie',
};

export default function RecommendationsPage() {
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/bop/wrk/recommendations')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Count by severity
  const counts = { critical: 0, warning: 0, info: 0 };
  for (const rec of data?.recommendations ?? []) {
    counts[rec.severity]++;
  }

  return (
    <div className="p-6 space-y-6">
      <ScreenHeader />

      {loading && (
        <div className="rounded-lg border bg-white dark:bg-slate-800 p-8 text-center text-slate-500">
          Aanbevelingen worden geladen...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-400">
          Fout: {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* Summary bar */}
          <div className="flex flex-wrap gap-4">
            {(['critical', 'warning', 'info'] as const).map((sev) => (
              <div
                key={sev}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 ${SEVERITY_BADGE[sev]}`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${SEVERITY_STRIPE[sev]}`} />
                <span className="text-sm font-medium">
                  {counts[sev]} {SEVERITY_LABELS[sev]}
                </span>
              </div>
            ))}
          </div>

          {/* Recommendation cards */}
          {data.recommendations.length === 0 ? (
            <div className="rounded-lg border bg-white dark:bg-slate-800 p-8 text-center text-slate-500 dark:text-slate-400">
              <p className="text-lg font-medium">Geen aanbevelingen</p>
              <p className="text-sm mt-1">Er zijn momenteel geen actiepunten gevonden.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recommendations.map((rec, idx) => (
                <div
                  key={`${rec.type}-${idx}`}
                  className="flex rounded-lg border bg-white dark:bg-slate-800 overflow-hidden"
                >
                  {/* Severity stripe */}
                  <div className={`w-1.5 flex-shrink-0 ${SEVERITY_STRIPE[rec.severity]}`} />

                  {/* Content */}
                  <div className="flex-1 p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          {rec.title}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_BADGE[rec.severity]}`}>
                          {rec.count}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {rec.description}
                      </p>
                    </div>

                    <a
                      href={rec.action_url}
                      className="flex-shrink-0 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 whitespace-nowrap"
                    >
                      Bekijk
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Laatst bijgewerkt:{' '}
            {new Date(data.generated_at).toLocaleString('nl-NL', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}
          </p>
        </>
      )}
    </div>
  );
}
