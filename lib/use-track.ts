'use client';
import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useScope } from '@/lib/scope-context';
import { getScreen } from '@/lib/screen-registry';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = sessionStorage.getItem('bop_session_id');
  if (!sid) {
    sid = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem('bop_session_id', sid);
  }
  return sid;
}

export function useTrack() {
  const { user, unit } = useScope();
  const pathname = usePathname();
  const screen = getScreen(pathname);

  const trackEvent = useCallback((event_type: string, control?: string, value?: string, metadata?: object) => {
    if (!user.email) return;
    fetch('/api/bop/track', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_email: user.email,
        tenant_id: unit.id,
        session_id: getSessionId(),
        screen_id: screen?.id,
        route: pathname,
        event_type,
        control,
        value,
        metadata,
      }),
    }).catch(() => {});
  }, [user.email, unit.id, screen?.id, pathname]);

  return { trackEvent, sessionId: getSessionId };
}

export { getSessionId };
