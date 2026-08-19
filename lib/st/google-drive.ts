// ST Storage module — standalone Google Drive connectivity per tenant.
// Credentials live in st_drive_accounts (Supabase); OAuth app in ST_GOOGLE_* env vars.
// No dependency on dessiteAG_V4 or the tenants table.
import { google, drive_v3 } from 'googleapis';
import { getServerClient } from '@/lib/supabase-server';

const CLIENT_ID = process.env.ST_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.ST_GOOGLE_CLIENT_SECRET;

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';

export interface StDriveAccount {
  id: string;
  tenant_key: string;
  display_name: string;
  google_email: string | null;
  refresh_token: string | null;
  root_folder_id: string | null;
  root_folder_name: string;
  status: 'disconnected' | 'connected' | 'error';
  quota_used_bytes: number | null;
  quota_limit_bytes: number | null;
  quota_measured_at: string | null;
  last_error: string | null;
  connected_at: string | null;
}

interface CachedClient { client: drive_v3.Drive; expiresAt: number }
const clientCache = new Map<string, CachedClient>();
const CACHE_TTL = 5 * 60 * 1000;

export function oauthRedirectUri(origin: string) {
  return `${origin}/api/bop/st/oauth/callback`;
}

export function buildOAuthClient(redirectUri: string) {
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('ST_GOOGLE_CLIENT_ID / ST_GOOGLE_CLIENT_SECRET not configured');
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, redirectUri);
}

export async function getAccount(tenantKey: string): Promise<StDriveAccount | null> {
  const sb = getServerClient();
  const { data } = await sb.from('st_drive_accounts').select('*').eq('tenant_key', tenantKey).single();
  return (data as StDriveAccount) ?? null;
}

export async function listAccounts(): Promise<StDriveAccount[]> {
  const sb = getServerClient();
  const { data } = await sb.from('st_drive_accounts').select('*').order('tenant_key');
  return (data as StDriveAccount[]) ?? [];
}

export function invalidateDriveCache(tenantKey?: string) {
  if (tenantKey) clientCache.delete(tenantKey);
  else clientCache.clear();
}

export async function driveFor(tenantKey: string): Promise<{ drive: drive_v3.Drive; account: StDriveAccount }> {
  const account = await getAccount(tenantKey);
  if (!account) throw new Error(`Unknown tenant: ${tenantKey}`);
  if (!account.refresh_token) throw new Error(`Tenant ${tenantKey} is not connected to Google Drive`);

  const cached = clientCache.get(tenantKey);
  if (cached && Date.now() < cached.expiresAt) return { drive: cached.client, account };

  const oauth2 = buildOAuthClient('postmessage');
  oauth2.setCredentials({ refresh_token: account.refresh_token });
  const drive = google.drive({ version: 'v3', auth: oauth2 });
  clientCache.set(tenantKey, { client: drive, expiresAt: Date.now() + CACHE_TTL });
  return { drive, account };
}

// ── Simple throttle: max ~2 write ops/sec across the process ─────────────────
let lastWrite = 0;
async function writeThrottle() {
  const wait = Math.max(0, lastWrite + 500 - Date.now());
  lastWrite = Date.now() + wait;
  if (wait) await new Promise(r => setTimeout(r, wait));
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let err: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e: any) {
      err = e;
      const code = e?.code ?? e?.response?.status;
      if (code !== 429 && (code < 500 || code >= 600)) throw e;
      await new Promise(r => setTimeout(r, 1000 * 2 ** i));
    }
  }
  throw err;
}

// ── Drive operations ─────────────────────────────────────────────────────────

export async function refreshQuota(tenantKey: string) {
  const { drive, account } = await driveFor(tenantKey);
  const { data } = await withRetry(() => drive.about.get({ fields: 'storageQuota,user(emailAddress)' }));
  const sb = getServerClient();
  await sb.from('st_drive_accounts').update({
    quota_used_bytes: Number(data.storageQuota?.usage ?? 0),
    quota_limit_bytes: data.storageQuota?.limit ? Number(data.storageQuota.limit) : null,
    quota_measured_at: new Date().toISOString(),
    google_email: data.user?.emailAddress ?? account.google_email,
  }).eq('tenant_key', tenantKey);
  return data.storageQuota;
}

export async function ensureRootFolder(tenantKey: string): Promise<string> {
  const { drive, account } = await driveFor(tenantKey);
  if (account.root_folder_id) return account.root_folder_id;
  const name = account.root_folder_name || 'BOP';
  const { data: found } = await withRetry(() => drive.files.list({
    q: `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false`,
    fields: 'files(id)', pageSize: 1,
  }));
  let folderId = found.files?.[0]?.id ?? null;
  if (!folderId) {
    await writeThrottle();
    const { data: created } = await withRetry(() => drive.files.create({
      requestBody: { name, mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id',
    }));
    folderId = created.id!;
  }
  const sb = getServerClient();
  await sb.from('st_drive_accounts').update({ root_folder_id: folderId }).eq('tenant_key', tenantKey);
  return folderId!;
}

export interface DriveEntry {
  id: string; name: string; mimeType: string; size: number | null;
  webViewLink: string | null; modifiedTime: string | null; isFolder: boolean;
}

function toEntry(f: drive_v3.Schema$File): DriveEntry {
  return {
    id: f.id!, name: f.name ?? '', mimeType: f.mimeType ?? '',
    size: f.size ? Number(f.size) : null,
    webViewLink: f.webViewLink ?? null, modifiedTime: f.modifiedTime ?? null,
    isFolder: f.mimeType === 'application/vnd.google-apps.folder',
  };
}

export async function listFolder(tenantKey: string, folderId?: string): Promise<DriveEntry[]> {
  const { drive } = await driveFor(tenantKey);
  const parent = folderId ?? await ensureRootFolder(tenantKey);
  const { data } = await withRetry(() => drive.files.list({
    q: `'${parent}' in parents and trashed = false`,
    fields: 'files(id,name,mimeType,size,webViewLink,modifiedTime)',
    orderBy: 'folder,name', pageSize: 200,
  }));
  return (data.files ?? []).map(toEntry);
}

export async function searchFiles(tenantKey: string, query: string): Promise<DriveEntry[]> {
  const { drive } = await driveFor(tenantKey);
  const { data } = await withRetry(() => drive.files.list({
    q: `name contains '${query.replace(/'/g, "\\'")}' and trashed = false`,
    fields: 'files(id,name,mimeType,size,webViewLink,modifiedTime)',
    pageSize: 50,
  }));
  return (data.files ?? []).map(toEntry);
}

export async function uploadFile(
  tenantKey: string,
  opts: { name: string; mimeType: string; body: NodeJS.ReadableStream | Buffer; folderId?: string },
): Promise<DriveEntry> {
  const { drive } = await driveFor(tenantKey);
  const parent = opts.folderId ?? await ensureRootFolder(tenantKey);
  await writeThrottle();
  const { Readable } = await import('stream');
  const body = Buffer.isBuffer(opts.body) ? Readable.from(opts.body) : opts.body;
  const { data } = await withRetry(() => drive.files.create({
    requestBody: { name: opts.name, parents: [parent] },
    media: { mimeType: opts.mimeType, body },
    fields: 'id,name,mimeType,size,webViewLink,modifiedTime',
  }));
  return toEntry(data);
}

export async function trashFile(tenantKey: string, fileId: string) {
  const { drive } = await driveFor(tenantKey);
  await writeThrottle();
  await withRetry(() => drive.files.update({ fileId, requestBody: { trashed: true } }));
}

export async function getFileStream(tenantKey: string, fileId: string) {
  const { drive } = await driveFor(tenantKey);
  const meta = await withRetry(() => drive.files.get({ fileId, fields: 'name,mimeType,size' }));
  const res = await withRetry(() => drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' }));
  return { stream: res.data as NodeJS.ReadableStream, meta: meta.data };
}

// ── st_files index helpers ───────────────────────────────────────────────────

export async function indexFile(accountId: string, entry: DriveEntry, extra?: {
  folderPath?: string; linkedObjectType?: string; linkedObjectId?: string; createdBy?: string;
}) {
  const sb = getServerClient();
  await sb.from('st_files').upsert({
    account_id: accountId,
    drive_file_id: entry.id,
    file_name: entry.name,
    mime_type: entry.mimeType,
    size_bytes: entry.size,
    web_view_link: entry.webViewLink,
    folder_path: extra?.folderPath ?? null,
    linked_object_type: extra?.linkedObjectType ?? null,
    linked_object_id: extra?.linkedObjectId ?? null,
    status: 'active',
    created_by: extra?.createdBy ?? null,
  }, { onConflict: 'account_id,drive_file_id' });
}
