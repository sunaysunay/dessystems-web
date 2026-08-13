import { cookies } from 'next/headers';

export async function callerRole(): Promise<string> {
  const store = await cookies();
  return store.get('bop_role')?.value ?? '';
}
export async function callerUid(): Promise<string> {
  const store = await cookies();
  return store.get('bop_uid')?.value ?? '';
}
export async function isSuperAdmin(): Promise<boolean> {
  return (await callerRole()) === 'super_admin';
}
