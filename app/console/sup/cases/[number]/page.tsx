'use client';
import { useState, useEffect, useRef } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { useParams, useRouter } from 'next/navigation';
import { VALID_TRANSITIONS } from '@/lib/support/types';
import type { Case, CaseMessage, CaseEvent, CaseStatus } from '@/lib/support/types';

interface Attachment {
  id: number;
  message_id: number;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

const STATUS_CHIP: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700', triage: 'bg-indigo-100 text-indigo-700',
  assigned: 'bg-purple-100 text-purple-700', in_progress: 'bg-amber-100 text-amber-700',
  waiting_customer: 'bg-teal-100 text-teal-700', waiting_provider: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700', closed: 'bg-slate-100 text-slate-500',
  reopened: 'bg-red-100 text-red-600', cancelled: 'bg-slate-200 text-slate-400',
};
const PRI_CHIP: Record<string, string> = {
  low: 'bg-slate-100 text-slate-500', normal: 'bg-blue-50 text-blue-600',
  high: 'bg-amber-100 text-amber-700', critical: 'bg-red-100 text-red-700',
};
const ROLE_CHIP: Record<string, string> = {
  contact: 'bg-blue-50 text-blue-700', agent: 'bg-teal-50 text-teal-700',
  admin: 'bg-teal-50 text-teal-700', user: 'bg-blue-50 text-blue-700',
  system: 'bg-slate-50 text-slate-500', api: 'bg-purple-50 text-purple-700',
};

const MAX_FILE_SIZE = 7 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];

function fmtTime(ts: string) {
  return new Date(ts).toLocaleString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string) {
  return mime.startsWith('image/');
}

export default function SU002Page() {
  useScope();
  const router = useRouter();
  const params = useParams();
  const caseNumber = params.number as string;
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'messages' | 'timeline'>('messages');
  const [replyText, setReplyText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }

  function loadCase() {
    setLoading(true);
    Promise.all([
      fetch(`/api/bop/support/cases/${caseNumber}`).then(r => r.json()),
      fetch(`/api/bop/support/cases/${caseNumber}/attachments`).then(r => r.json()).catch(() => ({ attachments: [] })),
    ]).then(([caseRes, attRes]) => {
      setCaseData(caseRes.case ?? null);
      setMessages(caseRes.messages ?? []);
      setEvents(caseRes.events ?? []);
      setAttachments(attRes.attachments ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  useEffect(() => { loadCase(); }, [caseNumber]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const valid: File[] = [];
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) { showToast(`${f.name} exceeds 7 MB limit`); continue; }
      if (!ALLOWED_TYPES.includes(f.type)) { showToast(`${f.name}: type not allowed`); continue; }
      valid.push(f);
    }
    const total = selectedFiles.length + valid.length;
    if (total > 5) { showToast('Max 5 files per message'); return; }
    setSelectedFiles(prev => [...prev, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(idx: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  }

  async function sendReply() {
    if ((!replyText.trim() && selectedFiles.length === 0) || !caseData) return;
    setSending(true);
    try {
      // 1. Send the message
      const res = await fetch(`/api/bop/support/cases/${caseNumber}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyText || '(attachment)', visibility: 'public' }),
      });
      if (!res.ok) { showToast('Failed to send reply'); setSending(false); return; }
      const { message } = await res.json();

      // 2. Upload attachments
      let uploadFailed = 0;
      for (const file of selectedFiles) {
        const fd = new FormData();
        fd.append('message_id', String(message.id));
        fd.append('file', file);
        const upRes = await fetch(`/api/bop/support/cases/${caseNumber}/attachments`, {
          method: 'POST',
          body: fd,
        });
        if (!upRes.ok) uploadFailed++;
      }

      setReplyText('');
      setSelectedFiles([]);
      loadCase();
      if (uploadFailed > 0) showToast(`Reply sent, ${uploadFailed} file(s) failed to upload`);
      else showToast('Reply sent');
    } catch { showToast('Network error'); }
    setSending(false);
  }

  async function downloadAttachment(att: Attachment) {
    try {
      const res = await fetch(`/api/bop/support/cases/${caseNumber}/attachments/${att.id}`);
      const { url } = await res.json();
      if (url) window.open(url, '_blank');
      else showToast('Failed to get download URL');
    } catch { showToast('Download failed'); }
  }

  async function transition(toStatus: CaseStatus) {
    if (!caseData) return;
    try {
      const res = await fetch(`/api/bop/support/cases/${caseNumber}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_status: toStatus }),
      });
      if (res.ok) { loadCase(); showToast(`Status -> ${toStatus}`); }
      else { const j = await res.json().catch(() => ({})); showToast(j.error || 'Transition failed'); }
    } catch { showToast('Network error'); }
  }

  async function assignToMe() {
    if (!caseData) return;
    try {
      const res = await fetch(`/api/bop/support/cases/${caseNumber}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assign_to_me: true }),
      });
      if (res.ok) { loadCase(); showToast('Assigned to you'); }
      else showToast('Assignment failed');
    } catch { showToast('Network error'); }
  }

  function getMessageAttachments(messageId: number) {
    return attachments.filter(a => a.message_id === messageId);
  }

  if (loading) return <div className="p-6"><ScreenHeader title="Case Workspace" description="SU002 — Case detail and messaging" /><div className="text-center py-12 text-slate-400">Loading case...</div></div>;
  if (!caseData) return <div className="p-6"><ScreenHeader title="Case Workspace" description="SU002 — Case detail and messaging" /><div className="text-center py-12 text-red-400">Case not found</div></div>;

  const validNext = VALID_TRANSITIONS[caseData.status] || [];

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <ScreenHeader title="Case Workspace" description="SU002 — Case detail and messaging" />

      {toast && <div className="fixed top-4 right-4 bg-slate-800 text-white px-4 py-2 rounded shadow-lg text-sm z-50">{toast}</div>}

      <button onClick={() => router.push('/console/sup/queue')} className="text-sm text-teal-600 hover:underline mb-4 inline-block">&larr; Back to queue</button>

      {/* Case header */}
      <div className="bg-white border rounded-lg p-5 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-lg font-bold">{caseData.case_number || caseData.request_no}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${STATUS_CHIP[caseData.status] || ''}`}>{caseData.status.replace(/_/g, ' ')}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${PRI_CHIP[caseData.priority] || ''}`}>{caseData.priority}</span>
            </div>
            <h2 className="text-xl font-semibold mb-2">{caseData.subject}</h2>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>Channel: <strong>{caseData.channel_kind}</strong></span>
              <span>Category: <strong>{caseData.category}</strong></span>
              <span>By: <strong>{caseData.created_by}</strong></span>
              <span>Created: {fmtTime(caseData.created_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={assignToMe} className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs hover:bg-purple-700">Assign to me</button>
          </div>
        </div>

        {validNext.length > 0 && (
          <div className="mt-4 pt-3 border-t flex items-center gap-2">
            <span className="text-xs text-slate-500">Transition to:</span>
            {validNext.map(s => (
              <button key={s} onClick={() => transition(s)} className={`text-xs px-2.5 py-1 rounded border hover:shadow ${STATUS_CHIP[s] || 'bg-slate-100'}`}>
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}

        {caseData.resolution && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm">
            <span className="font-medium text-green-700">Resolution:</span> {caseData.resolution}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b">
        <button onClick={() => setTab('messages')} className={`pb-2 text-sm font-medium border-b-2 ${tab === 'messages' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400'}`}>
          Messages ({messages.length})
        </button>
        <button onClick={() => setTab('timeline')} className={`pb-2 text-sm font-medium border-b-2 ${tab === 'timeline' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400'}`}>
          Timeline ({events.length})
        </button>
      </div>

      {tab === 'messages' ? (
        <div>
          <div className="space-y-3 mb-4 max-h-[500px] overflow-y-auto">
            {messages.map(m => {
              const msgAtts = getMessageAttachments(m.id);
              return (
                <div key={m.id} className={`p-3 rounded-lg border ${m.sender_role === 'admin' ? 'bg-teal-50 border-teal-200 ml-8' : 'bg-white mr-8'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${ROLE_CHIP[m.sender_role] || ''}`}>{m.sender_role}</span>
                    {m.visibility !== 'public' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">{m.visibility}</span>}
                    <span className="text-[10px] text-slate-400">{fmtTime(m.created_at)}</span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{m.body}</div>

                  {/* Attachments */}
                  {msgAtts.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {msgAtts.map(att => (
                        <button
                          key={att.id}
                          onClick={() => downloadAttachment(att)}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded border bg-white hover:bg-slate-50 transition-colors text-xs"
                        >
                          {isImage(att.mime_type) ? (
                            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          )}
                          <span className="max-w-[150px] truncate">{att.file_name}</span>
                          <span className="text-slate-400">{fmtSize(att.file_size)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Reply box */}
          <div className="border rounded-lg p-3 bg-white">
            <textarea
              className="w-full border rounded p-2 text-sm resize-none"
              rows={3}
              placeholder="Type your reply..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
            />

            {/* File attachments preview */}
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded text-xs">
                    {isImage(f.type) ? (
                      <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <span className="text-slate-400">{fmtSize(f.size)}</span>
                    <button onClick={() => removeFile(i)} className="text-red-400 hover:text-red-600 ml-1">x</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-2">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  Attach file
                  <span className="text-slate-400">(max 7 MB, png/jpg/gif/webp/pdf)</span>
                </button>
              </div>
              <button onClick={sendReply} disabled={sending || (!replyText.trim() && selectedFiles.length === 0)} className="bg-teal-600 text-white px-4 py-1.5 rounded text-sm hover:bg-teal-700 disabled:opacity-50">
                {sending ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {events.map(e => (
            <div key={e.id} className="flex items-start gap-3 p-2 text-xs border-b">
              <span className="text-slate-400 w-28 flex-shrink-0">{fmtTime(e.created_at)}</span>
              <span className="bg-slate-100 px-1.5 py-0.5 rounded">{e.event_type}</span>
              <span className="text-slate-500">{e.actor_type}{e.actor_id ? ` (${e.actor_id})` : ''}</span>
              {e.after_val && <span className="text-slate-400 truncate max-w-[300px]">{JSON.stringify(e.after_val)}</span>}
            </div>
          ))}
          {events.length === 0 && <div className="text-center py-8 text-slate-400">No events yet</div>}
        </div>
      )}
    </div>
  );
}
