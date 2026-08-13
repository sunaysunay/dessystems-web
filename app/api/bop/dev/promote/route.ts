import { NextResponse } from 'next/server';
import { exec } from 'child_process';

export const dynamic = 'force-dynamic';

export async function POST() {
  return new Promise<NextResponse>(resolve => {
    exec(
      'bash /opt/dessystems-console-dev/promote.sh',
      { timeout: 300_000 },
      (err, stdout, stderr) => {
        const output = stdout + (stderr ? '\nSTDERR:\n' + stderr : '');
        if (err) {
          resolve(NextResponse.json({ success: false, output, error: err.message }, { status: 500 }));
        } else {
          resolve(NextResponse.json({ success: true, output }));
        }
      }
    );
  });
}
