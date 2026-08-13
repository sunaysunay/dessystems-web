"use client"

import { useState } from "react"
import {
  ChevronRight, ChevronDown, Target, Plus, MoreHorizontal,
  CheckCircle2, PauseCircle, AlertTriangle, XCircle, Award,
  ArrowUpDown, ArrowUp, ArrowDown, ListTodo, Cpu,
} from "lucide-react"
import type { Goal } from "@/lib/op-goals-types"
import {
  ENTITY_LABELS, PRIORITY_LABELS, PRIORITY_COLORS,
  HEALTH_COLORS, HEALTH_LABELS, STATUS_COLORS, STATUS_LABELS,
} from "@/lib/op-goals-types"
import type { EntityScope, GoalHealth, GoalStatus, GoalPriority } from "@/lib/op-goals-types"

export type SortField = "status" | "period_start" | "period_end" | "progress" | "priority" | null
export type SortDir = "asc" | "desc"

interface GoalTreeProps {
  goals: Goal[]
  onAddChild: (parent: Goal) => void
  onSelect: (goal: Goal) => void
  sortField?: SortField
  sortDir?: SortDir
  onSort?: (field: SortField) => void
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
  no_data: "bg-slate-400",
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—"
  return d.slice(0, 10)
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
  const [expanded, setExpanded] = useState(false)
  const hasChildren = (goal.children ?? []).length > 0
  const krCount = (goal.key_results ?? []).length
  const linkedTaskCount = (goal as any).linked_task_count ?? 0

  return (
    <div>
      <div
        className={`group flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5 transition hover:bg-[var(--bg2)] cursor-pointer ${LEVEL_INDENT[goal.level] ?? "pl-16"}`}
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
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Health dot */}
        <span
          className={`flex-none h-2 w-2 rounded-full ${HEALTH_DOTS[goal.health]}`}
          title={HEALTH_LABELS[goal.health]}
        />

        {/* Goal number */}
        <span className="flex-none text-[10px] font-mono font-medium text-[var(--text3)] w-14">
          {goal.goal_number}
        </span>

        {/* Title */}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text)]">
          {goal.title}
        </span>

        {/* Linked indicators */}
        <div className="flex-none flex items-center gap-1 w-12">
          {linkedTaskCount > 0 && (
            <span
              className="inline-flex items-center gap-0.5 rounded bg-cyan-50 px-1 py-0.5 text-[9px] font-bold text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400"
              title={`${linkedTaskCount} linked task${linkedTaskCount > 1 ? "s" : ""} (OP001)`}
            >
              <ListTodo size={9} />{linkedTaskCount}
            </span>
          )}
        </div>

        {/* Entity badge */}
        <span className="flex-none w-20 text-center">
          {goal.entity && (
            <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
              {ENTITY_LABELS[goal.entity as EntityScope] ?? goal.entity}
            </span>
          )}
        </span>

        {/* Status badge */}
        <span className="flex-none w-20 text-center">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[goal.status]}`}
          >
            {STATUS_LABELS[goal.status]}
          </span>
        </span>

        {/* Progress bar */}
        <div className="flex-none w-20 flex items-center gap-1.5">
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
          <span className="text-[10px] font-mono font-medium text-[var(--text3)] w-7 text-right">
            {Math.round(goal.progress_pct ?? 0)}%
          </span>
        </div>

        {/* Start date */}
        <span className="flex-none w-20 text-[10px] font-mono text-[var(--text3)] text-center">
          {formatDate(goal.period_start)}
        </span>

        {/* End date */}
        <span className="flex-none w-20 text-[10px] font-mono text-[var(--text3)] text-center">
          {formatDate(goal.period_end)}
        </span>

        {/* KR count */}
        <span className="flex-none text-[10px] text-[var(--text3)] w-8 text-right" title="Key Results">
          {krCount > 0 ? `${krCount} KR` : ""}
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
              <Plus size={13} />
            </button>
          )}
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

function SortHeader({
  label,
  field,
  currentField,
  currentDir,
  onSort,
  className,
}: {
  label: string
  field: SortField
  currentField: SortField
  currentDir: SortDir
  onSort?: (field: SortField) => void
  className?: string
}) {
  const active = currentField === field
  return (
    <button
      onClick={() => onSort?.(field)}
      className={`flex items-center gap-0.5 hover:text-[var(--text)] transition ${className ?? ""} ${active ? "text-[var(--text)]" : ""}`}
    >
      {label}
      {active ? (
        currentDir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />
      ) : (
        <ArrowUpDown size={9} className="opacity-40" />
      )}
    </button>
  )
}

export default function GoalTree({ goals, onAddChild, onSelect, sortField, sortDir = "asc", onSort }: GoalTreeProps) {
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
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
        <span className="w-5" />
        <span className="w-2" />
        <span className="w-14">ID</span>
        <span className="min-w-0 flex-1">Title</span>
        <span className="w-12 text-center">Links</span>
        <span className="w-20 text-center">Entity</span>
        <SortHeader label="Status" field="status" currentField={sortField ?? null} currentDir={sortDir} onSort={onSort} className="w-20 justify-center" />
        <SortHeader label="Progress" field="progress" currentField={sortField ?? null} currentDir={sortDir} onSort={onSort} className="w-20 justify-center" />
        <SortHeader label="Start" field="period_start" currentField={sortField ?? null} currentDir={sortDir} onSort={onSort} className="w-20 justify-center" />
        <SortHeader label="End" field="period_end" currentField={sortField ?? null} currentDir={sortDir} onSort={onSort} className="w-20 justify-center" />
        <span className="w-8 text-right">KRs</span>
        <span className="w-8" />
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
