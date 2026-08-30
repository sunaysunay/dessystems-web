'use client';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useState, useEffect } from 'react';

/* ── types ── */
interface TechSlot {
  id: string;
  start_at: string;
  end_at: string;
  slot_type: string;
  order?: { id: string; wo_number: string; status: string; description?: string } | null;
}

interface TechAvailability {
  id: string;
  display_name: string;
  grade: string;
  has_slots_today: boolean;
  slots: TechSlot[];
}

interface AttentionWO {
  id: string;
  wo_number: string;
  description: string | null;
  status: string;
}

interface Inspection {
  id: string;
  license_plate: string;
  apk_expiry_date: string;
  status: string;
}

interface BriefingData {
  slots: TechSlot[];
  waiting_parts: AttentionWO[];
  waiting_approval: AttentionWO[];
  technicians: TechAvailability[];
  inspections: Inspection[];
  generated_at: string;
}

/* ── constants ── */
const GRADE_COLORS: Record<string, string> = {
  leerling: 'bg-sky-100 text-sky-800 border-sky-300',
  monteur: 'bg-blue-100 text-blue-800 border-blue-300',
  senior_monteur: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  meester: 'bg-purple-100 text-purple-800 border-purple-300',
  specialist: 'bg-amber-100 text-amber-800 border-amber-300',
};

const GRADE_LABELS: Record<string, string> = {
  leerling: 'Leerling',
  monteur: 'Monteur',
  senior_monteur: 'Senior Monteur',
  meester: 'Meester',
  specialist: 'Specialist',
};

const DUTCH_DAYS = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
const DUTCH_MONTHS = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
];

/* ── helpers ── */
function formatDutchDate(d: Date): string {
  return `${DUTCH_DAYS[d.getDay()]} ${d.getDate()} ${DUTCH_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function slotHours(slot: TechSlot): number {
  const start = new Date(slot.start_at).getTime();
  const end = new Date(slot.end_at).getTime();
  return Math.round(((end - start) / 3_600_000) * 10) / 10;
}

export default function DailyBriefingPage() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/bop/wrk/briefing')
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

  const today = new Date();
  const todayStr = formatDutchDate(today);

  // Summary stats
  const totalSlots = data?.slots?.length ?? 0;
  const totalHours = (data?.slots ?? []).reduce((sum, s) => sum + slotHours(s), 0);
  const techWithSlots = (data?.technicians ?? []).filter((t) => t.has_slots_today).length;
  const totalTechs = data?.technicians?.length ?? 0;

  return (
    <div className="p-6 space-y-6">
      <ScreenHeader />

      {/* Date header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Werkplaats Briefing
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{todayStr}</p>
      </div>

      {loading && (
        <div className="rounded-lg border bg-white dark:bg-slate-800 p-8 text-center text-slate-500">
          Briefing wordt geladen...
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard label="Geplande slots" value={totalSlots} />
            <SummaryCard label="Totale uren" value={Math.round(totalHours * 10) / 10} />
            <SummaryCard label="Monteurs ingepland" value={`${techWithSlots} / ${totalTechs}`} />
            <SummaryCard label="Keuringen vandaag" value={data.inspections.length} />
          </div>

          {/* Technician overview */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
              Monteur Overzicht
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.technicians.map((tech) => {
                const techHours = tech.slots.reduce((sum, s) => sum + slotHours(s), 0);
                const gradeStyle = GRADE_COLORS[tech.grade] ?? 'bg-slate-100 text-slate-700 border-slate-300';
                const gradeLabel = GRADE_LABELS[tech.grade] ?? tech.grade;

                return (
                  <div
                    key={tech.id}
                    className="rounded-lg border bg-white dark:bg-slate-800 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {tech.display_name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${gradeStyle}`}>
                        {gradeLabel}
                      </span>
                    </div>

                    {tech.has_slots_today ? (
                      <>
                        <div className="space-y-1.5">
                          {tech.slots.map((slot) => (
                            <div
                              key={slot.id}
                              className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-700/50 rounded px-2 py-1"
                            >
                              <span className="text-slate-600 dark:text-slate-300">
                                {formatTime(slot.start_at)} – {formatTime(slot.end_at)}
                              </span>
                              <span className="font-mono text-xs text-slate-800 dark:text-slate-200">
                                {slot.order?.wo_number ?? slot.slot_type}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 text-right">
                          Totaal: {Math.round(techHours * 10) / 10} uur
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-slate-400 dark:text-slate-500 italic py-2">
                        Geen planning
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Attention points */}
          {(data.waiting_parts.length > 0 || data.waiting_approval.length > 0) && (
            <section>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
                Aandachtspunten
              </h2>
              <div className="space-y-2">
                {data.waiting_parts.map((wo) => (
                  <div
                    key={wo.id}
                    className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-4 py-3"
                  >
                    <span className="text-amber-600 dark:text-amber-400 font-medium text-sm whitespace-nowrap">
                      Wacht op onderdelen
                    </span>
                    <span className="font-mono text-sm text-slate-800 dark:text-slate-200">
                      {wo.wo_number}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {wo.description}
                    </span>
                  </div>
                ))}
                {data.waiting_approval.map((wo) => (
                  <div
                    key={wo.id}
                    className="flex items-center gap-3 rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-900/20 px-4 py-3"
                  >
                    <span className="text-orange-600 dark:text-orange-400 font-medium text-sm whitespace-nowrap">
                      Wacht op goedkeuring
                    </span>
                    <span className="font-mono text-sm text-slate-800 dark:text-slate-200">
                      {wo.wo_number}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {wo.description}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Inspections */}
          {data.inspections.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
                Keuringen Vandaag
              </h2>
              <div className="space-y-2">
                {data.inspections.map((insp) => (
                  <div
                    key={insp.id}
                    className="flex items-center gap-3 rounded-lg border bg-white dark:bg-slate-800 px-4 py-3"
                  >
                    <span className="font-mono text-sm text-slate-800 dark:text-slate-200">
                      {insp.license_plate}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {insp.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/* ── sub-components ── */
function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white dark:bg-slate-800 p-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{String(value)}</p>
    </div>
  );
}
