'use client';
// SA018 — Buyer Inquiry Detail: questions, contact, status machine, CRM lead promotion.
import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';

const INTENT_COLOR: Record<string, string> = {
  general:    'bg-slate-100 text-slate-600',
  b2b:        'bg-indigo-100 text-indigo-700',
  inspection: 'bg-amber-100 text-amber-700',
  logistics:  'bg-teal-100 text-teal-700',
  technical:  'bg-orange-100 text-orange-700',
};
const INTENT_EMOJI: Record<string, string> = {
  general: '💬', b2b: '💼', inspection: '👀', logistics: '🚚', technical: '🔧',
};
const STATUS_TRANSITIONS: Record<string, string[]> = {
  new:       ['seen', 'closed'],
  seen:      ['replied', 'closed'],
  replied:   ['closed'],
  closed:    [],
  converted: [],
};
const STATUS_COLOR: Record<string, string> = {
  new:       'bg-blue-100 text-blue-700',
  seen:      'bg-amber-100 text-amber-700',
  replied:   'bg-violet-100 text-violet-700',
  closed:    'bg-slate-100 text-slate-500',
  converted: 'bg-teal-100 text-teal-700',
};

const CARD_CLS = 'rounded-xl border border-slate-200 bg-white p-5';
const LBL_CLS = 'text-[10px] uppercase tracking-wider text-slate-400 font-semibold';
const VAL_CLS = 'mt-0.5 text-[13px] text-slate-800';
function RowItem({ label, value }: { label: string; value: unknown }) {
  if (!value) return null;
  return (
    <div className="flex justify-between border-b border-slate-50 py-1.5 text-[12px]">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-700">{String(value)}</span>
    </div>
  );
}

export default function InquiryDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolved: any = typeof (params as any)?.then === 'function' ? use(params as any) : params;
  const id: string = resolved.id;
  const router = useRouter();
  const { unit } = useScope();

  const [inq, setInq] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/bop/sal/inquiries/${id}`);
    const j = await res.json();
    if (j.inquiry) setInq(j.inquiry);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function setStatus(newStatus: string) {
    setBusy(true); setMsg('');
    const res = await fetch(`/api/bop/sal/inquiries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const j = await res.json();
    if (!res.ok) setMsg(j.error ?? 'Failed');
    else { await load(); setMsg('Status updated.'); }
    setBusy(false);
  }

  async function promote() {
    setPromoting(true); setMsg('');
    const res = await fetch(`/api/bop/sal/inquiries/${id}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: unit.id }),
    });
    const j = await res.json();
    if (!res.ok) {
      setMsg(j.error ?? 'Promotion failed');
    } else {
      await load();
      setMsg(j.already_existed ? 'Already linked to a CRM lead.' : 'CRM lead created successfully.');
    }
    setPromoting(false);
  }

  function copyEmail() {
    if (!inq?.contact_email) return;
    void navigator.clipboard.writeText(inq.contact_email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!inq) return <div className="p-6 text-slate-400 text-sm">Loading...</div>;



  const transitions = STATUS_TRANSITIONS[inq.status] ?? [];
  const isConverted = inq.status === 'converted';
  const canPromote = !isConverted && !inq.crm_lead_id && (inq.status === 'seen' || inq.status === 'replied');

  return (
    <div className="p-6">
      <ScreenHeader
        title={`Inquiry — ${inq.listing_id}`}
        description={`${inq.contact_name} · ${inq.status}`}
      />
      <button onClick={() => router.push('/console/sal/inquiries')} className="mt-2 text-[12px] text-slate-400 hover:text-slate-600">
        back to list
      </button>

      {msg && (
        <div className={`mt-3 rounded-lg px-4 py-2 text-[12px] ${msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {msg}
        </div>
      )}

      {isConverted && inq.crm_lead_id && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
          <span className="text-[13px] font-semibold text-teal-700">Converted to CRM Lead</span>
          <button
            onClick={() => router.push(`/console/crm/leads/${inq.crm_lead_id}`)}
            className="ml-auto rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-teal-700 transition-colors hover:bg-teal-50"
          >
            Open CRM Lead
          </button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className={CARD_CLS}>
            <h3 className="mb-3 text-[13px] font-bold text-slate-700">Questions asked</h3>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {(inq.intent_tags ?? []).map((tag: string) => (
                <span key={tag} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${INTENT_COLOR[tag] ?? ''}`}>
                  {INTENT_EMOJI[tag]} {tag}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(inq.question_codes ?? []).map((code: string) => (
                <span key={code} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] text-slate-700">
                  {code.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
            {inq.free_text && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <div className={`${LBL_CLS} mb-1`}>Additional note</div>
                <p className="text-[13px] text-slate-700 leading-relaxed">{inq.free_text}</p>
              </div>
            )}
          </div>

          <div className={CARD_CLS}>
            <h3 className="mb-3 text-[13px] font-bold text-slate-700">Listing</h3>
            <RowItem label='Listing ref / ID' value={inq.listing_id} />
            <RowItem label='Locale' value={inq.locale} />
            <RowItem label='Source' value={inq.source} />
            <RowItem label='Received' value={new Date(inq.created_at).toLocaleString('nl-NL')} />
            <RowItem label='Consent at' value={inq.consent_at ? new Date(inq.consent_at).toLocaleString('nl-NL') : null} />
          </div>
        </div>

        <div className="space-y-4">
          <div className={CARD_CLS}>
            <h3 className="mb-3 text-[13px] font-bold text-slate-700">Contact</h3>
            <div className="space-y-3">
              <div>
                <div className={LBL_CLS}>Name</div>
                <div className={VAL_CLS}>{inq.contact_name}</div>
              </div>
              <div>
                <div className={LBL_CLS}>Email</div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-[13px] text-slate-800">{inq.contact_email}</span>
                  <button
                    onClick={copyEmail}
                    className="rounded px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <a
                  href={`mailto:${inq.contact_email}?subject=${encodeURIComponent('Re: Your inquiry about listing ' + inq.listing_id)}`}
                  className="mt-1 block text-[11px] text-orange-500 hover:underline"
                >
                  Reply by email
                </a>
              </div>
              {inq.contact_phone && (
                <div>
                  <div className={LBL_CLS}>Phone</div>
                  <div className={VAL_CLS}>{inq.contact_phone}</div>
                </div>
              )}
            </div>
          </div>

          <div className={CARD_CLS}>
            <h3 className="mb-3 text-[13px] font-bold text-slate-700">Status</h3>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_COLOR[inq.status] ?? ''}`}>
              {inq.status}
            </span>

            {!isConverted && transitions.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className={LBL_CLS}>Move to</div>
                {transitions.map(s => (
                  <button
                    key={s}
                    onClick={() => { void setStatus(s); }}
                    disabled={busy}
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-[12px] font-medium text-slate-700 transition-colors hover:border-orange-300 hover:bg-orange-50 disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {canPromote && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className={`${LBL_CLS} mb-2`}>CRM Pipeline</div>
                <button
                  onClick={() => { void promote(); }}
                  disabled={promoting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-3 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                >
                  {promoting ? 'Creating...' : 'Create CRM Lead'}
                </button>
                <p className="mt-1.5 text-[10px] text-slate-400 leading-snug">
                  Creates a lead in the CRM pipeline and locks this inquiry from further status changes.
                </p>
              </div>
            )}

            {isConverted && (
              <div className="mt-3 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-[11px] text-teal-600">
                Locked — promoted to CRM lead.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
