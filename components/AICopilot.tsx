'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getScreen } from '@/lib/screen-registry';
import { BopSelect } from '@/components/BopSelect';

type Msg = { role: 'user' | 'assistant'; content: string };
type Agent = { id: string; name: string; provider: string; model: string; is_active: boolean; configured: boolean };

export function AICopilot({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const screen = getScreen(pathname);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentId, setAgentId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch('/api/bop/ai/agents').then(r => r.json()).then(j => {
      const list: Agent[] = j.agents ?? [];
      setAgents(list);
      const def = list.find(a => a.is_active) ?? list.find(a => a.configured) ?? list[0];
      setAgentId(prev => prev ?? def?.id ?? null);
    }).catch(() => {});
  }, [open]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const selected = agents.find(a => a.id === agentId) ?? null;

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next); setInput(''); setBusy(true);
    try {
      const j = await fetch('/api/bop/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, screen: screen?.id ?? null, agent_id: agentId }),
      }).then(r => r.json());
      setMessages(m => [...m, { role: 'assistant', content: j.reply ?? '(no response)' }]);
    } catch (e: any) {
      setMessages(m => [...m, { role: 'assistant', content: 'Request failed: ' + (e.message ?? e) }]);
    }
    setBusy(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-start bg-slate-900/30" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">AI</span>
            <span className="font-semibold text-slate-800">Copilot</span>
            {agents.length > 0 ? (
              <div className="w-48">
                <BopSelect size="sm" value={agentId ?? ''}
                  onChange={v => { setAgentId(v || null); setMessages([]); }}
                  options={agents.map(a => ({ value: a.id, label: a.name + (a.configured ? '' : ' — no key') }))} />
              </div>
            ) : (
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">no agents</span>
            )}
          </div>
          <button onClick={onClose} className="flex-shrink-0 text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        {selected && (
          <div className="border-b border-slate-100 px-5 py-1.5 text-[11px] text-slate-400">
            {selected.provider} · {selected.model}{!selected.configured && <span className="text-amber-600"> · no credentials — add api_key in bop_ai_agents</span>}
          </div>
        )}

        {/* messages */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.length === 0 && (
            <div className="mt-4 text-center text-sm text-slate-400">
              <p className="mb-2">Ask about this screen ({screen?.id ?? '—'}), how to do something, or navigating BOP.</p>
              {agents.length === 0 && (
                <p className="mx-auto max-w-xs rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-600">
                  No agents defined. Add rows to <code>bop_ai_agents</code> and set an <code>api_key</code>.
                </p>
              )}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{m.content}</div>
            </div>
          ))}
          {busy && <div className="flex justify-start"><div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-400">Thinking…</div></div>}
          <div ref={bottomRef} />
        </div>

        {/* input */}
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
              placeholder="Ask the copilot…  (Enter to send)" rows={1}
              className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <button onClick={() => { void send(); }} disabled={busy || !input.trim()}
              className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-40">Send</button>
          </div>
          <p className="mt-1 text-[10px] text-slate-300">Agent selectable · defined in bop_ai_agents · grounded in this screen’s help docs</p>
        </div>
      </div>
    </div>
  );
}
