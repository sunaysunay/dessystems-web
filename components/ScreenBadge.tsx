'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getScreen, MOD_COLORS } from '@/lib/screen-registry';
import { useScope } from '@/lib/scope-context';
import { getSessionId } from '@/lib/use-track';
import { HelpPanel } from '@/components/HelpPanel';

// Top-bar screen code chip. For super_admin it doubles as the F1 help trigger
// (click the code, or press F1 / Shift+?) → contextual Help + Technical panel.
export function ScreenBadge() {
  const pathname = usePathname();
  const screen = getScreen(pathname);
  const { role } = useScope();
  const [helpOpen, setHelpOpen] = useState(false);
  const isAdmin = role === 'super_admin';

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!isAdmin || !screen) return;
      if (e.key === 'F1' || (e.shiftKey && e.key === '?')) { e.preventDefault(); setHelpOpen(true); }
    }
    function onOpen() { if (isAdmin && screen) setHelpOpen(true); }
    window.addEventListener('keydown', onKey);
    window.addEventListener('bop:open-help', onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('bop:open-help', onOpen); };
  }, [isAdmin, screen, screen?.id]);

  if (!screen) return null;
  const color = MOD_COLORS[screen.mod] ?? 'bg-slate-100 text-slate-500';

  if (!isAdmin) {
    return (
      <span className={`inline-flex items-center rounded px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide ${color}`}>
        {screen.id}
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setHelpOpen(true)}
        title={`Help for ${screen.id} — click or press F1`}
        className={`group inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide transition ${color} hover:ring-2 hover:ring-blue-300`}>
        {screen.id}
      </button>
      <HelpPanel screenId={screen.id} open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}

export function ScreenHeader({ title, description }: { title?: string; description?: string }) {
  const pathname = usePathname();
  const screen = getScreen(pathname);
  const { user, unit } = useScope();
  const tScreens = useTranslations('screens');
  const resolvedTitle = (() => {
    if (screen) {
      try {
        const tv = tScreens(screen.id as any);
        // next-intl returns the raw key path when a key is missing — treat as unresolved
        if (tv && tv !== `screens.${screen.id}` && tv !== screen.id) return tv;
      } catch {}
    }
    return title ?? screen?.title ?? '';
  })();

  useEffect(() => {
    if (!screen || !user.email) return;
    fetch('/api/bop/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_email: user.email,
        tenant_id: unit.id,
        screen_id: screen.id,
        screen_title: resolvedTitle,
        module: screen.mod,
        route: pathname,
        action: 'OPEN',
        session_id: getSessionId(),
      }),
    }).catch(() => {});
  }, [screen, screen?.id, user.email, unit.id, resolvedTitle, pathname]);

  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{resolvedTitle}</h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
    </div>
  );
}
