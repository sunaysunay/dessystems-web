import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { trashFile, getAccount } from '@/lib/st/google-drive';

export const dynamic = 'force-dynamic';

// DELETE /api/bop/st/files/<driveFileId>?tenant=campers — move to Drive trash
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const tenant = req.nextUrl.searchParams.get('tenant');
  if (!tenant) return NextResponse.json({ error: 'tenant required' }, { status: 400 });
  try {
    await trashFile(tenant, fileId);
    const account = await getAccount(tenant);
    if (account) {
      await getServerClient().from('st_files')
        .update({ status: 'trashed' })
        .eq('account_id', account.id).eq('drive_file_id', fileId);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 502 });
  }
}
