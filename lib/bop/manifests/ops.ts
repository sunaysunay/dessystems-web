import type { BopObject, BopDependency } from "@/lib/bop/types/objects";

export const OPS_SCREEN_OBJECTS: BopObject[] = [
  { object_id:"screen:OP001",type:"screen",module:"OPS",name:"Operations Cockpit",route:"/console/ops/tasks",status:"active",description:"Task management with SLA monitoring, 8-card stat strip, urgency-banded work queue" },
  { object_id:"screen:OP001-grid",type:"screen",module:"OPS",name:"Task Grid View",route:"/console/ops/tasks/grid",status:"active",description:"Sortable grid with multi-select and bulk actions" },
  { object_id:"screen:OP002",type:"screen",module:"OPS",name:"Strategy Cockpit",route:"/console/ops/goals",status:"active",description:"Goals & OKRs — hierarchical goal tree, KR tracking, entity-scoped periods" },
  { object_id:"screen:OP002-detail",type:"screen",module:"OPS",name:"Goal Detail",route:"/console/ops/goals/[id]",status:"active",description:"Goal header, KR value editor, check-in form, close-out" },
];

export const OPS_API_OBJECTS: BopObject[] = [
  { object_id:"api:ops/tasks:GET",type:"api",module:"OPS",name:"GET Tasks (list + cockpit-summary)",route:"/api/bop/ops/tasks",status:"active" },
  { object_id:"api:ops/tasks:POST",type:"api",module:"OPS",name:"Task Actions (create, transition, assign, bulk_update, snooze)",route:"/api/bop/ops/tasks",status:"active" },
  { object_id:"api:ops/tasks:PATCH",type:"api",module:"OPS",name:"Update Task",route:"/api/bop/ops/tasks",status:"active" },
  { object_id:"api:ops/tasks:DELETE",type:"api",module:"OPS",name:"Soft-Delete Task",route:"/api/bop/ops/tasks",status:"active" },
  { object_id:"api:ops/tasks/events:GET",type:"api",module:"OPS",name:"GET Task Events",route:"/api/bop/ops/tasks/events",status:"active" },
  { object_id:"api:ops/tasks/comments:GET",type:"api",module:"OPS",name:"GET Task Comments",route:"/api/bop/ops/tasks/comments",status:"active" },
  { object_id:"api:ops/tasks/comments:POST",type:"api",module:"OPS",name:"Add Task Comment",route:"/api/bop/ops/tasks/comments",status:"active" },
  { object_id:"api:ops/tasks/deps:GET",type:"api",module:"OPS",name:"GET Task Dependencies",route:"/api/bop/ops/tasks/deps",status:"active" },
  { object_id:"api:ops/tasks/deps:POST",type:"api",module:"OPS",name:"Add Task Dependency",route:"/api/bop/ops/tasks/deps",status:"active" },
  { object_id:"api:ops/tasks/deps:DELETE",type:"api",module:"OPS",name:"Remove Task Dependency",route:"/api/bop/ops/tasks/deps",status:"active" },
  { object_id:"api:ops/goals:GET",type:"api",module:"OPS",name:"GET Goals (tree + dashboard-summary)",route:"/api/bop/ops/goals",status:"active" },
  { object_id:"api:ops/goals:POST",type:"api",module:"OPS",name:"Goal Actions (create, create_kr, update_kr_value, checkin, close_out)",route:"/api/bop/ops/goals",status:"active" },
  { object_id:"api:ops/goals:PATCH",type:"api",module:"OPS",name:"Update Goal",route:"/api/bop/ops/goals",status:"active" },
  { object_id:"api:ops/goals:DELETE",type:"api",module:"OPS",name:"Soft-Delete Goal",route:"/api/bop/ops/goals",status:"active" },
];

export const OPS_TABLE_OBJECTS: BopObject[] = [
  { object_id:"table:op_tasks",type:"table",module:"OPS",name:"op_tasks",status:"active",description:"Operational tasks — 7-status, priority 1-4, SLA, polymorphic refs, checklist, tenant-scoped" },
  { object_id:"table:op_task_dependencies",type:"table",module:"OPS",name:"op_task_dependencies",status:"active",description:"Task blocker graph — self-ref prevention, cycle detection via RPC" },
  { object_id:"table:op_task_events",type:"table",module:"OPS",name:"op_task_events",status:"active",description:"Task audit trail — 12 event types, actor + payload" },
  { object_id:"table:op_task_comments",type:"table",module:"OPS",name:"op_task_comments",status:"active",description:"Threaded task comments with soft-delete" },
  { object_id:"table:op_task_attachments",type:"table",module:"OPS",name:"op_task_attachments",status:"active",description:"Task file attachments — Supabase Storage op-tasks/{task_id}/" },
  { object_id:"table:op_goals",type:"table",module:"OPS",name:"op_goals",status:"active",description:"Hierarchical goals — 3-level, entity-scoped, period-bound, health tracking" },
  { object_id:"table:op_goal_key_results",type:"table",module:"OPS",name:"op_goal_key_results",status:"active",description:"Key results — 5 metric types, weighted, direction-aware progress" },
  { object_id:"table:op_goal_kr_snapshots",type:"table",module:"OPS",name:"op_goal_kr_snapshots",status:"active",description:"Daily KR snapshots for sparklines and trend analysis" },
  { object_id:"table:op_goal_checkins",type:"table",module:"OPS",name:"op_goal_checkins",status:"active",description:"Goal check-ins — confidence 1-5, note, blockers" },
];

export const OPS_DEPENDENCIES: BopDependency[] = [
  { from_id:"screen:OP001",to_id:"api:ops/tasks:GET",dep_type:"calls" },
  { from_id:"screen:OP001",to_id:"api:ops/tasks:POST",dep_type:"calls" },
  { from_id:"screen:OP001",to_id:"component:ScreenHeader",dep_type:"renders" },
  { from_id:"api:ops/tasks:GET",to_id:"table:op_tasks",dep_type:"reads" },
  { from_id:"api:ops/tasks:POST",to_id:"table:op_tasks",dep_type:"writes" },
  { from_id:"api:ops/tasks:POST",to_id:"table:op_task_events",dep_type:"writes" },
  { from_id:"api:ops/tasks:PATCH",to_id:"table:op_tasks",dep_type:"writes" },
  { from_id:"api:ops/tasks:DELETE",to_id:"table:op_tasks",dep_type:"writes" },
  { from_id:"api:ops/tasks/events:GET",to_id:"table:op_task_events",dep_type:"reads" },
  { from_id:"api:ops/tasks/comments:GET",to_id:"table:op_task_comments",dep_type:"reads" },
  { from_id:"api:ops/tasks/comments:POST",to_id:"table:op_task_comments",dep_type:"writes" },
  { from_id:"api:ops/tasks/comments:POST",to_id:"table:op_task_events",dep_type:"writes" },
  { from_id:"api:ops/tasks/deps:GET",to_id:"table:op_task_dependencies",dep_type:"reads" },
  { from_id:"api:ops/tasks/deps:POST",to_id:"table:op_task_dependencies",dep_type:"writes" },
  { from_id:"api:ops/tasks/deps:DELETE",to_id:"table:op_task_dependencies",dep_type:"writes" },
  { from_id:"screen:OP002",to_id:"api:ops/goals:GET",dep_type:"calls" },
  { from_id:"screen:OP002",to_id:"api:ops/goals:POST",dep_type:"calls" },
  { from_id:"screen:OP002",to_id:"component:ScreenHeader",dep_type:"renders" },
  { from_id:"screen:OP002-detail",to_id:"api:ops/goals:GET",dep_type:"calls" },
  { from_id:"screen:OP002-detail",to_id:"api:ops/goals:POST",dep_type:"calls" },
  { from_id:"screen:OP002-detail",to_id:"api:ops/goals:PATCH",dep_type:"calls" },
  { from_id:"api:ops/goals:GET",to_id:"table:op_goals",dep_type:"reads" },
  { from_id:"api:ops/goals:GET",to_id:"table:op_goal_key_results",dep_type:"reads" },
  { from_id:"api:ops/goals:GET",to_id:"table:op_goal_checkins",dep_type:"reads" },
  { from_id:"api:ops/goals:POST",to_id:"table:op_goals",dep_type:"writes" },
  { from_id:"api:ops/goals:POST",to_id:"table:op_goal_key_results",dep_type:"writes" },
  { from_id:"api:ops/goals:POST",to_id:"table:op_goal_checkins",dep_type:"writes" },
  { from_id:"api:ops/goals:PATCH",to_id:"table:op_goals",dep_type:"writes" },
  { from_id:"api:ops/goals:DELETE",to_id:"table:op_goals",dep_type:"writes" },
];
