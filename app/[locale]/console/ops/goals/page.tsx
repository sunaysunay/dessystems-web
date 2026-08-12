"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Plus, Search, Filter, RefreshCw, LayoutGrid, List,
  Target, TrendingUp, AlertTriangle, CheckCircle2,
  ChevronDown,
} from "lucide-react"
import GoalFormModal from "@/components/console/goal-form-modal"
import GoalTree from "@/components/console/goal-tree"
import type { Goal, GoalCreateInput, GoalStatus, EntityScope, GoalPriority } from "@/lib/op-goals-types"
import {
  ENTITY_LABELS, STATUS_LABELS, PRIORITY_LABELS,
  HEALTH_COLORS, HEALTH_LABELS, STATUS_COLORS,
} from "@/lib/op-goals-types"

const STATUS_TABS: { key: GoalStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "achieved", label: "Achieved" },
  { key: "semi_achieved", label: "Semi-Achieved" },
  { key: "paused", label: "Paused" },
  { key: "closed", label: "Closed" },
]

export default function OP002GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [parentGoal, setParentGoal] = useState<Goal | null>(null)
  const [statusFilter, setStatusFilter] = useState<GoalStatus | "all">("all")
  const [entityFilter, setEntityFilter] = useState<EntityScope | "">("")
  const [priorityFilter, setPriorityFilter] = useState<GoalPriority | "">("")
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  const fetchGoals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (entityFilter) params.set("entity", entityFilter)
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (priorityFilter) params.set("priority", priorityFilter)

      const res = await fetch(`/api/bop/ops/goals?${params}`)
      if (!res.ok) throw new Error("Failed to fetch goals")
      const data = await res.json()
      setGoals(data.goals ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [entityFilter, statusFilter, priorityFilter])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const filteredGoals = useMemo(() => {
    if (!searchQuery.trim()) return goals
    const q = searchQuery.toLowerCase()
    const matches = (g: Goal): boolean => {
      if (g.title.toLowerCase().includes(q)) return true
      if (g.goal_number?.toLowerCase().includes(q)) return true
      if (g.description?.toLowerCase().includes(q)) return true
      if ((g.children ?? []).some(matches)) return true
      return false
    }
    return goals.filter(matches)
  }, [goals, searchQuery])

  const stats = useMemo(() => {
    const flatten = (gs: Goal[]): Goal[] =>
      gs.flatMap((g) => [g, ...flatten(g.children ?? [])])
    const all = flatten(goals)
    return {
      total: all.length,
      active: all.filter((g) => g.status === "active").length,
      onTrack: all.filter((g) => g.health === "on_track").length,
      atRisk: all.filter((g) => g.health === "at_risk").length,
      offTrack: all.filter((g) => g.health === "off_track").length,
      avgProgress: all.length > 0
        ? Math.round(all.reduce((s, g) => s + (g.progress_pct ?? 0), 0) / all.length)
        : 0,
    }
  }, [goals])

  const handleCreateGoal = async (data: GoalCreateInput) => {
    const res = await fetch("/api/bop/ops/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? "Failed to create goal")
    }
    await fetchGoals()
  }

  const openNewGoal = (parent?: Goal) => {
    setParentGoal(parent ?? null)
    setModalOpen(true)
  }

  const allFlat = useMemo(() => {
    const flatten = (gs: Goal[]): Goal[] =>
      gs.flatMap((g) => [g, ...flatten(g.children ?? [])])
    return flatten(goals)
  }, [goals])

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* ── Header ── */}
      <div className="border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="mx-auto max-w-[1400px] px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                  <Target size={18} className="text-cyan-700 dark:text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[var(--text)]">
                    Strategy Cockpit
                  </h1>
                  <p className="text-xs text-[var(--text3)]">
                    OP002 &middot; Goals, Objectives & Key Results
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => openNewGoal()}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent2)]"
            >
              <Plus size={16} /> New Goal
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">
        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryCard
            label="Total Goals"
            value={stats.total}
            icon={<Target size={18} />}
            color="text-[var(--accent)]"
            bgColor="bg-blue-50 dark:bg-blue-900/20"
          />
          <SummaryCard
            label="Active"
            value={stats.active}
            icon={<TrendingUp size={18} />}
            color="text-blue-600 dark:text-blue-400"
            bgColor="bg-blue-50 dark:bg-blue-900/20"
          />
          <SummaryCard
            label="On Track"
            value={stats.onTrack}
            icon={<CheckCircle2 size={18} />}
            color="text-emerald-600 dark:text-emerald-400"
            bgColor="bg-emerald-50 dark:bg-emerald-900/20"
          />
          <SummaryCard
            label="At Risk"
            value={stats.atRisk}
            icon={<AlertTriangle size={18} />}
            color="text-amber-600 dark:text-amber-400"
            bgColor="bg-amber-50 dark:bg-amber-900/20"
          />
          <SummaryCard
            label="Off Track"
            value={stats.offTrack}
            icon={<AlertTriangle size={18} />}
            color="text-red-600 dark:text-red-400"
            bgColor="bg-red-50 dark:bg-red-900/20"
          />
          <SummaryCard
            label="Avg Progress"
            value={`${stats.avgProgress}%`}
            icon={<TrendingUp size={18} />}
            color="text-violet-600 dark:text-violet-400"
            bgColor="bg-violet-50 dark:bg-violet-900/20"
          />
        </div>

        {/* ── Status Tabs + Search + Filters ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Status tabs */}
          <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === tab.key
                    ? "bg-[var(--bg)] text-[var(--text)] shadow-sm"
                    : "text-[var(--text3)] hover:text-[var(--text)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search + filter controls */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search goals..."
                className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] py-2 pl-9 pr-3 text-sm text-[var(--text)] placeholder-[var(--text3)] outline-none transition focus:border-[var(--accent)] w-56"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                showFilters || entityFilter || priorityFilter
                  ? "border-[var(--accent)] text-[var(--accent)] bg-blue-50 dark:bg-blue-900/20"
                  : "border-[var(--border2)] text-[var(--text3)] hover:text-[var(--text)]"
              }`}
            >
              <Filter size={14} /> Filters
              {(entityFilter || priorityFilter) && (
                <span className="ml-1 rounded-full bg-[var(--accent)] px-1.5 text-[10px] text-white">
                  {(entityFilter ? 1 : 0) + (priorityFilter ? 1 : 0)}
                </span>
              )}
            </button>

            <button
              onClick={fetchGoals}
              disabled={loading}
              className="rounded-lg border border-[var(--border2)] p-2 text-[var(--text3)] transition hover:bg-[var(--bg3)] hover:text-[var(--text)] disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── Filter row (expanded) ── */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-4 py-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-[var(--text3)]">Entity:</label>
              <div className="relative">
                <select
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value as EntityScope | "")}
                  className="appearance-none rounded-md border border-[var(--border2)] bg-[var(--bg)] px-3 py-1.5 pr-7 text-xs text-[var(--text)] outline-none"
                >
                  <option value="">All</option>
                  {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-[var(--text3)]">Priority:</label>
              <div className="relative">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as GoalPriority | "")}
                  className="appearance-none rounded-md border border-[var(--border2)] bg-[var(--bg)] px-3 py-1.5 pr-7 text-xs text-[var(--text)] outline-none"
                >
                  <option value="">All</option>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
              </div>
            </div>

            {(entityFilter || priorityFilter) && (
              <button
                onClick={() => {
                  setEntityFilter("")
                  setPriorityFilter("")
                }}
                className="ml-auto text-xs font-medium text-[var(--accent)] transition hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* ── Error state ── */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ── Loading state ── */}
        {loading && goals.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={24} className="animate-spin text-[var(--text3)]" />
          </div>
        )}

        {/* ── Goal tree ── */}
        {!loading && (
          <GoalTree
            goals={filteredGoals}
            onAddChild={(parent) => openNewGoal(parent)}
            onSelect={(goal) => {
              // Future: navigate to goal detail page
            }}
          />
        )}
      </div>

      {/* ── Create/Edit Modal ── */}
      <GoalFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setParentGoal(null)
        }}
        onSubmit={handleCreateGoal}
        parentGoal={parentGoal}
        allGoals={allFlat}
      />
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon,
  color,
  bgColor,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  bgColor: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgColor} ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-[var(--text)]">{value}</p>
        <p className="text-[11px] text-[var(--text3)]">{label}</p>
      </div>
    </div>
  )
}
