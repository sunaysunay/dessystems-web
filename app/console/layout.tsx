'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/Shell';
import WelcomeScreen from '@/components/WelcomeScreen';
import { getSession } from '@/lib/auth';

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 8000));
    let cancelled = false;
    void Promise.race([getSession().catch(() => null), timeout]).then(s => {
      if (cancelled) return;
      if (!s) { router.replace('/login'); return; }
      setOk(true);
      const seen = sessionStorage.getItem('bop_welcomed');
      if (!seen) {
        setShowWelcome(true);
        sessionStorage.setItem('bop_welcomed', '1');
      }
    });
    return () => { cancelled = true; };
  }, [router]);

  if (!ok) return <div className="flex h-screen items-center justify-center text-sm text-slate-400">Authenticating…</div>;
  return (
    <>
      {showWelcome && <WelcomeScreen onDismiss={() => setShowWelcome(false)} />}
      <Shell>{children}</Shell>
    </>
  );
}
