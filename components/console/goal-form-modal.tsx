"use client"

import { useState, useCallback, type FormEvent } from "react"
import {
  X, Plus, Trash2, ChevronDown, ChevronUp, Target, TrendingUp,
  TrendingDown, DollarSign, Tag, Users, Eye, Flame, Zap, Info,
} from "lucide-react"
import type {
  GoalCreateInput, KeyResultCreateInput, EntityScope, PeriodType,
  GoalPriority, GoalType, Visibility, CheckinFrequency,
} from "@/lib/op-goals-types"
import { ENTITY_LABELS, PERIOD_LABELS, PRIORITY_LABELS, computePeriodEnd } from "@/lib/op-goals-types"
import type { Goal } from "@/lib/op-goals-types"

interface GoalFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: GoalCreateInput) => Promise<void>
  parentGoal?: Goal | null
  allGoals?: Goal[]
}

const EMPTY_KR: KeyResultCreateInput = {
  title: "",
  metric_type: "manual",
  direction: "increase",
  baseline: 0,
  target: 100,
  unit_label: "%",
  weight: 1,
}

export default function GoalFormModal({
  open,
  onClose,
  onSubmit,
  parentGoal,
  allGoals = [],
}: GoalFormModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showKRs, setShowKRs] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [visionText, setVisionText] = useState("")
  const [entity, setEntity] = useState<EntityScope | "">(parentGoal?.entity ?? "")
  const [parentGoalId, setParentGoalId] = useState(parentGoal?.id ?? "")
  const [periodType, setPeriodType] = useState<PeriodType>("quarterly")
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")
  const [priority, setPriority] = useState<GoalPriority>("medium")
  const [goalType, setGoalType] = useState<GoalType>("committed")
  const [visibility, setVisibility] = useState<Visibility>("public")
  const [budget, setBudget] = useState("")
  const [strategicPillar, setStrategicPillar] = useState("")
  const [checkinFrequency, setCheckinFrequency] = useState<CheckinFrequency>("weekly")
  const [tagsInput, setTagsInput] = useState("")
  const [keyResults, setKeyResults] = useState<KeyResultCreateInput[]>([])

  const level = parentGoal ? Math.min((parentGoal.level ?? 0) + 1, 2) : 0
  const levelLabel = level === 0 ? "Strategic Goal" : level === 1 ? "Objective" : "Key Result"

  const handlePeriodTypeChange = useCallback(
    (val: PeriodType) => {
      setPeriodType(val)
      if (periodStart && val !== "custom") {
        setPeriodEnd(computePeriodEnd(val, periodStart))
      }
    },
    [periodStart],
  )

  const handlePeriodStartChange = useCallback(
    (val: string) => {
      setPeriodStart(val)
      if (val && periodType !== "custom") {
        setPeriodEnd(computePeriodEnd(periodType, val))
      }
    },
    [periodType],
  )

  const addKR = () => setKeyResults([...keyResults, { ...EMPTY_KR }])
  const removeKR = (i: number) => setKeyResults(keyResults.filter((_, idx) => idx !== i))
  const updateKR = (i: number, patch: Partial<KeyResultCreateInput>) => {
    setKeyResults(keyResults.map((kr, idx) => (idx === i ? { ...kr, ...patch } : kr)))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSubmitting(true)
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)

      const data: GoalCreateInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        vision_text: visionText.trim() || undefined,
        entity: entity || undefined,
        parent_goal_id: parentGoalId || undefined,
        level,
        period_type: periodType,
        period_start: periodStart || undefined,
        period_end: periodEnd || undefined,
        priority,
        goal_type: goalType,
        visibility,
        budget: budget ? parseFloat(budget) : undefined,
        strategic_pillar: strategicPillar.trim() || undefined,
        checkin_frequency: checkinFrequency,
        tags: tags.length > 0 ? tags : undefined,
        key_results: keyResults.filter((kr) => kr.title.trim()),
      }

      await onSubmit(data)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-[5vh]">
      <div
        className="relative w-full max-w-2xl rounded-xl border bg-[var(--bg)] border-[var(--border2)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--text)]">
              New {levelLabel}
            </h2>
            {parentGoal && (
              <p className="mt-0.5 text-xs text-[var(--text3)]">
                Under: {parentGoal.title}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text3)] transition hover:bg-[var(--bg3)] hover:text-[var(--text)]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto">
          <div className="space-y-5 p-6">
            {/* ── Row 1: Title ── */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`e.g. ${level === 0 ? "Grow DES Shop revenue" : level === 1 ? "Increase online conversion rate" : "Achieve 15% conversion"}`}
                required
                className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text3)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              />
            </div>

            {/* ── Row 2: Entity + Priority + Goal Type ── */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                  Entity
                </label>
                <div className="relative">
                  <select
                    value={entity}
                    onChange={(e) => setEntity(e.target.value as EntityScope)}
                    className="w-full appearance-none rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3.5 py-2.5 pr-8 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                  >
                    <option value="">-- Select --</option>
                    {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                  <Flame size={12} className="mb-0.5 mr-1 inline text-orange-500" />
                  Priority
                </label>
                <div className="relative">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as GoalPriority)}
                    className="w-full appearance-none rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3.5 py-2.5 pr-8 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                  >
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                  <Zap size={12} className="mb-0.5 mr-1 inline text-yellow-500" />
                  Goal Type
                </label>
                <div className="relative">
                  <select
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value as GoalType)}
                    className="w-full appearance-none rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3.5 py-2.5 pr-8 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                  >
                    <option value="committed">Committed</option>
                    <option value="aspirational">Aspirational</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                </div>
              </div>
            </div>

            {/* ── Row 3: Period Type + Start + End ── */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                  Period Type
                </label>
                <div className="relative">
                  <select
                    value={periodType}
                    onChange={(e) => handlePeriodTypeChange(e.target.value as PeriodType)}
                    className="w-full appearance-none rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3.5 py-2.5 pr-8 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                  >
                    {Object.entries(PERIOD_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                  Period Start
                </label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => handlePeriodStartChange(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                  Period End
                </label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  disabled={periodType !== "custom"}
                  className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-50"
                />
                {periodType !== "custom" && periodEnd && (
                  <p className="mt-1 text-[10px] text-[var(--text3)]">Auto-calculated from period type</p>
                )}
              </div>
            </div>

            {/* ── Row 4: Parent Goal (if level > 0 or allow linking) ── */}
            {level === 0 && allGoals.length > 0 && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                  Parent Goal <span className="text-[var(--text3)] font-normal normal-case">(optional — makes this an objective)</span>
                </label>
                <div className="relative">
                  <select
                    value={parentGoalId}
                    onChange={(e) => setParentGoalId(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3.5 py-2.5 pr-8 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                  >
                    <option value="">-- None (top-level goal) --</option>
                    {allGoals.filter(g => g.level < 2).map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.goal_number} — {g.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                </div>
              </div>
            )}

            {/* ── Row 5: Description ── */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this goal aim to achieve?"
                rows={2}
                className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text3)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 resize-none"
              />
            </div>

            {/* ── Key Results Section ── */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4">
              <button
                type="button"
                onClick={() => {
                  setShowKRs(!showKRs)
                  if (!showKRs && keyResults.length === 0) addKR()
                }}
                className="flex w-full items-center justify-between text-sm font-semibold text-[var(--text)]"
              >
                <span className="flex items-center gap-2">
                  <Target size={16} className="text-[var(--accent)]" />
                  Key Results ({keyResults.length})
                </span>
                {showKRs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showKRs && (
                <div className="mt-4 space-y-4">
                  {keyResults.map((kr, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text3)]">
                          KR {i + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeKR(i)}
                          className="rounded p-1 text-red-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <input
                        value={kr.title}
                        onChange={(e) => updateKR(i, { title: e.target.value })}
                        placeholder="e.g. Increase monthly revenue to 50k"
                        className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text3)] outline-none transition focus:border-[var(--accent)]"
                      />

                      <div className="grid grid-cols-5 gap-2">
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                            Type
                          </label>
                          <select
                            value={kr.metric_type}
                            onChange={(e) => updateKR(i, { metric_type: e.target.value as KeyResultCreateInput["metric_type"] })}
                            className="w-full appearance-none rounded border border-[var(--border2)] bg-[var(--bg2)] px-2 py-1.5 text-xs text-[var(--text)] outline-none"
                          >
                            <option value="manual">Manual</option>
                            <option value="count">Count</option>
                            <option value="sum">Sum</option>
                            <option value="avg">Average</option>
                            <option value="ratio">Ratio</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                            Direction
                          </label>
                          <div className="flex rounded border border-[var(--border2)] overflow-hidden">
                            <button
                              type="button"
                              onClick={() => updateKR(i, { direction: "increase" })}
                              className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs transition ${kr.direction === "increase" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-[var(--bg2)] text-[var(--text3)]"}`}
                            >
                              <TrendingUp size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateKR(i, { direction: "decrease" })}
                              className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs transition ${kr.direction === "decrease" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-[var(--bg2)] text-[var(--text3)]"}`}
                            >
                              <TrendingDown size={11} />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                            Baseline
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={kr.baseline}
                            onChange={(e) => updateKR(i, { baseline: parseFloat(e.target.value) || 0 })}
                            className="w-full rounded border border-[var(--border2)] bg-[var(--bg2)] px-2 py-1.5 text-xs text-[var(--text)] outline-none"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                            Target
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={kr.target}
                            onChange={(e) => updateKR(i, { target: parseFloat(e.target.value) || 0 })}
                            className="w-full rounded border border-[var(--border2)] bg-[var(--bg2)] px-2 py-1.5 text-xs text-[var(--text)] outline-none"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                            Unit
                          </label>
                          <input
                            value={kr.unit_label}
                            onChange={(e) => updateKR(i, { unit_label: e.target.value })}
                            placeholder="%"
                            className="w-full rounded border border-[var(--border2)] bg-[var(--bg2)] px-2 py-1.5 text-xs text-[var(--text)] outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                          Weight
                        </label>
                        <input
                          type="number"
                          min={0.1}
                          step={0.1}
                          value={kr.weight}
                          onChange={(e) => updateKR(i, { weight: parseFloat(e.target.value) || 1 })}
                          className="w-20 rounded border border-[var(--border2)] bg-[var(--bg2)] px-2 py-1 text-xs text-[var(--text)] outline-none"
                        />
                        <span className="text-[10px] text-[var(--text3)]">
                          Higher weight = more influence on goal progress
                        </span>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addKR}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border2)] py-2.5 text-xs font-medium text-[var(--text3)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    <Plus size={14} /> Add Key Result
                  </button>
                </div>
              )}
            </div>

            {/* ── Advanced Settings ── */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex w-full items-center justify-between text-sm font-semibold text-[var(--text)]"
              >
                <span className="flex items-center gap-2">
                  <Info size={16} className="text-[var(--text3)]" />
                  Advanced Settings
                </span>
                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  {/* Vision Text */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                      Vision Statement
                    </label>
                    <textarea
                      value={visionText}
                      onChange={(e) => setVisionText(e.target.value)}
                      placeholder="The aspirational 'why' behind this goal..."
                      rows={2}
                      className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text3)] outline-none transition focus:border-[var(--accent)] resize-none"
                    />
                  </div>

                  {/* Budget + Strategic Pillar + Checkin Frequency */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                        <DollarSign size={12} className="mb-0.5 mr-1 inline text-emerald-500" />
                        Budget (EUR)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                        Strategic Pillar
                      </label>
                      <input
                        value={strategicPillar}
                        onChange={(e) => setStrategicPillar(e.target.value)}
                        placeholder="e.g. Growth, Efficiency"
                        className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text3)] outline-none transition focus:border-[var(--accent)]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                        Check-in Cadence
                      </label>
                      <div className="relative">
                        <select
                          value={checkinFrequency}
                          onChange={(e) => setCheckinFrequency(e.target.value as CheckinFrequency)}
                          className="w-full appearance-none rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2.5 pr-8 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Biweekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                      </div>
                    </div>
                  </div>

                  {/* Visibility + Tags */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                        <Eye size={12} className="mb-0.5 mr-1 inline" />
                        Visibility
                      </label>
                      <div className="relative">
                        <select
                          value={visibility}
                          onChange={(e) => setVisibility(e.target.value as Visibility)}
                          className="w-full appearance-none rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2.5 pr-8 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                        >
                          <option value="public">Public (all entities)</option>
                          <option value="entity">Entity only</option>
                          <option value="private">Private (owner only)</option>
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                        <Tag size={12} className="mb-0.5 mr-1 inline" />
                        Tags <span className="font-normal normal-case">(comma-separated)</span>
                      </label>
                      <input
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="cost-reduction, customer-experience"
                        className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text3)] outline-none transition focus:border-[var(--accent)]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border2)] px-5 py-2.5 text-sm font-medium text-[var(--text2)] transition hover:bg-[var(--bg3)] hover:text-[var(--text)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent2)] disabled:opacity-50"
            >
              {submitting ? "Creating..." : `Create ${levelLabel}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
