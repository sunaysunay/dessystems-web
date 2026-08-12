"use client"

import { useState } from "react"
import {
  ChevronRight, ChevronDown, Target, Plus, MoreHorizontal,
  CheckCircle2, PauseCircle, AlertTriangle, XCircle, Award,
} from "lucide-react"
import type { Goal } from "@/lib/op-goals-types"
import {
  ENTITY_LABELS, PRIORITY_LABELS, PRIORITY_COLORS,
  HEALTH_COLORS, HEALTH_LABELS, STATUS_COLORS, STATUS_LABELS,
} from "@/lib/op-goals-types"
import type { EntityScope, GoalHealth, GoalStatus, GoalPriority } from "@/lib/op-goals-types"

interface GoalTreeProps {
  goals: Goal[]
  onAddChild: (parent: Goal) => void
  onSelect: (goal: Goal) => void
}

const LEVEL_INDENT: Record<number, string> = {
  0: "pl-0",
  1: "pl-8",
  2: "pl-16",
}

const STATUS_ICONS: Record<GoalStatus, typeof Target> = {
  active: Target,
  achieved: CheckCircle2,
  semi_achieved: Award,
  paused: PauseCircle,
  closed: XCircle,
}

const HEALTH_DOTS: Record<GoalHealth, string> = {
  on_track: "bg-emerald-500",
  at_risk: "bg-amber-500",
  off_track: "bg-red-500",
}

function GoalRow({
  goal,
  onAddChild,
  onSelect,
}: {
  goal: Goal
  onAddChild: (g: Goal) => void
  onSelect: (g: Goal) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = (goal.children ?? []).length > 0
  const krCount = (goal.key_results ?? []).length
  const StatusIcon = STATUS_ICONS[goal.status] ?? Target

  return (
    <div>
      <div
        className={`group flex items-center gap-3 border-b border-[var(--border)] px-4 py-3 transition hover:bg-[var(--bg2)] cursor-pointer ${LEVEL_INDENT[goal.level] ?? "pl-16"}`}
        onClick={() => onSelect(goal)}
      >
        {/* Expand toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(!expanded)
          }}
          className={`flex-none rounded p-0.5 text-[var(--text3)] transition hover:text-[var(--text)] ${!hasChildren && "invisible"}`}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* Health dot */}
        <span
          className={`flex-none h-2.5 w-2.5 rounded-full ${HEALTH_DOTS[goal.health]}`}
          title={HEALTH_LABELS[goal.health]}
        />

        {/* Goal number + level icon */}
        <span className="flex-none text-[11px] font-mono font-medium text-[var(--text3)] w-16">
          {goal.goal_number}
        </span>

        {/* Title */}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text)]">
          {goal.title}
        </span>

        {/* Entity badge */}
        {goal.entity && (
          <span className="flex-none rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
            {ENTITY_LABELS[goal.entity as EntityScope] ?? goal.entity}
          </span>
        )}

        {/* Priority badge */}
        <span
          className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_COLORS[goal.priority as GoalPriority] ?? ""}`}
        >
          {PRIORITY_LABELS[goal.priority as GoalPriority] ?? goal.priority}
        </span>

        {/* Goal type badge */}
        {goal.goal_type === "aspirational" && (
          <span className="flex-none rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            Aspirational
          </span>
        )}

        {/* Progress bar */}
        <div className="flex-none w-24 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-[var(--bg4)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                goal.progress_pct >= 100
                  ? "bg-emerald-500"
                  : goal.progress_pct >= 70
                    ? "bg-blue-500"
                    : goal.progress_pct >= 40
                      ? "bg-amber-500"
                      : "bg-red-400"
              }`}
              style={{ width: `${Math.min(100, goal.progress_pct ?? 0)}%` }}
            />
          </div>
          <span className="text-[11px] font-mono font-medium text-[var(--text3)] w-8 text-right">
            {Math.round(goal.progress_pct ?? 0)}%
          </span>
        </div>

        {/* KR count */}
        <span className="flex-none text-[11px] text-[var(--text3)] w-10 text-right" title="Key Results">
          {krCount > 0 ? `${krCount} KR` : ""}
        </span>

        {/* Status badge */}
        <span
          className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[goal.status]}`}
        >
          {STATUS_LABELS[goal.status]}
        </span>

        {/* Actions */}
        <div className="flex-none flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          {goal.level < 2 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddChild(goal)
              }}
              className="rounded p-1 text-[var(--text3)] transition hover:bg-[var(--bg3)] hover:text-[var(--accent)]"
              title={goal.level === 0 ? "Add Objective" : "Add KR Goal"}
            >
              <Plus size={14} />
            </button>
          )}
          <button
            onClick={(e) => e.stopPropagation()}
            className="rounded p-1 text-[var(--text3)] transition hover:bg-[var(--bg3)] hover:text-[var(--text)]"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {goal.children!.map((child) => (
            <GoalRow
              key={child.id}
              goal={child}
              onAddChild={onAddChild}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function GoalTree({ goals, onAddChild, onSelect }: GoalTreeProps) {
  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Target size={48} className="mb-4 text-[var(--text3)] opacity-40" />
        <h3 className="text-lg font-semibold text-[var(--text)]">No goals yet</h3>
        <p className="mt-1 text-sm text-[var(--text3)]">
          Create your first strategic goal to get started with OKR tracking.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden">
      {/* Column headers */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg2)] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
        <span className="w-5" />
        <span className="w-2.5" />
        <span className="w-16">ID</span>
        <span className="min-w-0 flex-1">Title</span>
        <span className="w-16 text-center">Entity</span>
        <span className="w-14 text-center">Priority</span>
        <span className="w-16" />
        <span className="w-24 text-center">Progress</span>
        <span className="w-10 text-right">KRs</span>
        <span className="w-16 text-center">Status</span>
        <span className="w-14" />
      </div>

      {goals.map((goal) => (
        <GoalRow
          key={goal.id}
          goal={goal}
          onAddChild={onAddChild}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
