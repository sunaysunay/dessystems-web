import { sendBopMail, smtpConfigured } from '@/lib/bop-mailer';
import { getServerClient } from '@/lib/supabase-server';
import { toPortalLocale } from '@/lib/portal/labels';

// Offer notifications ride the platform's existing Zoho SMTP relay
// (lib/bop-mailer.ts — same transport as the contact form and invoice sends).
// Deliberately NO access code in any mail: the code travels via another channel.

const PORTAL_BASE = process.env.PORTAL_BASE_URL || 'https://dessystems.io';

type MailKind = 'offer_sent' | 'offer_updated';

const M: Record<string, Record<MailKind, { subject: string; heading: string; body: string; cta: string; hint: string }>> = {
  en: {
    offer_sent: {
      subject: 'A proposal is ready for you — DES Systems',
      heading: 'Your proposal is ready',
      body: 'We have prepared a proposal for you. You can review it, approve it, or request adjustments in your personal client portal.',
      cta: 'Open your portal',
      hint: 'Sign in with the access code you received from us separately. Questions? Just reply to this e-mail.',
    },
    offer_updated: {
      subject: 'Your proposal has been updated — DES Systems',
      heading: 'We updated your proposal',
      body: 'A new version of your proposal is ready, adjusted following your feedback. The change note in the portal shows exactly what changed.',
      cta: 'Review the new version',
      hint: 'Sign in with the access code you received from us separately. Questions? Just reply to this e-mail.',
    },
  },
  nl: {
    offer_sent: {
      subject: 'Er staat een voorstel voor u klaar — DES Systems',
      heading: 'Uw voorstel staat klaar',
      body: 'We hebben een voorstel voor u uitgewerkt. U kunt het bekijken, goedkeuren of een aanpassing vragen in uw persoonlijke klantportaal.',
      cta: 'Open uw portaal',
      hint: 'Log in met de toegangscode die u apart van ons heeft ontvangen. Vragen? Beantwoord gerust deze e-mail.',
    },
    offer_updated: {
      subject: 'Uw voorstel is bijgewerkt — DES Systems',
      heading: 'We hebben uw voorstel bijgewerkt',
      body: 'Er staat een nieuwe versie van uw voorstel klaar, aangepast naar aanleiding van uw feedback. In het portaal ziet u precies wat er is gewijzigd.',
      cta: 'Bekijk de nieuwe versie',
      hint: 'Log in met de toegangscode die u apart van ons heeft ontvangen. Vragen? Beantwoord gerust deze e-mail.',
    },
  },
  de: {
    offer_sent: {
      subject: 'Ein Angebot liegt für Sie bereit — DES Systems',
      heading: 'Ihr Angebot liegt bereit',
      body: 'Wir haben ein Angebot für Sie ausgearbeitet. In Ihrem persönlichen Kundenportal können Sie es prüfen, genehmigen oder Änderungen anfragen.',
      cta: 'Portal öffnen',
      hint: 'Melden Sie sich mit dem separat erhaltenen Zugangscode an. Fragen? Antworten Sie einfach auf diese E-Mail.',
    },
    offer_updated: {
      subject: 'Ihr Angebot wurde aktualisiert — DES Systems',
      heading: 'Wir haben Ihr Angebot aktualisiert',
      body: 'Eine neue Version Ihres Angebots liegt bereit, angepasst nach Ihrem Feedback. Im Portal sehen Sie genau, was sich geändert hat.',
      cta: 'Neue Version ansehen',
      hint: 'Melden Sie sich mit dem separat erhaltenen Zugangscode an. Fragen? Antworten Sie einfach auf diese E-Mail.',
    },
  },
  fr: {
    offer_sent: {
      subject: 'Une proposition vous attend — DES Systems',
      heading: 'Votre proposition est prête',
      body: 'Nous avons préparé une proposition pour vous. Vous pouvez la consulter, l’approuver ou demander des ajustements dans votre portail client personnel.',
      cta: 'Ouvrir votre portail',
      hint: 'Connectez-vous avec le code d’accès reçu séparément. Des questions ? Répondez simplement à cet e-mail.',
    },
    offer_updated: {
      subject: 'Votre proposition a été mise à jour — DES Systems',
      heading: 'Nous avons mis à jour votre proposition',
      body: 'Une nouvelle version de votre proposition est prête, ajustée suite à vos retours. La note de modification dans le portail montre exactement ce qui a changé.',
      cta: 'Consulter la nouvelle version',
      hint: 'Connectez-vous avec le code d’accès reçu séparément. Des questions ? Répondez simplement à cet e-mail.',
    },
  },
  tr: {
    offer_sent: {
      subject: 'Sizin için bir teklif hazır — DES Systems',
      heading: 'Teklifiniz hazır',
      body: 'Sizin için bir teklif hazırladık. Kişisel müşteri portalınızda inceleyebilir, onaylayabilir veya değişiklik isteyebilirsiniz.',
      cta: 'Portalınızı açın',
      hint: 'Ayrı olarak ilettiğimiz erişim koduyla giriş yapın. Sorunuz mu var? Bu e-postayı yanıtlamanız yeterli.',
    },
    offer_updated: {
      subject: 'Teklifiniz güncellendi — DES Systems',
      heading: 'Teklifinizi güncelledik',
      body: 'Geri bildiriminiz doğrultusunda teklifinizin yeni bir sürümü hazır. Portalda tam olarak nelerin değiştiğini görebilirsiniz.',
      cta: 'Yeni sürümü inceleyin',
      hint: 'Ayrı olarak ilettiğimiz erişim koduyla giriş yapın. Sorunuz mu var? Bu e-postayı yanıtlamanız yeterli.',
    },
  },
};

function renderHtml(t: (typeof M)['en'][MailKind], offerTitle: string, contactName: string | null, loginUrl: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f7f8;font-family:Arial,Helvetica,sans-serif;color:#141a20">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;border:1px solid #e3e6e9">
<tr><td style="padding:28px 32px 0">
  <span style="display:inline-block;width:10px;height:10px;background:#b4610c;border-radius:2px;vertical-align:middle"></span>
  <span style="font-size:13px;font-weight:bold;letter-spacing:1px;vertical-align:middle">&nbsp;DES SYSTEMS</span>
</td></tr>
<tr><td style="padding:20px 32px 0">
  <h1 style="margin:0;font-size:20px;line-height:1.3">${t.heading}</h1>
  <p style="font-size:14px;line-height:1.6;color:#48555f">${contactName ? `${contactName},<br/>` : ''}${t.body}</p>
  <p style="font-size:14px;color:#48555f;margin:4px 0 0"><b style="color:#141a20">${offerTitle}</b></p>
</td></tr>
<tr><td style="padding:24px 32px">
  <a href="${loginUrl}" style="display:inline-block;background:#141a20;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 24px;border-radius:6px">${t.cta}</a>
</td></tr>
<tr><td style="padding:0 32px 28px">
  <p style="font-size:12px;line-height:1.6;color:#7a8892;border-top:1px solid #eff1f3;padding-top:16px;margin:0">${t.hint}</p>
</td></tr>
</table>
<p style="font-size:11px;color:#9aa5ad;margin-top:16px">DES Systems · dessystems.io</p>
</td></tr></table></body></html>`;
}

/**
 * Notify a portal client that an offer was sent or revised.
 * Fire-and-forget by design: failures are logged to portal_events, never thrown —
 * a mail problem must not block the offer workflow.
 */
export async function notifyOfferByEmail(options: {
  clientId: string;
  offerId: string;
  offerTitle: string;
  kind: MailKind;
}): Promise<void> {
  const supabase = getServerClient();
  const log = async (type: string, detail: string): Promise<void> => {
    try {
      await supabase.from('portal_events').insert({ client_id: options.clientId, type, ref_id: options.offerId, detail });
    } catch { /* logging must never throw */ }
  };

  try {
    if (!smtpConfigured()) { await log('email_skipped', 'SMTP not configured'); return; }
    const { data: client } = await supabase
      .from('portal_clients')
      .select('slug, name, contact_name, email, locale, status')
      .eq('id', options.clientId)
      .single();
    if (!client?.email) { await log('email_skipped', `${options.offerTitle} · client has no e-mail address`); return; }

    const locale = toPortalLocale(client.locale);
    const t = (M[locale] ?? M.en)[options.kind];
    const loginUrl = `${PORTAL_BASE}/portal/login?c=${client.slug}&tenant=500`;
    await sendBopMail(client.email, t.subject, renderHtml(t, options.offerTitle, client.contact_name, loginUrl));
    await log('email_sent', `${options.kind} · ${options.offerTitle} → ${client.email}`);
  } catch (e) {
    await log('email_failed', `${options.offerTitle} · ${e instanceof Error ? e.message : 'unknown error'}`);
  }
}
