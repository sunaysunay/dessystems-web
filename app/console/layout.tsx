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
    void getSession().then(s => {
      if (!s) { router.replace('/login'); return; }
      setOk(true);
      const seen = sessionStorage.getItem('bop_welcomed');
      if (!seen) {
        setShowWelcome(true);
        sessionStorage.setItem('bop_welcomed', '1');
      }
    });
  }, [router]);

  if (!ok) return <div className="flex h-screen items-center justify-center text-sm text-slate-400">Authenticating…</div>;
  return (
    <>
      {showWelcome && <WelcomeScreen onDismiss={() => setShowWelcome(false)} />}
      <Shell>{children}</Shell>
    </>
  );
}
