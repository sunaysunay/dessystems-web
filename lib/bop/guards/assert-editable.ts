import { getServerClient } from '@/lib/supabase-server';

export type EditAction = 'update' | 'delete' | 'archive' | 'lock';

// Minimum protection_lvl required for each action.
// Higher number = less restrictive. protection_lvl=4 means no restriction.
const ACTION_MIN_LEVEL: Record<EditAction, number> = {
  lock:    3,  // needs protection_lvl >= 3 (read_only or none)
  update:  3,  // needs protection_lvl >= 3
  archive: 2,  // needs protection_lvl >= 2
  delete:  4,  // needs protection_lvl = 4 (none); DB trigger is the hard stop
};

const LEVEL_NAME: Record<number, string> = {
  0: 'SYSTEM_LOCKED',
  1: 'DELETE_RESTRICTED',
  2: 'UPDATE_RESTRICTED',
  3: 'READ_ONLY',
  4: 'NONE',
};

export class ProtectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProtectionError';
  }
}

export async function assertEditable(
  objectId: string,
  action: EditAction,
  userId?: string
): Promise<void> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('bop_objects')
    .select('object_id,protection_lvl,criticality,change_policy,locked_by,locked_until,lock_reason')
    .eq('object_id', objectId)
    .single();

  if (error || !data) {
    throw new ProtectionError(`Object not found: ${objectId}`);
  }

  const lvl = data.protection_lvl ?? 4;
  const required = ACTION_MIN_LEVEL[action];

  if (lvl < required) {
    throw new ProtectionError(
      `Cannot ${action} "${objectId}": protection level is ${LEVEL_NAME[lvl]}` +
      (data.change_policy !== 'none' ? ` (policy: ${data.change_policy})` : '') + '.'
    );
  }

  if (
    data.locked_by &&
    data.locked_until &&
    new Date(data.locked_until) > new Date() &&
    data.locked_by !== userId
  ) {
    throw new ProtectionError(
      `"${objectId}" is locked until ${data.locked_until}. Reason: ${data.lock_reason ?? 'none'}`
    );
  }
}

export async function assertNoDependents(objectId: string): Promise<void> {
  const supabase = getServerClient();
  const { count, error } = await supabase
    .from('bop_dependencies')
    .select('*', { count: 'exact', head: true })
    .eq('to_id', objectId);

  if (error) return; // fail open on query error

  if ((count ?? 0) > 0) {
    throw new ProtectionError(
      `Cannot delete "${objectId}": ${count} object(s) depend on it. ` +
      `Review in Object Explorer → Used By before proceeding.`
    );
  }
}
