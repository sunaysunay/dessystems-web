'use client';

import { useState } from 'react';

interface ComponentDetail {
  raw: number;
  adjusted: number;
  score: number;
  peer_level: string;
  n: number;
  confidence: number;
  weight: number;
  suppressed: boolean;
}

interface ScoreExplainProps {
  score: number | null;
  suppressed_reason?: string | null;
  components: Record<string, ComponentDetail>;
  labels?: Record<string, string>;
}

export function ScoreExplain({ score, suppressed_reason, components, labels = {} }: ScoreExplainProps) {
  const [open, setOpen] = useState(false);

  if (score === null && suppressed_reason) {
    return (
      <div className="score-explain suppressed">
        <span className="score-value">—</span>
        <span className="score-reason">{friendlyReason(suppressed_reason)}</span>
      </div>
    );
  }

  const entries = Object.entries(components).sort((a, b) => b[1].weight - a[1].weight);

  return (
    <div className="score-explain">
      <button
        className="score-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        title="Why this number?"
      >
        <span className="score-value">{score !== null ? score.toFixed(1) : '—'}</span>
        <span className="score-chevron">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="score-panel">
          <div className="score-panel-header">Score breakdown</div>
          <table className="score-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Weight</th>
                <th>Raw</th>
                <th>Adjusted</th>
                <th>Score</th>
                <th>Peers</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([key, comp]) => (
                <tr key={key} className={comp.suppressed ? 'suppressed-row' : ''}>
                  <td>{labels[key] ?? key}</td>
                  <td>{(comp.weight * 100).toFixed(0)}%</td>
                  <td>{comp.suppressed ? '—' : formatMetric(comp.raw)}</td>
                  <td>{comp.suppressed ? '—' : formatMetric(comp.adjusted)}</td>
                  <td>{comp.suppressed ? '—' : comp.score.toFixed(1)}</td>
                  <td>
                    {comp.suppressed
                      ? 'insufficient data'
                      : `n=${comp.n} (${comp.peer_level.replace(/_/g, ' ')})`
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {score !== null && (
            <div className="score-summary">
              Weighted composite: <strong>{score.toFixed(1)}</strong> / 100
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatMetric(val: number): string {
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  if (val < 0.01 && val > 0) return val.toFixed(4);
  if (val < 1) return (val * 100).toFixed(1) + '%';
  return val.toFixed(1);
}

function friendlyReason(reason: string): string {
  switch (reason) {
    case 'cost_data_missing': return 'Cost data incomplete — score unavailable';
    case 'no_scorable_components': return 'No data available for scoring';
    case 'insufficient_data': return 'Not enough data to compute score';
    default: return reason.replace(/_/g, ' ');
  }
}

export function HealthScore({ score, label }: { score: number; label?: string }) {
  const color = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
  const tier = score >= 80 ? 'Healthy' : score >= 50 ? 'Fair' : 'Needs attention';

  return (
    <div className="health-score" style={{ borderColor: color }}>
      <div className="health-score-value" style={{ color }}>{score.toFixed(0)}</div>
      <div className="health-score-label">{label ?? tier}</div>
    </div>
  );
}
