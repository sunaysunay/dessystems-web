// SY040 Support Center — help documentation seed
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const SCREEN = 'SY040';
const TARGET_TYPE = 'screen';

const docs = [
  // OVERVIEW
  {
    doc_type: 'overview',
    seq: 0,
    title: 'Support Center — Overview',
    body_md: `## Support Center (SY040)

The **Support Center** is the inbound ticket management hub for DES Systems administrators.
It handles support requests submitted by platform users directly from the BOP console
and gives admins a single place to read, reply, prioritise, and close every ticket.

### What this screen does

| Capability | Detail |
|---|---|
| Ticket inbox | Cross-tenant view of all open, waiting, and closed requests |
| Priority triage | Low / Normal / High / Critical flags with colour coding |
| Category filtering | Access problem, Bug, Question, Feature request, Other |
| Reply thread | Full conversation history between user and admin |
| Status control | Move tickets between Open, Waiting, Replied, Closed |
| Resolution note | Free-text root-cause field written before closing |
| Notifications | New tickets trigger Telegram alert + SMTP email to admin |
| User notification | Admin replies trigger in-console bell notification + email to user |

### Who can access this screen

| Role | Access |
|---|---|
| super_admin | Full read + reply + close |
| platform_admin | Full read + reply + close |
| Regular users | Submit only via the chat icon or Quick Create |

The screen lives under **System > Infrastructure** in the left nav.`,
  },

  // STEPS
  {
    doc_type: 'steps',
    seq: 1,
    title: 'Step 1 — Reviewing the ticket inbox',
    body_md: `### Reviewing the ticket inbox

When you open **Support Center** (SY040) you see two columns.

**Left column — request list**
- Each row shows: request number (SUP-000001), subject, tenant, category badge, priority dot, status chip, and time elapsed.
- Use the **Status** dropdown at the top to filter by open, waiting_admin, waiting_user, or closed.
- Use the **Priority** dropdown to narrow down to critical or high tickets first.
- Click any row to open the thread in the right panel.

**Priority colour key**

| Colour | Priority | Meaning |
|---|---|---|
| Red | Critical | Blocking — system unusable |
| Orange | High | Significant impact |
| Blue | Normal | Default |
| Grey | Low | No urgency |

**Status chip key**

| Chip | Meaning |
|---|---|
| open | New ticket, not yet replied |
| waiting_admin | User has replied; admin turn |
| waiting_user | Admin has replied; waiting for user |
| closed | Resolved; no further replies allowed |`,
  },
  {
    doc_type: 'steps',
    seq: 2,
    title: 'Step 2 — Reading the conversation thread',
    body_md: `### Reading the conversation thread

Click a request row to open the right-hand thread panel.

The panel shows:
- **Request header**: subject, category, priority, and the originating tenant
- **Context block** (collapsible): the page the user was on, their browser, viewport, and environment at the time of submission — useful for reproducing bugs
- **Message thread**: chronological, with each message labelled by sender (user or admin)
- **Reply box** at the bottom: your text input plus a Send button

Note: the thread is read-only once a ticket is closed. The status chip in the header will show Closed and the reply box is replaced with a notice.

To check which context the user provided, click the "Context included" chip in the first message to expand the details.`,
  },
  {
    doc_type: 'steps',
    seq: 3,
    title: 'Step 3 — Replying to a ticket',
    body_md: `### Replying to a ticket

1. Click the request in the left column.
2. Type your reply in the **Reply** text area at the bottom of the thread panel.
3. Click **Send Reply**.

What happens automatically:
- The ticket status flips to waiting_user.
- The user receives an in-console notification (polled every 30 seconds while they are logged in).
- An SMTP email is sent to the user's registered email address with a preview of your reply.

**Tips**
- Keep replies clear and actionable — the user receives them as email too.
- If you need more information before resolving, ask in the reply and the status will naturally stay at waiting_user until they respond.
- When the user replies, the status flips back to waiting_admin and you receive a Telegram alert.`,
  },
  {
    doc_type: 'steps',
    seq: 4,
    title: 'Step 4 — Changing priority or status',
    body_md: `### Changing priority or status

In the right-hand thread panel, below the thread and above the reply box, you will find:

- **Status** select — change between open, waiting_admin, waiting_user
- **Priority** select — change between low, normal, high, critical

These are updated when you click **Save** (or combined with a reply via **Send Reply**).

**When to manually change status**

| Situation | Action |
|---|---|
| Spam or duplicate | Change status to closed directly; add a resolution note |
| Escalated internally | Change priority to critical to keep it top of inbox |
| Waiting for third party | Keep waiting_user so the inbox does not re-surface it |
| Reopening a closed ticket | Not possible — user must submit a new request |`,
  },
  {
    doc_type: 'steps',
    seq: 5,
    title: 'Step 5 — Closing a ticket',
    body_md: `### Closing a ticket

1. Confirm the issue is resolved (or will not be addressed).
2. Write a **Resolution note** in the text field that appears when you change status to closed. This is internal — the user does not see it.
3. Click **Save & Close**.

What happens:
- Status is set to closed permanently.
- The resolution note is stored against the request record.
- The reply thread locks — no further messages can be added by either side.

Best practice: always write a resolution note. It is the only audit trail for why a ticket was closed and is visible to other admins reviewing the request later.

**Resolution note examples**
- Reset password via Supabase Auth admin. User confirmed access restored.
- Confirmed duplicate of SUP-000003. No action needed.
- Feature request logged in backlog under item #128.`,
  },

  // FAQ
  {
    doc_type: 'faq',
    seq: 0,
    title: 'How does a user submit a support request?',
    body_md: `Users submit requests from **inside the BOP console** — they never need to leave the app or send an email.

Two entry points:

1. **Chat icon** in the top navigation bar (always visible when logged in)
2. **Quick Create > Support Request** from the + button

Both open the **Support Drawer** — a slide-in panel where the user:
- Selects a category (Access problem / Bug / Question / Feature request / Other)
- Writes a subject and description
- Chooses a priority
- Reviews auto-captured context (current page, browser, viewport)
- Clicks Submit Request

**Rate limit:** 10 requests per user per hour to prevent spam.`,
  },
  {
    doc_type: 'faq',
    seq: 1,
    title: 'How am I notified of a new request?',
    body_md: `When a user submits a new request you receive two notifications:

1. **Telegram message** — sent to the configured BOP_TELEGRAM_CHAT_ID bot immediately. Contains the request number, subject, category, priority, and the user's email.
2. **Email** — sent via Zoho SMTP to the admin address configured in BOP_SMTP_FROM.

For subsequent user replies (when a ticket is in waiting_admin), you receive another Telegram alert.

If you are not receiving Telegram notifications, check that BOP_TELEGRAM_BOT_TOKEN and BOP_TELEGRAM_CHAT_ID are set in the dev or prod pm2 environment.`,
  },
  {
    doc_type: 'faq',
    seq: 2,
    title: 'What context is captured with each request?',
    body_md: `Every request automatically includes a **context snapshot** captured at the moment of submission:

| Field | Value |
|---|---|
| ctx_route | The URL path the user was on (e.g. /console/mp/listings) |
| ctx_browser | User agent string |
| ctx_env | dev or prod |
| ctx_extra.viewport | Screen width x height |

This is stored in the ctx JSONB column of sup_requests and displayed in the thread panel as a collapsible "Context included" chip.

Context is especially useful for reproducing bugs — it tells you exactly which screen the user was on and what device/browser they were using.`,
  },
  {
    doc_type: 'faq',
    seq: 3,
    title: 'Can a user see another user\'s tickets?',
    body_md: `No. The API enforces strict ownership:

- GET /api/bop/support/requests — returns only the requesting user's own tickets (unless the caller is a super_admin or platform_admin, who see all).
- GET /api/bop/support/requests/[id] — returns a 403 if the request was not created by the calling user (non-admins).
- POST /api/bop/support/requests/[id]/messages — same ownership check before allowing a reply.

Admins always see the cross-tenant full view in SY040.`,
  },
  {
    doc_type: 'faq',
    seq: 4,
    title: 'A ticket is stuck in "waiting_admin" — what does that mean?',
    body_md: `waiting_admin means the **user has sent a message** and the ball is in the admin's court.

Status transitions are automatic:
- Admin sends a reply → status becomes waiting_user
- User sends a reply → status becomes waiting_admin

If a ticket is stuck in waiting_admin, it means the user replied but no admin has responded yet. Filter the inbox by waiting_admin to surface these tickets quickly.

You can also manually override the status using the Status select in the thread panel if you need to reclassify.`,
  },
  {
    doc_type: 'faq',
    seq: 5,
    title: 'What is the difference between Support Center and Comm Center?',
    body_md: `They serve opposite directions:

| | Comm Center (SY030-SY039) | Support Center (SY040) |
|---|---|---|
| Direction | Outbound — admin sends to users | Inbound — users send to admin |
| Purpose | Transactional email, campaigns, templates | Support tickets, bug reports, questions |
| Tables | bop_comm_* | sup_requests, sup_messages |
| Initiated by | Admin | User |
| Threading | One-way broadcast | Two-way conversation |

Both share the same SMTP relay (Zoho) and Telegram environment variables, but the data is completely separate.`,
  },

  // REFERENCE
  {
    doc_type: 'reference',
    seq: 0,
    title: 'Database tables — sup_requests and sup_messages',
    body_md: `### sup_requests

The master ticket record.

| Column | Type | Description |
|---|---|---|
| request_id | uuid PK | Auto-generated |
| request_no | text | Human-readable ID: SUP-000001 (trigger-set) |
| tenant_id | uuid | Which tenant the user belongs to |
| created_by | uuid | auth.users.id of the submitter |
| category | text | access_problem / bug / question / feature_request / other |
| priority | text | low / normal / high / critical |
| status | text | open / waiting_admin / waiting_user / closed |
| subject | text | Short subject line |
| ctx | jsonb | Context snapshot: {ctx_route, ctx_browser, ctx_env, ctx_extra} |
| resolution | text | Admin-authored close note |
| closed_at | timestamptz | Set when status changes to closed |
| created_at | timestamptz | Submission time |
| updated_at | timestamptz | Auto-updated by trigger |

### sup_messages

Individual messages in the conversation thread.

| Column | Type | Description |
|---|---|---|
| message_id | uuid PK | Auto-generated |
| request_id | uuid FK | Parent ticket (sup_requests) |
| sender_id | uuid | auth.users.id of sender |
| sender_role | text | user or admin |
| body | text | Message content |
| created_at | timestamptz | Send time |

### Triggers

| Trigger | Table | Action |
|---|---|---|
| sup_set_request_no | sup_requests BEFORE INSERT | Sets SUP-NNNNNN from sequence |
| sup_on_message | sup_messages AFTER INSERT | Flips request status automatically |
| sup_touch_updated_at | sup_requests BEFORE UPDATE | Updates updated_at |`,
  },
  {
    doc_type: 'reference',
    seq: 1,
    title: 'API routes',
    body_md: `### API routes

All routes under /api/bop/support/ require a valid BOP session.

| Method | Route | Who | Description |
|---|---|---|---|
| GET | /api/bop/support/requests | user (own) / admin (all) | List requests |
| POST | /api/bop/support/requests | user | Create new request (rate-limited 10/hr) |
| GET | /api/bop/support/requests/[id] | owner or admin | Get request + full thread |
| PATCH | /api/bop/support/requests/[id] | admin only | Update status / priority / resolution |
| POST | /api/bop/support/requests/[id]/messages | owner or admin | Append a reply |

Rate limit enforcement (POST create): counts requests from the same user in the last hour and returns HTTP 429 if the count reaches 10.`,
  },
  {
    doc_type: 'reference',
    seq: 2,
    title: 'Environment variables',
    body_md: `### Environment variables used by Support Center

| Variable | Used for |
|---|---|
| BOP_TELEGRAM_BOT_TOKEN | Telegram notifications on new tickets and user replies |
| BOP_TELEGRAM_CHAT_ID | Target chat/channel for Telegram alerts |
| BOP_SMTP_HOST | SMTP server (Zoho) |
| BOP_SMTP_PORT | SMTP port (usually 465) |
| BOP_SMTP_USER | SMTP username |
| BOP_SMTP_PASS | SMTP password |
| BOP_SMTP_FROM | Sender address shown to users |

All are injected into the pm2 process via: source .env.local; pm2 restart --update-env

If any are missing, notifications fail silently (non-blocking) — the ticket is still created and visible in SY040.`,
  },
];

async function upsert(doc) {
  const { data: existing } = await sb.from('bop_documentation')
    .select('doc_id, version').eq('target_type', TARGET_TYPE).eq('target_id', SCREEN)
    .eq('doc_type', doc.doc_type).eq('seq', doc.seq).maybeSingle();

  if (existing) {
    const { error } = await sb.from('bop_documentation').update({
      title: doc.title, body_md: doc.body_md, status: 'active', owner: 'system',
      version: (existing.version ?? 1) + 1,
    }).eq('doc_id', existing.doc_id);
    if (error) throw new Error(`update ${doc.doc_type}#${doc.seq}: ${error.message}`);
    console.log(`  updated  ${doc.doc_type}#${doc.seq} — ${doc.title}`);
  } else {
    const { error } = await sb.from('bop_documentation').insert({
      target_type: TARGET_TYPE, target_id: SCREEN,
      doc_type: doc.doc_type, seq: doc.seq,
      title: doc.title, body_md: doc.body_md,
      status: 'active', owner: 'system', version: 1,
    });
    if (error) throw new Error(`insert ${doc.doc_type}#${doc.seq}: ${error.message}`);
    console.log(`  inserted ${doc.doc_type}#${doc.seq} — ${doc.title}`);
  }
}

console.log(`Seeding help docs for ${SCREEN}...`);
for (const doc of docs) await upsert(doc);
console.log(`Done — ${docs.length} docs seeded.`);
