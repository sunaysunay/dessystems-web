'use client';
// DESPANEL-V2 Phase 5 — Leads, Tasks, Audit, Systems, Tenants, RBAC + module placeholder.
import { useEffect, useState } from 'react';
import { useScope } from '@/lib/scope-context';
import { USING_MOCK } from '@/lib/supabase';
import { can } from '@/lib/rbac';
import {
  getLeads, getTasks, getAudit, getSystems, getTenants, getRoles,
} from '@/lib/queries';
import type {
  Lead, Task, AuditEntry, SystemStat, TenantRow, RoleRow,
} from '@/data/mock';

function Header({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        {sub}
        {USING_MOCK && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">demo data</span>}
      </p>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">{children}</div>;
}

const TH = 'border-b border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500';
const TD = 'px-3 py-3 text-sm';

function Pill({ s }: { s: string }) {
  const map: Record<string, string> = {
    new: 'bg-blue-50 text-blue-700', contacted: 'bg-amber-50 text-amber-700',
    won: 'bg-emerald-50 text-emerald-700', open: 'bg-blue-50 text-blue-700',
    in_progress: 'bg-amber-50 text-amber-700', high: 'bg-rose-50 text-rose-700',
    medium: 'bg-slate-100 text-slate-600', ok: 'bg-emerald-50 text-emerald-700',
    warn: 'bg-amber-50 text-amber-700', down: 'bg-rose-50 text-rose-700',
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[s] ?? 'bg-slate-100 text-slate-600'}`}>{s}</span>;
}

export function LeadsScreen() {
  const { unit } = useScope();
  const [rows, setRows] = useState<Lead[]>([]);
  useEffect(() => { let l = true; void getLeads(unit.id).then(d => l && setRows(d)); return () => { l = false; }; }, [unit.id]);
  return (
    <>
      <Header title="Leads & CRM" sub={`${unit.label} · tenant_id ${unit.id}`} />
      <Card>
        <table className="w-full">
          <thead><tr><th className={TH}>ID</th><th className={TH}>Name</th><th className={TH}>Email</th><th className={TH}>Listing</th><th className={TH}>Status</th><th className={TH}>Date</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className={`${TD} font-mono text-xs text-slate-400`}>{r.id}</td>
                <td className={`${TD} font-semibold text-slate-900`}>{r.name}</td>
                <td className={`${TD} text-slate-600`}>{r.email}</td>
                <td className={`${TD} text-slate-600`}>{r.listing}</td>
                <td className={TD}><Pill s={r.status} /></td>
                <td className={`${TD} text-xs text-slate-500`}>{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

export function TasksScreen() {
  const [rows, setRows] = useState<Task[]>([]);
  useEffect(() => { let l = true; void getTasks().then(d => l && setRows(d)); return () => { l = false; }; }, []);
  return (
    <>
      <Header title="Tasks" sub="Operational tasks (global)" />
      <Card>
        <table className="w-full">
          <thead><tr><th className={TH}>ID</th><th className={TH}>Title</th><th className={TH}>Priority</th><th className={TH}>Status</th><th className={TH}>Due</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className={`${TD} font-mono text-xs text-slate-400`}>{r.id}</td>
                <td className={`${TD} font-semibold text-slate-900`}>{r.title}</td>
                <td className={TD}><Pill s={r.priority} /></td>
                <td className={TD}><Pill s={r.status} /></td>
                <td className={`${TD} text-xs text-slate-500`}>{r.due}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

export function AuditScreen() {
  const { unit, role } = useScope();
  const [rows, setRows] = useState<AuditEntry[]>([]);
  useEffect(() => { let l = true; void getAudit(unit.id).then(d => l && setRows(d)); return () => { l = false; }; }, [unit.id]);
  if (!can(role, 'view_audit')) return <Header title="Audit Log" sub="You don't have permission to view the audit log." />;
  return (
    <>
      <Header title="Audit Log" sub={`${unit.label} · who changed what`} />
      <Card>
        <table className="w-full">
          <thead><tr><th className={TH}>When</th><th className={TH}>Actor</th><th className={TH}>Action</th><th className={TH}>Target</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className={`${TD} text-xs text-slate-500`}>{r.when}</td>
                <td className={`${TD} text-slate-700`}>{r.actor}</td>
                <td className={`${TD} font-mono text-xs text-des-blue`}>{r.action}</td>
                <td className={`${TD} text-slate-600`}>{r.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

export function SystemsScreen() {
  const { unit, role } = useScope();
  const [rows, setRows] = useState<SystemStat[]>([]);
  useEffect(() => { let l = true; void getSystems(unit.id).then(d => l && setRows(d)); return () => { l = false; }; }, [unit.id]);
  if (!can(role, 'view_systems')) return <Header title="Systems Health" sub="Restricted to super admins." />;
  return (
    <>
      <Header title="Systems Health" sub={`${unit.label} · infrastructure & channels`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {rows.map(r => (
          <div key={r.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{r.label}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${r.state === 'ok' ? 'bg-emerald-500' : r.state === 'warn' ? 'bg-amber-400' : 'bg-rose-500'}`} />
              <span className="text-sm font-semibold text-slate-800">{r.value}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function TenantsScreen() {
  const { role } = useScope();
  const [rows, setRows] = useState<TenantRow[]>([]);
  useEffect(() => { let l = true; void getTenants().then(d => l && setRows(d)); return () => { l = false; }; }, []);
  if (!can(role, 'manage_users')) return <Header title="Tenants" sub="Restricted to super admins." />;
  return (
    <>
      <Header title="Tenants" sub="Business units in this database" />
      <Card>
        <table className="w-full">
          <thead><tr><th className={TH}>tenant_id</th><th className={TH}>Name</th><th className={TH}>Type</th><th className={TH}>Active</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className={`${TD} font-mono text-xs text-slate-400`}>{r.id}</td>
                <td className={`${TD} font-semibold text-slate-900`}>{r.name}</td>
                <td className={`${TD} text-slate-600`}>{r.type}</td>
                <td className={TD}><Pill s={r.active ? 'ok' : 'down'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

export function RbacScreen() {
  const { role } = useScope();
  const [rows, setRows] = useState<RoleRow[]>([]);
  useEffect(() => { let l = true; void getRoles().then(d => l && setRows(d)); return () => { l = false; }; }, []);
  if (!can(role, 'manage_users')) return <Header title="RBAC Roles" sub="Restricted to super admins." />;
  return (
    <>
      <Header title="RBAC Roles" sub="User → role assignments (admin_roles)" />
      <Card>
        <table className="w-full">
          <thead><tr><th className={TH}>User</th><th className={TH}>Role</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className={`${TD} text-slate-700`}>{r.user}</td>
                <td className={TD}><Pill s={r.role === 'super_admin' ? 'won' : 'medium'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

export function Placeholder({ name }: { name: string }) {
  return (
    <>
      <Header title={name} sub="Module scaffolded — wiring scheduled in a later phase." />
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        {name} screen is part of DESPANEL-V2. The shell, scope and data layer are ready;
        this module's queries land in a follow-up iteration.
      </div>
    </>
  );
}
