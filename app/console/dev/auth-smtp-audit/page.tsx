'use client';
import { ScreenHeader } from '@/components/ScreenBadge';

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-slate-800">
        <span className={`h-4 w-1 rounded ${accent}`} />
        {title}
      </h2>
      <div className="space-y-3 text-[13px] leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11.5px] text-slate-700">{children}</code>;
}

function StatusChip({ label, tone }: { label: string; tone: 'ok' | 'fixed' | 'pending' | 'live' }) {
  const map = {
    ok: 'bg-emerald-100 text-emerald-700',
    fixed: 'bg-blue-100 text-blue-700',
    pending: 'bg-amber-100 text-amber-700',
    live: 'bg-red-100 text-red-600',
  };
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${map[tone]}`}>{label}</span>;
}

export default function AuthSmtpAuditPage() {
  return (
    <div className="p-6 max-w-[1000px]">
      <ScreenHeader title="Auth & SMTP Audit" description="DV008 — desmobil.com registration/login system audit: findings, fixes applied, and the cross-system trigger incident (2026-07-16 → 2026-07-18)" />

      {/* status cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Sell funnel', value: 'Live', tone: 'ok' as const },
          { label: 'Private login/register', value: 'Working', tone: 'ok' as const },
          { label: 'Dealer registration', value: 'Blocked until SQL run', tone: 'pending' as const },
          { label: 'BOP-provisioning trigger', value: 'Cleanup pending your SQL', tone: 'pending' as const },
        ].map(c => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{c.label}</div>
            <div className="mt-1"><StatusChip label={c.value} tone={c.tone} /></div>
          </div>
        ))}
      </div>

      <Section title="1. Two separate identity systems were in play" accent="bg-indigo-500">
        <p>
          desmobil.com's own consumer account model lives in <Code>dm_profiles</Code> (Supabase Auth <Code>auth.users</Code> + a
          profile row keyed on <Code>id</Code>). This is what the app actually reads everywhere — confirmed by a full source search,
          zero references anywhere else.
        </p>
        <p>
          A second, unrelated system was discovered live in the same production database: a Postgres trigger
          (<Code>on_auth_user_created</Code> → <Code>handle_new_user_registration()</Code>), defined in a <b>different repository</b>
          (<Code>dessiteAG_V4/supabase/migrations/20260714000001_dealer_registration_trigger.sql</Code>), that silently created a
          row in <Code>bop_user_profiles</Code> — the BOP enterprise console's own identity table — for <b>every</b> desmobil
          signup, private or business.
        </p>
        <p className="rounded-lg border border-red-100 bg-red-50/60 p-3 text-red-700">
          <b>Confirmed real impact:</b> <Code>bop_user_profiles.role</Code> is exactly the field <Code>/api/bop/user/me</Code> uses
          to authorize BOP console sessions. Two real desmobil customers (registered 2026‑07‑15) had a live <Code>role: &apos;viewer&apos;</Code>{' '}
          row in that table before this was found — meaning ordinary marketplace shoppers could potentially authenticate into the
          internal admin console. Those two rows were removed (their desmobil accounts were untouched). The trigger itself still
          needs to be dropped via SQL you run yourself — see §4.
        </p>
      </Section>

      <Section title="2. Dealer verification — was self-declared, now server-enforced" accent="bg-emerald-500">
        <p>
          <Code>dm_profiles.dealer_verified</Code> existed in the schema but was never set or checked anywhere. Any user could
          become &quot;business&quot; tier three ways: at registration, from Settings, or by calling{' '}
          <Code>PATCH /api/account/profile</Code> directly — with zero admin approval.
        </p>
        <p><b>Fixed</b> (<Code>src/app/api/account/profile/route.ts</Code>):</p>
        <ul className="ml-4 list-disc space-y-1">
          <li><Code>dealer_verified</Code> is excluded from the client-writable field allowlist — it can never be set to <Code>true</Code> by any client request.</li>
          <li>The profile row auto-creates from signup metadata on first login (was previously silently dropped for direct email/password dealer registrations).</li>
          <li>On any transition into <Code>account_type: &apos;business&apos;</Code>, an admin alert email fires (<Code>src/lib/account-mailer.ts</Code>) — the human-in-the-loop signal to manually verify.</li>
        </ul>
      </Section>

      <Section title="3. SMTP / email architecture" accent="bg-orange-500">
        <p>There are two entirely separate mail systems — worth not confusing:</p>
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-400">
              <th className="py-1.5 pr-3">System</th><th className="py-1.5 pr-3">Purpose</th><th className="py-1.5">Config</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            <tr>
              <td className="py-2 pr-3 font-semibold text-slate-700">This app&apos;s own mailer<br /><Code>sell-mailer.ts</Code> / <Code>account-mailer.ts</Code></td>
              <td className="py-2 pr-3">Admin-facing alerts only: sell leads, buyer messages, dealer-signup review. Never sent to customers.</td>
              <td className="py-2">nodemailer → <Code>smtp.zoho.eu</Code>, gated by <Code>SMTP_HOST/USER/PASS</Code> + <Code>SELL_ALERT_EMAIL</Code></td>
            </tr>
            <tr>
              <td className="py-2 pr-3 font-semibold text-slate-700">Supabase Auth emails</td>
              <td className="py-2 pr-3">Confirmation, password reset — customer-facing, mandatory (accounts can&apos;t be used until confirmed).</td>
              <td className="py-2">Supabase Dashboard → Authentication → Email Templates (outside this repo)</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2">
          Confirmed by direct testing: a fresh signup returns <Code>session: null</Code>, <Code>email_confirmed_at: null</Code> —
          confirmation is mandatory. The live &quot;Confirm Your Signup&quot; template was checked directly with the user: it is
          the plain English-only version (no debug artifacts, functional). A fully localized (10-language) replacement using the
          same branding exists at <Code>scratch/email_template.fixed.html</Code>, ready to paste in if/when localized confirmation
          emails are wanted — <StatusChip label="optional, not applied" tone="pending" />.
        </p>
        <p>Two silent-failure gaps were hardened this session — mail-send failures now <Code>console.error</Code> instead of vanishing:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li><Code>account-mailer.ts</Code> — dealer-signup admin alert</li>
          <li><Code>api/account/messages/route.ts</Code> — buyer-message admin alert</li>
        </ul>
      </Section>

      <Section title="4. Action required from you — one SQL statement" accent="bg-red-500">
        <p>
          Run this in <b>Supabase Dashboard → SQL Editor</b>. It cannot be executed from here — no DB connection string or
          Supabase CLI link is available on the VPS, and DDL isn&apos;t exposed via the REST API.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-[11.5px] text-emerald-300">
{`DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_registration();`}
        </pre>
        <p>Until this runs: dealer registration will continue to fail with &quot;Database error creating new user&quot; — isolated and confirmed via direct testing (<Code>account_type: &apos;business&apos;</Code> in signup metadata reliably triggers it; <Code>private</Code> does not).</p>
      </Section>

      <Section title="5. Other fixes applied this session" accent="bg-slate-400">
        <ul className="ml-4 list-disc space-y-1.5">
          <li><b>Next.js 16 <Code>params</Code> bug</b> — 6 account pages (appointments, garage, listings, offers, recently-viewed, reviews) used synchronous <Code>params</Code> destructuring; Next 16 requires <Code>await</Code>. Fixed, confirmed no more runtime warning.</li>
          <li><b>Tenant ID fallback bug</b> — <Code>login-client.tsx</Code> defaulted to <Code>tenant_id: &quot;200&quot;</Code> (descampers) instead of <Code>&quot;300&quot;</Code> (desmobil) if the env var was ever missing. Fixed.</li>
          <li><b>Translation pass</b> — 48 keys × 10 locales (bg, de, el, en, es, fr, it, nl, ro, tr) fixed. Prior patch scripts had injected raw English into every non-English locale for password/register/reset strings, and left a stale &quot;passwordless&quot; subtitle describing a flow that no longer exists. <Code>update-password-client.tsx</Code> was 100% hardcoded English — now fully localized.</li>
          <li><b>5 of 7 real registered users</b> pre-date the password-based rewrite (email/OTP-only, no password on file). They will hit &quot;invalid email or password&quot; on first login attempt — their only path back in is &quot;Forgot Password&quot;, which does work. No proactive user communication has been sent — <StatusChip label="your call" tone="pending" />.</li>
        </ul>
      </Section>

      <Section title="Files touched this session" accent="bg-slate-300">
        <div className="grid grid-cols-1 gap-x-6 gap-y-1 font-mono text-[11.5px] text-slate-500 sm:grid-cols-2">
          {[
            'src/app/api/account/profile/route.ts',
            'src/lib/account-mailer.ts (new)',
            'src/app/api/account/messages/route.ts',
            'src/components/login-client.tsx',
            'src/components/update-password-client.tsx',
            'src/app/[locale]/account/{appointments,garage,listings,offers,recently-viewed,reviews}/page.tsx',
            'messages/{bg,de,el,en,es,fr,it,nl,ro,tr}.json',
            'scratch/email_template.fixed.html (new, optional)',
          ].map(f => <span key={f}>{f}</span>)}
        </div>
      </Section>
    </div>
  );
}
