'use client';
import { useEffect, useState, useCallback } from 'react';
import { useScope } from '@/lib/scope-context';

export default function WelcomeScreen({ onDismiss }: { onDismiss: () => void }) {
  const { user, unit } = useScope();
  const [visible, setVisible] = useState(false);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  }, [onDismiss]);

  useEffect(() => {
    // Fade in
    const t = setTimeout(() => setVisible(true), 30);
    // Auto-dismiss after 4s
    const auto = setTimeout(() => handleDismiss(), 4000);
    return () => { clearTimeout(t); clearTimeout(auto); };
  }, [handleDismiss]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 transition-opacity duration-300 cursor-pointer ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <span className="rounded-lg bg-des-orange px-3 py-1.5 text-2xl font-black text-white tracking-wide">DES</span>
        <span className="text-2xl font-bold text-white tracking-widest">BOP</span>
        <span className="rounded-full border border-slate-700 px-2.5 py-0.5 text-xs font-semibold text-slate-400 tracking-widest uppercase">Business Operations</span>
      </div>

      {/* Greeting */}
      <p className="text-4xl font-bold text-white mb-2">{greeting}, {user.name.split(' ')[0]}.</p>
      <p className="text-slate-400 text-base mb-10">
        {unit.label} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      {/* Module quick-access pills */}
      <div className="flex flex-wrap justify-center gap-2 max-w-lg mb-12">
        {[
          { label: 'Analytics', tc: 'BO002', color: 'bg-blue-900/40 text-blue-300 border-blue-800' },
          { label: 'CRM', tc: 'CR001', color: 'bg-violet-900/40 text-violet-300 border-violet-800' },
          { label: 'Orders', tc: 'SA002', color: 'bg-emerald-900/40 text-emerald-300 border-emerald-800' },
          { label: 'Finance', tc: 'FI001', color: 'bg-amber-900/40 text-amber-300 border-amber-800' },
          { label: 'Inventory', tc: 'IN001', color: 'bg-cyan-900/40 text-cyan-300 border-cyan-800' },
          { label: 'Publishing', tc: 'PB001', color: 'bg-pink-900/40 text-pink-300 border-pink-800' },
        ].map(m => (
          <span key={m.tc} className={`rounded-full border px-3 py-1 text-xs font-semibold ${m.color}`}>
            {m.label} <span className="opacity-50 font-mono ml-1">{m.tc}</span>
          </span>
        ))}
      </div>

      <p className="text-xs text-slate-600 tracking-widest uppercase">Click anywhere to continue</p>
    </div>
  );
}
