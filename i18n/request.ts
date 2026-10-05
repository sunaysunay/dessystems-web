import { getRequestConfig } from 'next-intl/server';
import { routing } from '@/src/i18n/routing';

type Messages = { [key: string]: string | Messages };

// Locale messages layered over English, so a key missing in a partial translation
// renders the English text instead of the raw "Namespace.key" string.
function withFallback(base: Messages, over: Messages): Messages {
  const out: Messages = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const b = out[k];
    out[k] = v && typeof v === 'object' && b && typeof b === 'object' ? withFallback(b, v) : v;
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as typeof routing.locales[number])) {
    locale = routing.defaultLocale;
  }
  const messages = (await import(`../messages/${locale}.json`)).default;
  if (locale === routing.defaultLocale) return { locale, messages };
  const en = (await import(`../messages/${routing.defaultLocale}.json`)).default;
  return { locale, messages: withFallback(en, messages) };
});
