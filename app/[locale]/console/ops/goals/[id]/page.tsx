"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Target, TrendingUp, TrendingDown, Calendar, User,
  AlertTriangle, CheckCircle2, PauseCircle, XCircle, Award,
  ChevronDown, ChevronUp, Plus, Edit3, Clock, BarChart3,
  Flame, Zap, Eye, Tag, DollarSign, Activity, MessageSquare,
} from "lucide-react"
import type {
  Goal, KeyResult, GoalSnapshot, GoalCheckin,
  GoalHealth, GoalStatus, GoalPriority,
} from "@/lib/op-goals-types"
import {
  ENTITY_LABELS, PERIOD_LABELS, STATUS_LABELS, HEALTH_LABELS,
  PRIORITY_LABELS, PRIORITY_COLORS, HEALTH_COLORS, STATUS_COLORS,
} from "@/lib/op-goals-types"
import type { EntityScope } from "@/lib/op-goals-types"

type Tab = "overview" | "key_results" | "checkins" | "children"

const TABS: { key: Tab; label: string; icon: typeof Target }[] = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "key_results", label: "Key Results", icon: Target },
  { key: "checkins", label: "Check-ins", icon: MessageSquare },
  { key: "children", label: "Sub-Goals", icon: Activity },
]

export default function GoalDetailPage() {
  const params = useParams()
  const router = useRouter()
  const goalId = params.id as string

  const [goal, setGoal] = useState<Goal | null>(null)
  const [snapshots, setSnapshots] = useState<GoalSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [showSnapshotForm, setShowSnapshotForm] = useState(false)

  const fetchGoal = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [goalRes, snapRes] = await Promise.all([
        fetch(`/api/bop/ops/goals/${goalId}`),
        fetch(`/api/bop/ops/goals/${goalId}/snapshots`),
      ])
      if (!goalRes.ok) throw new Error("Goal not found")
      const goalData = await goalRes.json()
      setGoal(goalData.goal)
      if (snapRes.ok) {
        const snapData = await snapRes.json()
        setSnapshots(snapData.snapshots ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [goalId])

  useEffect(() => { fetchGoal() }, [fetchGoal])

  const trajectory = useMemo(() => {
    if (!goal?.period_start || !goal?.period_end) return null
    const start = new Date(goal.period_start).getTime()
    const end = new Date(goal.period_end).getTime()
    const now = Date.now()
    const elapsed = Math.max(0, now - start)
    const duration = end - start
    if (duration <= 0) return null
    const timeProgress = Math.min(1, elapsed / duration)
    const goalProgress = (goal.progress_pct ?? 0) / 100
    const pace = timeProgress > 0 ? goalProgress / timeProgress : 1
    const daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
    return { timeProgress, goalProgress, pace, daysRemaining }
  }, [goal])

  const computedHealth = useMemo((): GoalHealth => {
    if (!trajectory) return goal?.health ?? "on_track"
    if (trajectory.pace >= 0.9) return "on_track"
    if (trajectory.pace >= 0.7) return "at_risk"
    return "off_track"
  }, [trajectory, goal?.health])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  if (error || !goal) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg)]">
        <AlertTriangle size={48} className="text-red-400" />
        <p className="text-sm text-[var(--text3)]">{error ?? "Goal not found"}</p>
        <button
          onClick={() => router.back()}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        >
          Go Back
        </button>
      </div>
    )
  }

  const krs = goal.key_results ?? []
  const checkins = goal.checkins ?? []
  const children = goal.children ?? []
  const levelLabel = goal.level === 0 ? "Strategic Goal" : goal.level === 1 ? "Objective" : "Key Result"

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* ── Header ── */}
      <div className="border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="mx-auto max-w-[1200px] px-6 py-5">
          <button
            onClick={() => router.back()}
            className="mb-3 flex items-center gap-1.5 text-xs font-medium text-[var(--text3)] transition hover:text-[var(--accent)]"
          >
            <ArrowLeft size={14} /> Back to Goals
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-mono text-[var(--text3)]">{goal.goal_number}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[goal.status]}`}>
                  {STATUS_LABELS[goal.status]}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${HEALTH_COLORS[computedHealth]}`}>
                  {HEALTH_LABELS[computedHealth]}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_COLORS[goal.priority]}`}>
                  {PRIORITY_LABELS[goal.priority]}
                </span>
                {goal.goal_type === "aspirational" && (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                    Aspirational
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-[var(--text)]">{goal.title}</h1>
              <p className="mt-0.5 text-xs text-[var(--text3)]">
                {levelLabel}
                {goal.entity && <> &middot; {ENTITY_LABELS[goal.entity as EntityScope] ?? goal.entity}</>}
                {goal.period_type && <> &middot; {PERIOD_LABELS[goal.period_type]}</>}
                {goal.period_start && goal.period_end && (
                  <> &middot; {goal.period_start} to {goal.period_end}</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-6 py-6 space-y-6">
        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard
            label="Progress"
            value={`${Math.round(goal.progress_pct ?? 0)}%`}
            sub={krs.length > 0 ? `${krs.length} Key Result${krs.length > 1 ? "s" : ""}` : "No KRs"}
            color="text-[var(--accent)]"
          />
          <MetricCard
            label="Time Elapsed"
            value={trajectory ? `${Math.round(trajectory.timeProgress * 100)}%` : "—"}
            sub={trajectory ? `${trajectory.daysRemaining} days remaining` : "No period set"}
            color="text-violet-600 dark:text-violet-400"
          />
          <MetricCard
            label="Pace"
            value={trajectory ? `${Math.round(trajectory.pace * 100)}%` : "—"}
            sub={trajectory
              ? trajectory.pace >= 0.9 ? "On pace" : trajectory.pace >= 0.7 ? "Slightly behind" : "Behind schedule"
              : "Needs period + KRs"
            }
            color={
              !trajectory ? "text-[var(--text3)]"
                : trajectory.pace >= 0.9 ? "text-emerald-600 dark:text-emerald-400"
                  : trajectory.pace >= 0.7 ? "text-amber-600 dark:text-amber-400"
                    : "text-red-600 dark:text-red-400"
            }
          />
          <MetricCard
            label="Check-ins"
            value={checkins.length}
            sub={checkins.length > 0
              ? `Last: ${new Date(checkins[0].created_at).toLocaleDateString()}`
              : "No check-ins yet"
            }
            color="text-cyan-600 dark:text-cyan-400"
          />
        </div>

        {/* ── Progress Bar ── */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">Overall Progress</span>
            <span className="text-sm font-bold text-[var(--text)]">{Math.round(goal.progress_pct ?? 0)}%</span>
          </div>
          <div className="relative h-3 rounded-full bg-[var(--bg4)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                (goal.progress_pct ?? 0) >= 100 ? "bg-emerald-500"
                  : (goal.progress_pct ?? 0) >= 70 ? "bg-blue-500"
                    : (goal.progress_pct ?? 0) >= 40 ? "bg-amber-500" : "bg-red-400"
              }`}
              style={{ width: `${Math.min(100, goal.progress_pct ?? 0)}%` }}
            />
            {trajectory && (
              <div
                className="absolute top-0 h-full w-0.5 bg-[var(--text3)] opacity-50"
                style={{ left: `${Math.min(100, trajectory.timeProgress * 100)}%` }}
                title={`Expected: ${Math.round(trajectory.timeProgress * 100)}%`}
              />
            )}
          </div>
          {trajectory && (
            <p className="mt-1.5 text-[10px] text-[var(--text3)]">
              Vertical line = expected progress based on elapsed time ({Math.round(trajectory.timeProgress * 100)}%)
            </p>
          )}
        </div>

        {/* ── Description ── */}
        {goal.description && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">Description</h3>
            <p className="text-sm text-[var(--text)] whitespace-pre-wrap">{goal.description}</p>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const count = tab.key === "key_results" ? krs.length
              : tab.key === "checkins" ? checkins.length
                : tab.key === "children" ? children.length : 0
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition ${
                  activeTab === tab.key
                    ? "bg-[var(--bg)] text-[var(--text)] shadow-sm"
                    : "text-[var(--text3)] hover:text-[var(--text)]"
                }`}
              >
                <Icon size={14} />
                {tab.label}
                {count > 0 && (
                  <span className="ml-1 rounded-full bg-[var(--bg4)] px-1.5 text-[10px] font-semibold">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Tab Content ── */}
        {activeTab === "overview" && (
          <OverviewTab goal={goal} snapshots={snapshots} />
        )}
        {activeTab === "key_results" && (
          <KeyResultsTab krs={krs} snapshots={snapshots} goal={goal} onRefresh={fetchGoal} showSnapshotForm={showSnapshotForm} setShowSnapshotForm={setShowSnapshotForm} />
        )}
        {activeTab === "checkins" && (
          <CheckinsTab checkins={checkins} />
        )}
        {activeTab === "children" && (
          <ChildrenTab children={children} />
        )}

        {/* ── Meta Info ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {goal.strategic_pillar && (
            <InfoBlock label="Strategic Pillar" value={goal.strategic_pillar} />
          )}
          {goal.budget != null && (
            <InfoBlock label="Budget" value={`€${goal.budget.toLocaleString()}`} />
          )}
          <InfoBlock label="Check-in Cadence" value={goal.checkin_frequency} />
          <InfoBlock label="Visibility" value={goal.visibility} />
          {goal.tags?.length > 0 && (
            <div className="col-span-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">Tags</p>
              <div className="flex flex-wrap gap-1">
                {goal.tags.map((t) => (
                  <span key={t} className="rounded-full bg-[var(--bg3)] px-2 py-0.5 text-[11px] text-[var(--text2)]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-[var(--text3)]">{sub}</p>
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">{label}</p>
      <p className="text-sm font-medium text-[var(--text)] capitalize">{value}</p>
    </div>
  )
}

function OverviewTab({ goal, snapshots }: { goal: Goal; snapshots: GoalSnapshot[] }) {
  const krs = goal.key_results ?? []

  return (
    <div className="space-y-4">
      {goal.vision_text && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">Vision</h3>
          <p className="text-sm italic text-[var(--text2)] whitespace-pre-wrap">{goal.vision_text}</p>
        </div>
      )}

      {krs.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">Key Results Summary</h3>
          <div className="space-y-3">
            {krs.map((kr) => {
              const range = kr.direction === "increase"
                ? kr.target - kr.baseline
                : kr.baseline - kr.target
              const progress = range !== 0
                ? Math.min(100, Math.max(0, ((kr.current_value - kr.baseline) / (kr.target - kr.baseline)) * 100))
                : 0
              return (
                <div key={kr.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="truncate text-sm text-[var(--text)]">{kr.title}</span>
                      <span className="ml-2 flex-none text-xs font-mono text-[var(--text3)]">
                        {kr.current_value} / {kr.target} {kr.unit_label}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg4)] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          progress >= 100 ? "bg-emerald-500"
                            : progress >= 70 ? "bg-blue-500"
                              : progress >= 40 ? "bg-amber-500" : "bg-red-400"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                      />
                    </div>
                  </div>
                  <span className="flex-none text-xs font-bold text-[var(--text2)] w-10 text-right">
                    {Math.round(progress)}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {snapshots.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
            Recent Measurements ({snapshots.length})
          </h3>
          <div className="space-y-2">
            {snapshots.slice(-10).reverse().map((s) => (
              <div key={s.id} className="flex items-center justify-between border-b border-[var(--border)] py-2 last:border-0">
                <div>
                  <span className="text-sm font-medium text-[var(--text)]">{s.current_value}</span>
                  {s.note && <span className="ml-2 text-xs text-[var(--text3)]">— {s.note}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    s.source === "auto"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {s.source}
                  </span>
                  <span className="text-[11px] text-[var(--text3)]">
                    {new Date(s.measured_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function KeyResultsTab({
  krs, snapshots, goal, onRefresh, showSnapshotForm, setShowSnapshotForm,
}: {
  krs: KeyResult[]; snapshots: GoalSnapshot[]; goal: Goal; onRefresh: () => void
  showSnapshotForm: boolean; setShowSnapshotForm: (v: boolean) => void
}) {
  const [selectedKr, setSelectedKr] = useState<string>("")
  const [snapshotValue, setSnapshotValue] = useState("")
  const [snapshotNote, setSnapshotNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSnapshot = async () => {
    if (!snapshotValue) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/bop/ops/goals/${goal.id}/snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kr_id: selectedKr || undefined,
          current_value: parseFloat(snapshotValue),
          source: "manual",
          note: snapshotNote.trim() || undefined,
        }),
      })
      if (res.ok) {
        setSnapshotValue("")
        setSnapshotNote("")
        setShowSnapshotForm(false)
        onRefresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (krs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] py-16">
        <Target size={40} className="mb-3 text-[var(--text3)] opacity-40" />
        <p className="text-sm font-medium text-[var(--text)]">No Key Results defined</p>
        <p className="mt-1 text-xs text-[var(--text3)]">Add Key Results when editing this goal to track measurable outcomes.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Record Measurement button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowSnapshotForm(!showSnapshotForm)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent2)]"
        >
          <Plus size={14} /> Record Measurement
        </button>
      </div>

      {showSnapshotForm && (
        <div className="rounded-xl border border-[var(--accent)]/30 bg-blue-50/50 p-4 dark:bg-blue-900/10 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">New Measurement</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-[var(--text3)]">Key Result</label>
              <select
                value={selectedKr}
                onChange={(e) => setSelectedKr(e.target.value)}
                className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none"
              >
                <option value="">Goal-level</option>
                {krs.map((kr) => (
                  <option key={kr.id} value={kr.id}>{kr.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-[var(--text3)]">Value</label>
              <input
                type="number"
                step="any"
                value={snapshotValue}
                onChange={(e) => setSnapshotValue(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-[var(--text3)]">Note</label>
              <input
                value={snapshotNote}
                onChange={(e) => setSnapshotNote(e.target.value)}
                placeholder="Optional context"
                className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowSnapshotForm(false)}
              className="rounded-lg border border-[var(--border2)] px-3 py-1.5 text-xs text-[var(--text3)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSnapshot}
              disabled={submitting || !snapshotValue}
              className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* KR Cards */}
      {krs.map((kr) => {
        const progress = kr.target !== kr.baseline
          ? Math.min(100, Math.max(0, ((kr.current_value - kr.baseline) / (kr.target - kr.baseline)) * 100))
          : 0
        const krSnapshots = snapshots.filter((s) => s.kr_id === kr.id)
        return (
          <div key={kr.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-semibold text-[var(--text3)]">{kr.kr_number}</span>
                  {kr.direction === "increase"
                    ? <TrendingUp size={14} className="text-emerald-500" />
                    : <TrendingDown size={14} className="text-blue-500" />
                  }
                </div>
                <h4 className="text-sm font-semibold text-[var(--text)]">{kr.title}</h4>
                {kr.description && (
                  <p className="mt-0.5 text-xs text-[var(--text3)]">{kr.description}</p>
                )}
              </div>
              <span className="text-lg font-bold text-[var(--text)]">{Math.round(progress)}%</span>
            </div>

            {/* Progress bar */}
            <div className="mb-3 h-2 rounded-full bg-[var(--bg4)] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  progress >= 100 ? "bg-emerald-500"
                    : progress >= 70 ? "bg-blue-500"
                      : progress >= 40 ? "bg-amber-500" : "bg-red-400"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>

            {/* Metric details */}
            <div className="flex flex-wrap gap-4 text-xs text-[var(--text3)]">
              <span>Baseline: <strong className="text-[var(--text)]">{kr.baseline} {kr.unit_label}</strong></span>
              <span>Current: <strong className="text-[var(--text)]">{kr.current_value} {kr.unit_label}</strong></span>
              <span>Target: <strong className="text-[var(--text)]">{kr.target} {kr.unit_label}</strong></span>
              <span>Weight: <strong className="text-[var(--text)]">{kr.weight}</strong></span>
              <span>Type: <strong className="text-[var(--text)] capitalize">{kr.metric_type}</strong></span>
            </div>

            {/* Snapshot history for this KR */}
            {krSnapshots.length > 0 && (
              <div className="mt-3 border-t border-[var(--border)] pt-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                  Measurement History ({krSnapshots.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {krSnapshots.slice(-8).map((s) => (
                    <span
                      key={s.id}
                      className="rounded bg-[var(--bg3)] px-2 py-1 text-[11px] text-[var(--text2)]"
                      title={s.note ?? undefined}
                    >
                      {s.current_value} — {new Date(s.measured_at).toLocaleDateString()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function CheckinsTab({ checkins }: { checkins: GoalCheckin[] }) {
  if (checkins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] py-16">
        <MessageSquare size={40} className="mb-3 text-[var(--text3)] opacity-40" />
        <p className="text-sm font-medium text-[var(--text)]">No check-ins yet</p>
        <p className="mt-1 text-xs text-[var(--text3)]">Check-ins will appear here as they are recorded.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {checkins.map((c) => (
        <div key={c.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                c.confidence >= 7 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : c.confidence >= 4 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }`}>
                Confidence: {c.confidence}/10
              </span>
            </div>
            <span className="text-[11px] text-[var(--text3)]">
              {new Date(c.created_at).toLocaleDateString()} {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          {c.note && <p className="text-sm text-[var(--text)] whitespace-pre-wrap">{c.note}</p>}
          {c.blockers && (
            <div className="mt-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
              <strong>Blockers:</strong> {c.blockers}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ChildrenTab({ children }: { children: Goal[] }) {
  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] py-16">
        <Activity size={40} className="mb-3 text-[var(--text3)] opacity-40" />
        <p className="text-sm font-medium text-[var(--text)]">No sub-goals</p>
        <p className="mt-1 text-xs text-[var(--text3)]">Add objectives or child goals from the goals tree view.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {children.map((child) => {
        const progress = child.progress_pct ?? 0
        return (
          <div key={child.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
            <span className={`h-2.5 w-2.5 flex-none rounded-full ${
              child.health === "on_track" ? "bg-emerald-500"
                : child.health === "at_risk" ? "bg-amber-500" : "bg-red-500"
            }`} />
            <span className="text-[11px] font-mono text-[var(--text3)] w-14">{child.goal_number}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text)]">{child.title}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_COLORS[child.priority]}`}>
              {PRIORITY_LABELS[child.priority]}
            </span>
            <div className="flex items-center gap-2 w-24">
              <div className="flex-1 h-1.5 rounded-full bg-[var(--bg4)] overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    progress >= 100 ? "bg-emerald-500" : progress >= 70 ? "bg-blue-500" : progress >= 40 ? "bg-amber-500" : "bg-red-400"
                  }`}
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-[var(--text3)]">{Math.round(progress)}%</span>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[child.status]}`}>
              {STATUS_LABELS[child.status]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
