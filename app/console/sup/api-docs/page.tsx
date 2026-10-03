'use client';
import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/support/v1/cases',
    title: 'Create Case',
    description: 'Creates a new support case. Auto-creates a contact if the requester email is new.',
    request: `{
  "subject": "Login issue",
  "description": "Cannot log in since the last update",
  "requester": {
    "email": "user@example.com",
    "name": "John Doe",
    "external_id": "usr_123"       // optional
  },
  "category": "bug",               // access_problem | bug | question | feature_request | other
  "priority": "normal",            // low | normal | high | urgent
  "channel_kind": "api",
  "correlation_id": "ref-456",     // optional, your internal reference
  "idempotency_key": "idem-789",   // optional, prevents duplicate submission
  "context": {                     // optional
    "route": "/dashboard",
    "browser": "Chrome 120",
    "environment": "production",
    "app": "colourking",
    "app_version": "2.1.0",
    "os": "Windows 11",
    "locale": "nl-NL",
    "entity_refs": { "order_id": 42 },
    "recent_errors": ["TypeError at line 12"]
  }
}`,
    response: `{
  "case_number": "CK-0001",
  "id": 3,
  "status": "new",
  "subject": "Login issue",
  "priority": "normal",
  "category": "bug",
  "created_at": "2026-10-02T12:47:12.696Z"
}`,
    errors: [
      { code: 400, description: 'Missing required fields (subject, description, requester.email)' },
      { code: 400, description: 'Invalid category or priority value' },
      { code: 401, description: 'Missing or invalid API key' },
      { code: 409, description: 'Duplicate idempotency_key' },
    ],
  },
  {
    method: 'GET',
    path: '/api/support/v1/cases',
    title: 'List Cases',
    description: 'Returns paginated list of cases for the authenticated tenant.',
    request: `Query parameters:
  ?page=1          // page number (default: 1)
  ?limit=25        // items per page (default: 25, max: 100)
  ?status=open     // filter by status (optional)`,
    response: `{
  "cases": [
    {
      "id": 3,
      "case_number": "CK-0001",
      "subject": "Login issue",
      "category": "bug",
      "priority": "normal",
      "status": "waiting_provider",
      "channel_kind": "api",
      "created_at": "2026-10-02T12:47:12.696Z",
      "updated_at": "2026-10-02T12:47:12.836Z",
      "resolved_at": null,
      "closed_at": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 1
  }
}`,
    errors: [
      { code: 401, description: 'Missing or invalid API key' },
    ],
  },
  {
    method: 'GET',
    path: '/api/support/v1/cases/{number}',
    title: 'Get Case Detail',
    description: 'Returns full case detail including messages, events, and context.',
    request: `Path parameter:
  {number}  — case number, e.g. "CK-0001"`,
    response: `{
  "case": {
    "id": 3,
    "case_number": "CK-0001",
    "tenant_id": 1,
    "subject": "Login issue",
    "category": "bug",
    "priority": "normal",
    "status": "waiting_provider",
    "channel_kind": "api",
    "resolution": null,
    "correlation_id": "ref-456",
    "created_at": "...",
    "updated_at": "...",
    "resolved_at": null,
    "closed_at": null
  },
  "messages": [
    {
      "id": 3,
      "sender_role": "user",
      "body": "Cannot log in since the last update",
      "visibility": "public",
      "created_at": "..."
    }
  ],
  "events": [
    {
      "id": 1,
      "event_type": "case.created",
      "created_at": "..."
    }
  ],
  "context": { ... }
}`,
    errors: [
      { code: 401, description: 'Missing or invalid API key' },
      { code: 404, description: 'Case not found or not owned by tenant' },
    ],
  },
  {
    method: 'POST',
    path: '/api/support/v1/cases/{number}/messages',
    title: 'Reply to Case',
    description: 'Adds a message to an existing case. Automatically updates case status.',
    request: `{
  "body": "Here is additional information...",
  "sender_email": "user@example.com"
}`,
    response: `{
  "message_id": 4,
  "created_at": "2026-10-02T12:47:33.779Z"
}`,
    errors: [
      { code: 400, description: 'Missing body or sender_email' },
      { code: 401, description: 'Missing or invalid API key' },
      { code: 404, description: 'Case not found or not owned by tenant' },
    ],
  },
];

const METHOD_COLOR: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-green-100 text-green-700',
  PATCH: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
};

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-slate-400 uppercase">{label}</span>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="text-[10px] text-slate-400 hover:text-slate-600">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="text-xs bg-slate-900 text-slate-200 p-3 rounded-lg overflow-x-auto leading-relaxed">{code}</pre>
    </div>
  );
}

export default function SUP003ApiDocsPage() {
  useScope();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <ScreenHeader title="API Reference" description="SUP003 — Support Connector Engine public API" />

      {/* Auth section */}
      <div className="bg-white border rounded-lg p-5 mb-6">
        <h3 className="font-semibold mb-2">Authentication</h3>
        <p className="text-sm text-slate-600 mb-3">
          All requests require a Bearer token in the Authorization header. API keys are provisioned per tenant
          and can be managed from the Tenant Detail page.
        </p>
        <CodeBlock label="Header" code={'Authorization: Bearer dsk_<your_api_key>'} />
        <div className="mt-3 text-xs text-slate-500">
          <strong>Key format:</strong> <code className="bg-slate-100 px-1 rounded">dsk_</code> prefix + random token.
          Keys are hashed (SHA-256) at rest. The first 8 characters serve as a lookup prefix.
        </div>
      </div>

      {/* Base URL */}
      <div className="bg-white border rounded-lg p-5 mb-6">
        <h3 className="font-semibold mb-2">Base URL</h3>
        <div className="grid gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">DEV</span>
            <code className="text-sm text-slate-700">https://bop-dev.dessystems.io/api/support/v1</code>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">PROD</span>
            <code className="text-sm text-slate-700">https://bop.dessystems.io/api/support/v1</code>
          </div>
        </div>
      </div>

      {/* Status values */}
      <div className="bg-white border rounded-lg p-5 mb-6">
        <h3 className="font-semibold mb-2">Case Lifecycle</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {['new', 'in_progress', 'waiting_customer', 'waiting_provider', 'resolved', 'closed'].map(s => (
            <span key={s} className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">{s}</span>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Cases start as <code>new</code>. When a customer replies, status auto-transitions to <code>waiting_provider</code>.
          When an agent replies, it transitions to <code>waiting_customer</code>.
          Agents can resolve or close cases from the Support Queue.
        </p>
      </div>

      {/* Rate limits */}
      <div className="bg-white border rounded-lg p-5 mb-6">
        <h3 className="font-semibold mb-2">Rate Limits</h3>
        <p className="text-sm text-slate-600">
          Default: <strong>60 requests/minute</strong> per API key. Configurable per tenant.
          Exceeding the limit returns <code className="bg-slate-100 px-1 rounded">429 Too Many Requests</code>.
        </p>
      </div>

      {/* Endpoints */}
      <h3 className="font-semibold mb-3 text-lg">Endpoints</h3>
      <div className="space-y-3">
        {ENDPOINTS.map((ep, idx) => (
          <div key={idx} className="border rounded-lg bg-white overflow-hidden">
            <button
              onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
            >
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${METHOD_COLOR[ep.method]}`}>{ep.method}</span>
              <code className="text-sm text-slate-700 flex-1">{ep.path}</code>
              <span className="text-sm text-slate-500">{ep.title}</span>
              <svg className={`h-4 w-4 text-slate-400 transition-transform ${expandedIdx === idx ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedIdx === idx && (
              <div className="border-t p-5 space-y-4">
                <p className="text-sm text-slate-600">{ep.description}</p>

                <CodeBlock label="Request" code={ep.request} />
                <CodeBlock label="Response (200)" code={ep.response} />

                {ep.errors.length > 0 && (
                  <div>
                    <span className="text-[10px] font-medium text-slate-400 uppercase">Error Codes</span>
                    <div className="mt-1 space-y-1">
                      {ep.errors.map((err, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="font-mono text-red-500 shrink-0">{err.code}</span>
                          <span className="text-slate-600">{err.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick start */}
      <div className="bg-slate-50 border rounded-lg p-5 mt-6">
        <h3 className="font-semibold mb-2">Quick Start — cURL</h3>
        <CodeBlock label="Create a case" code={`curl -X POST https://bop-dev.dessystems.io/api/support/v1/cases \\
  -H "Authorization: Bearer dsk_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "subject": "Test case",
    "description": "Testing the API",
    "requester": { "email": "test@example.com", "name": "Test" },
    "category": "question",
    "priority": "normal",
    "channel_kind": "api"
  }'`} />
      </div>
    </div>
  );
}
