'use client';
import { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter,
  Link as LinkIcon, List, ListOrdered, Heading2, Quote, AlignLeft,
  AlignCenter, AlignRight, Undo2, Redo2, Send, X,
  ChevronDown, ChevronUp, Type, Globe,
} from 'lucide-react';
import { SUPPORTED_LOCALES, LOCALE_LABELS } from '@/lib/comm/resolve-locale';

/* ── Locale-aware email copy ─────────────────────────────────── */
const EMAIL_COPY: Record<string, {
  greeting: (name: string) => string;
  signoff: string;
  teamName: string;
}> = {
  en: {
    greeting: (n) => n ? `Dear ${n},` : 'Dear Sir/Madam,',
    signoff: 'Kind regards,',
    teamName: 'DES Systems Team',
  },
  nl: {
    greeting: (n) => n ? `Beste ${n},` : 'Geachte heer/mevrouw,',
    signoff: 'Met vriendelijke groet,',
    teamName: 'DES Systems Team',
  },
  de: {
    greeting: (n) => n ? `Hallo ${n},` : 'Sehr geehrte Damen und Herren,',
    signoff: 'Mit freundlichen Grüßen,',
    teamName: 'DES Systems Team',
  },
  fr: {
    greeting: (n) => n ? `Cher(e) ${n},` : 'Madame, Monsieur,',
    signoff: 'Cordialement,',
    teamName: "L'équipe DES Systems",
  },
  tr: {
    greeting: (n) => n ? `Sayın ${n},` : 'Sayın Yetkili,',
    signoff: 'Saygılarımızla,',
    teamName: 'DES Systems Ekibi',
  },
};

const AUTO_BCC = 'bcc@dessystems.io';

interface RichEmailComposerProps {
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  contactName?: string;
  locale?: string;
  leadRefCode?: string;
  quickReplies?: { label: string; body: string }[];
  leadId?: string;
  tenantId?: number;
  actorEmail?: string;
  templateCategory?: string;
}

const COLORS = [
  { label: 'Default', value: '' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Purple', value: '#9333ea' },
  { label: 'Gray', value: '#6b7280' },
];

const HIGHLIGHT_COLORS = [
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bfdbfe' },
  { label: 'Pink', value: '#fbcfe8' },
  { label: 'Orange', value: '#fed7aa' },
];

function ToolbarButton({ active, onClick, title, children, disabled }: {
  active?: boolean; onClick: () => void; title: string; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} title={title} disabled={disabled}
      className={`rounded p-1.5 transition-colors ${
        active ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
      {children}
    </button>
  );
}

function buildInitialContent(
  locale: string,
  contactName: string,
  defaultBody?: string,
): string {
  const copy = EMAIL_COPY[locale] || EMAIL_COPY.en;
  const greeting = copy.greeting(contactName);
  const signoff = copy.signoff;
  const team = copy.teamName;

  if (defaultBody) {
    return `<p>${greeting}</p><p><br></p><p>${defaultBody.replace(/\n/g, '<br>')}</p><p><br></p><p>${signoff}<br>${team}</p>`;
  }

  return `<p>${greeting}</p><p><br></p><p><br></p><p>${signoff}<br>${team}</p>`;
}

export default function RichEmailComposer({
  open, onClose, onSent, defaultTo = '', defaultSubject = '', defaultBody = '',
  contactName = '', locale = 'en', leadRefCode = '',
  quickReplies = [], leadId, tenantId, actorEmail, templateCategory,
}: RichEmailComposerProps) {
  const subjectWithRef = defaultSubject
    ? (leadRefCode && !defaultSubject.includes(leadRefCode) ? `${defaultSubject} [${leadRefCode}]` : defaultSubject)
    : (leadRefCode ? `[${leadRefCode}]` : '');

  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState(AUTO_BCC);
  const [subject, setSubject] = useState(subjectWithRef);
  const [sending, setSending] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<string>('auto');

  useEffect(() => {
    if (!open || !leadId || !tenantId) return;
    void fetch(`/api/bop/crm/leads/${leadId}?tenant=${tenantId}`)
      .then(r => r.json())
      .then(j => {
        const resolved = j.lead?.locale || j.lead?.partner_locale || j.lead?.partner_country_locale;
        if (resolved && SUPPORTED_LOCALES.includes(resolved)) setSelectedLocale(resolved);
      })
      .catch(() => {});
  }, [open, leadId, tenantId]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline cursor-pointer', target: '_blank', rel: 'noopener noreferrer' },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Write your email...' }),
    ],
    content: buildInitialContent(locale, contactName, defaultBody),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3 text-sm text-slate-700',
      },
    },
  });

  const insertLink = useCallback(() => {
    if (!editor || !linkUrl.trim()) return;
    const url = linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    if (linkText.trim()) {
      editor.chain().focus()
        .insertContent(`<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText.trim()}</a>`)
        .run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
  }, [editor, linkUrl, linkText]);

  const openLinkModal = useCallback(() => {
    if (!editor) return;
    const existing = editor.getAttributes('link').href || '';
    const selectedText = editor.state.doc.textBetween(
      editor.state.selection.from, editor.state.selection.to, ''
    );
    setLinkUrl(existing);
    setLinkText(selectedText || '');
    setShowLinkModal(true);
  }, [editor]);

  const removeLink = useCallback(() => {
    editor?.chain().focus().unsetLink().run();
    setShowLinkModal(false);
  }, [editor]);

  async function handleSend() {
    if (!to.trim() || !editor) return;
    setSending(true);
    const effectiveLocale = selectedLocale === 'auto' ? locale : selectedLocale;

    if (templateCategory && leadId && tenantId) {
      await fetch(`/api/bop/crm/leads/${leadId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          category: templateCategory,
          locale: effectiveLocale,
          toOverride: to.trim() !== defaultTo ? to.trim() : undefined,
        }),
      });
    } else {
      const htmlBody = editor.getHTML();
      const finalBcc = bcc.trim();
      await fetch('/api/bop/crm/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          lead_id: leadId,
          event_type: 'email.sent',
          actor_type: 'user',
          actor_id: actorEmail,
          summary: subject || '(no subject)',
          payload: {
            to, cc: cc || undefined, bcc: finalBcc || undefined,
            subject, body: htmlBody, mode: 'rich_text', format: 'html',
          },
        }),
      });
    }

    setSending(false);
    onSent?.();
    onClose();
  }

  function applyQuickReply(body: string) {
    const copy = EMAIL_COPY[locale] || EMAIL_COPY.en;
    const greeting = copy.greeting(contactName);
    editor?.chain().focus().setContent(
      `<p>${greeting}</p><p><br></p><p>${body.replace(/\n/g, '<br>')}</p><p><br></p><p>${copy.signoff}<br>${copy.teamName}</p>`
    ).run();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800">Compose Email</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Recipients */}
        <div className="px-5 py-2 space-y-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 w-8">To</label>
            <input value={to} onChange={e => setTo(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            <button onClick={() => setShowCcBcc(!showCcBcc)}
              className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5">
              CC/BCC {showCcBcc ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          </div>
          {showCcBcc && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 w-8">CC</label>
                <input value={cc} onChange={e => setCc(e.target.value)} placeholder="cc@example.com"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 w-8">BCC</label>
                <input value={bcc} onChange={e => setBcc(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
                <span className="text-[9px] text-slate-400 flex-shrink-0">delivery copy</span>
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 w-8">Subj</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 w-8"><Globe size={12} /></label>
            <select value={selectedLocale} onChange={e => setSelectedLocale(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white">
              <option value="auto">Auto</option>
              {SUPPORTED_LOCALES.map(l => (
                <option key={l} value={l}>{LOCALE_LABELS[l]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Toolbar */}
        {editor && (
          <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-0.5 flex-wrap">
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo" disabled={!editor.can().undo()}>
              <Undo2 size={14} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo" disabled={!editor.can().redo()}>
              <Redo2 size={14} />
            </ToolbarButton>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <ToolbarButton active={editor.isActive('heading', { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading">
              <Heading2 size={14} />
            </ToolbarButton>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)">
              <Bold size={14} />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)">
              <Italic size={14} />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)">
              <UnderlineIcon size={14} />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
              <Strikethrough size={14} />
            </ToolbarButton>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <div className="relative">
              <ToolbarButton onClick={() => { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false); }} title="Text Color"
                active={showColorPicker}>
                <div className="flex flex-col items-center">
                  <Type size={12} />
                  <div className="w-3 h-0.5 rounded-full mt-0.5" style={{ background: editor.getAttributes('textStyle').color || '#1e293b' }} />
                </div>
              </ToolbarButton>
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 p-2 z-50 flex gap-1">
                  {COLORS.map(c => (
                    <button key={c.value} onClick={() => { c.value ? editor.chain().focus().setColor(c.value).run() : editor.chain().focus().unsetColor().run(); setShowColorPicker(false); }}
                      title={c.label} className="w-6 h-6 rounded-full border border-slate-200 hover:scale-110 transition-transform"
                      style={{ background: c.value || '#1e293b' }} />
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <ToolbarButton onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); }} title="Highlight"
                active={editor.isActive('highlight') || showHighlightPicker}>
                <Highlighter size={14} />
              </ToolbarButton>
              {showHighlightPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 p-2 z-50 flex gap-1">
                  {HIGHLIGHT_COLORS.map(c => (
                    <button key={c.value} onClick={() => { editor.chain().focus().toggleHighlight({ color: c.value }).run(); setShowHighlightPicker(false); }}
                      title={c.label} className="w-6 h-6 rounded-full border border-slate-200 hover:scale-110 transition-transform"
                      style={{ background: c.value }} />
                  ))}
                  <button onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlightPicker(false); }}
                    title="Remove" className="w-6 h-6 rounded-full border border-slate-200 hover:scale-110 transition-transform bg-white text-[8px] font-bold text-red-400">✕</button>
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
              <List size={14} />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
              <ListOrdered size={14} />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote block">
              <Quote size={14} />
            </ToolbarButton>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <ToolbarButton active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align left">
              <AlignLeft size={14} />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align center">
              <AlignCenter size={14} />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align right">
              <AlignRight size={14} />
            </ToolbarButton>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <ToolbarButton active={editor.isActive('link')} onClick={openLinkModal} title="Insert link">
              <LinkIcon size={14} />
            </ToolbarButton>
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 overflow-y-auto border-b border-slate-100" style={{ minHeight: 200 }}>
          <style>{`
            .ProseMirror { min-height: 200px; }
            .ProseMirror p.is-editor-empty:first-child::before {
              content: attr(data-placeholder);
              float: left; color: #94a3b8; pointer-events: none; height: 0;
            }
            .ProseMirror h1 { font-size: 1.5rem; font-weight: 700; margin: 0.5rem 0; }
            .ProseMirror h2 { font-size: 1.2rem; font-weight: 700; margin: 0.4rem 0; }
            .ProseMirror h3 { font-size: 1rem; font-weight: 700; margin: 0.3rem 0; }
            .ProseMirror ul { list-style: disc; padding-left: 1.5rem; }
            .ProseMirror ol { list-style: decimal; padding-left: 1.5rem; }
            .ProseMirror blockquote {
              border-left: 3px solid #cbd5e1; padding-left: 1rem;
              color: #64748b; margin: 0.5rem 0; font-style: italic;
            }
            .ProseMirror a { color: #2563eb; text-decoration: underline; cursor: pointer; }
            .ProseMirror mark { border-radius: 2px; padding: 1px 2px; }
            .ProseMirror p { margin: 0.25rem 0; }
            .ProseMirror:focus { outline: none; }
          `}</style>
          <EditorContent editor={editor} />
        </div>

        {/* Quick replies */}
        {quickReplies.length > 0 && (
          <div className="px-5 py-2 flex gap-2 flex-wrap border-b border-slate-100">
            <span className="text-[10px] text-slate-400 font-semibold self-center">Quick:</span>
            {quickReplies.map(qr => (
              <button key={qr.label} onClick={() => { if (!subject || subject === subjectWithRef) setSubject(qr.label + (leadRefCode ? ` [${leadRefCode}]` : '')); applyQuickReply(qr.body); }}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-100 transition-colors">
                {qr.label}
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="text-[10px] text-slate-400">HTML email · formatting preserved · BCC delivery copy active</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1.5">Cancel</button>
            <button onClick={handleSend} disabled={sending || !to.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-1.5 text-xs font-medium text-white disabled:opacity-50 hover:bg-blue-700 transition-colors">
              <Send size={12} /> {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>

        {/* Link modal */}
        {showLinkModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setShowLinkModal(false)}>
            <div className="bg-white rounded-xl shadow-xl p-5 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
              <h4 className="text-sm font-bold text-slate-800 mb-3">Insert Link</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Display text</label>
                  <input value={linkText} onChange={e => setLinkText(e.target.value)} placeholder="Click here"
                    className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">URL</label>
                  <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..."
                    className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-200"
                    onKeyDown={e => { if (e.key === 'Enter') insertLink(); }} />
                </div>
              </div>
              <div className="flex justify-between mt-4">
                {editor?.isActive('link') && (
                  <button onClick={removeLink} className="text-xs text-red-500 hover:text-red-700">Remove link</button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button onClick={() => setShowLinkModal(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                  <button onClick={insertLink} disabled={!linkUrl.trim()}
                    className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50 hover:bg-blue-700">
                    {editor?.isActive('link') ? 'Update' : 'Insert'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
