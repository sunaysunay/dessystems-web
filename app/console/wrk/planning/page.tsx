'use client';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useState, useEffect } from 'react';

/* ── types ── */
interface Technician {
  id: string;
  display_name: string;
  grade: string;
  specializations: string[] | null;
  bay_preference: string | null;
  hourly_capacity: number | null;
}

interface Slot {
  id: string;
  technician_id: string;
  bay_id: string | null;
  start_at: string;
  end_at: string;
  work_order_id: string | null;
  slot_type: 'work_order' | 'break' | 'meeting' | 'training' | 'absence';
  notes: string | null;
  technician?: { id: string; display_name: string; grade: string } | null;
  order?: { id: string; wo_number: string; status: string } | null;
}

type SlotType = Slot['slot_type'];

const SLOT_TYPES: SlotType[] = ['work_order', 'break', 'meeting', 'training', 'absence'];

const SLOT_COLORS: Record<SlotType, string> = {
  work_order: 'bg-blue-100 border-blue-300 text-blue-800',
  break: 'bg-gray-100 border-gray-300 text-gray-700',
  meeting: 'bg-purple-100 border-purple-300 text-purple-800',
  training: 'bg-green-100 border-green-300 text-green-800',
  absence: 'bg-red-100 border-red-300 text-red-800',
};

const SLOT_LABELS: Record<SlotType, string> = {
  work_order: 'Work Order',
  break: 'Break',
  meeting: 'Meeting',
  training: 'Training',
  absence: 'Absence',
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ── helpers ── */
function getMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatShortDate(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function hoursBetween(start: string, end: string): number {
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000);
}

function isSameDay(isoStr: string, dayDate: Date): boolean {
  const d = new Date(isoStr);
  return d.getFullYear() === dayDate.getFullYear() &&
    d.getMonth() === dayDate.getMonth() &&
    d.getDate() === dayDate.getDate();
}

/* ── component ── */
export default function PlanningBoardPage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTechId, setFormTechId] = useState('');
  const [formDay, setFormDay] = useState('');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('09:00');
  const [formSlotType, setFormSlotType] = useState<SlotType>('work_order');
  const [formWO, setFormWO] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Week days (Mon-Sat)
  const weekDays: Date[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    weekDays.push(d);
  }

  function loadData() {
    setLoading(true);
    fetch(`/api/bop/wrk/planning?week=${formatDate(weekStart)}`)
      .then(r => r.json())
      .then(res => {
        setSlots(res.data || []);
        setTechnicians(res.technicians || []);
      })
      .catch(() => {
        setSlots([]);
        setTechnicians([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, [weekStart]);

  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  }

  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  }

  function goToday() {
    setWeekStart(getMonday(new Date()));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTechId || !formDay) return;

    setSaving(true);
    const start_at = `${formDay}T${formStartTime}:00`;
    const end_at = `${formDay}T${formEndTime}:00`;

    fetch('/api/bop/wrk/planning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        technician_id: formTechId,
        start_at,
        end_at,
        slot_type: formSlotType,
        work_order_id: formSlotType === 'work_order' && formWO ? formWO : null,
        notes: formNotes || null,
      }),
    })
      .then(r => r.json())
      .then(() => {
        loadData();
        setFormTechId('');
        setFormDay('');
        setFormStartTime('08:00');
        setFormEndTime('09:00');
        setFormSlotType('work_order');
        setFormWO('');
        setFormNotes('');
        setShowForm(false);
      })
      .finally(() => setSaving(false));
  }

  function deleteSlot(id: string) {
    if (!confirm('Delete this slot?')) return;
    fetch('/api/bop/wrk/planning', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).then(() => loadData());
  }

  // Slots for a given technician + day
  function slotsFor(techId: string, day: Date): Slot[] {
    return slots.filter(s => s.technician_id === techId && isSameDay(s.start_at, day));
  }

  // Total hours for a day (all technicians)
  function dayTotalHours(day: Date): number {
    return slots
      .filter(s => isSameDay(s.start_at, day))
      .reduce((sum, s) => sum + hoursBetween(s.start_at, s.end_at), 0);
  }

  // Total hours for a technician on a day
  function techDayHours(techId: string, day: Date): number {
    return slotsFor(techId, day).reduce((sum, s) => sum + hoursBetween(s.start_at, s.end_at), 0);
  }

  return (
    <div className="p-6 space-y-6">
      <ScreenHeader />

      {/* Week navigation */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={prevWeek} className="px-3 py-1.5 rounded border bg-card hover:bg-accent text-sm font-medium">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="inline mr-1 -mt-0.5">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Previous Week
        </button>
        <button onClick={goToday} className="px-3 py-1.5 rounded border bg-card hover:bg-accent text-sm font-medium">
          Today
        </button>
        <button onClick={nextWeek} className="px-3 py-1.5 rounded border bg-card hover:bg-accent text-sm font-medium">
          Next Week
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="inline ml-1 -mt-0.5">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className="text-sm text-muted-foreground ml-2">
          {formatDate(weekDays[0])} &mdash; {formatDate(weekDays[5])}
        </span>
        <div className="ml-auto">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-1.5 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            {showForm ? 'Cancel' : '+ Add Slot'}
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <div
            className="grid border rounded-lg bg-card"
            style={{ gridTemplateColumns: '180px repeat(6, minmax(150px, 1fr))' }}
          >
            {/* Header row */}
            <div className="p-3 font-semibold text-sm border-b border-r bg-muted/50">Technician</div>
            {weekDays.map((day, i) => (
              <div key={i} className="p-3 font-semibold text-sm border-b border-r last:border-r-0 bg-muted/50 text-center">
                <div>{DAY_NAMES[i]}</div>
                <div className="text-xs text-muted-foreground">{formatShortDate(day)}</div>
              </div>
            ))}

            {/* Technician rows */}
            {technicians.map(tech => (
              <>
                {/* Tech name cell */}
                <div key={`name-${tech.id}`} className="p-3 border-b border-r text-sm">
                  <div className="font-medium">{tech.display_name}</div>
                  <div className="text-xs text-muted-foreground">{tech.grade}</div>
                </div>
                {/* Day cells */}
                {weekDays.map((day, di) => {
                  const cellSlots = slotsFor(tech.id, day);
                  const cellHours = techDayHours(tech.id, day);
                  return (
                    <div key={`${tech.id}-${di}`} className="p-1.5 border-b border-r last:border-r-0 min-h-[70px]">
                      {cellSlots.map(slot => (
                        <div
                          key={slot.id}
                          className={`rounded border px-1.5 py-1 mb-1 text-xs cursor-default group relative ${SLOT_COLORS[slot.slot_type]}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-medium truncate">
                              {formatTime(slot.start_at)}-{formatTime(slot.end_at)}
                            </span>
                            <button
                              onClick={() => deleteSlot(slot.id)}
                              className="opacity-0 group-hover:opacity-100 text-current hover:opacity-70 flex-shrink-0"
                              title="Delete"
                            >
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            </button>
                          </div>
                          {slot.slot_type === 'work_order' && slot.order?.wo_number && (
                            <div className="truncate">{slot.order.wo_number}</div>
                          )}
                          {slot.slot_type !== 'work_order' && (
                            <div className="truncate">{SLOT_LABELS[slot.slot_type]}</div>
                          )}
                        </div>
                      ))}
                      {cellHours > 0 && (
                        <div className="text-[10px] text-muted-foreground text-right mt-0.5">{cellHours.toFixed(1)}h</div>
                      )}
                    </div>
                  );
                })}
              </>
            ))}

            {/* Summary row */}
            <div className="p-3 border-r font-semibold text-sm bg-muted/50">Total Hours</div>
            {weekDays.map((day, i) => (
              <div key={`sum-${i}`} className="p-3 border-r last:border-r-0 text-center font-semibold text-sm bg-muted/50">
                {dayTotalHours(day).toFixed(1)}h
              </div>
            ))}
          </div>

          {technicians.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-6">
              No active technicians found. Add technicians in the Technicians screen first.
            </div>
          )}
        </div>
      )}

      {/* Add Slot Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-5 space-y-4">
          <h3 className="font-semibold text-sm">Add Planning Slot</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Technician */}
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Technician</label>
              <select
                value={formTechId}
                onChange={e => setFormTechId(e.target.value)}
                required
                className="w-full rounded border px-2 py-1.5 text-sm bg-background"
              >
                <option value="">Select...</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.display_name} ({t.grade})</option>
                ))}
              </select>
            </div>

            {/* Day */}
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Day</label>
              <select
                value={formDay}
                onChange={e => setFormDay(e.target.value)}
                required
                className="w-full rounded border px-2 py-1.5 text-sm bg-background"
              >
                <option value="">Select...</option>
                {weekDays.map((d, i) => (
                  <option key={i} value={formatDate(d)}>{DAY_NAMES[i]} {formatShortDate(d)}</option>
                ))}
              </select>
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Start Time</label>
              <input
                type="time"
                value={formStartTime}
                onChange={e => setFormStartTime(e.target.value)}
                required
                className="w-full rounded border px-2 py-1.5 text-sm bg-background"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">End Time</label>
              <input
                type="time"
                value={formEndTime}
                onChange={e => setFormEndTime(e.target.value)}
                required
                className="w-full rounded border px-2 py-1.5 text-sm bg-background"
              />
            </div>

            {/* Slot Type */}
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Slot Type</label>
              <select
                value={formSlotType}
                onChange={e => setFormSlotType(e.target.value as SlotType)}
                className="w-full rounded border px-2 py-1.5 text-sm bg-background"
              >
                {SLOT_TYPES.map(st => (
                  <option key={st} value={st}>{SLOT_LABELS[st]}</option>
                ))}
              </select>
            </div>

            {/* Work Order (conditional) */}
            {formSlotType === 'work_order' && (
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Work Order #</label>
                <input
                  type="text"
                  value={formWO}
                  onChange={e => setFormWO(e.target.value)}
                  placeholder="WO number"
                  className="w-full rounded border px-2 py-1.5 text-sm bg-background"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Notes</label>
              <input
                type="text"
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="Optional notes"
                className="w-full rounded border px-2 py-1.5 text-sm bg-background"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Create Slot'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-1.5 rounded border text-sm font-medium hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
