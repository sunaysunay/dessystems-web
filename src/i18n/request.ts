import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

type Messages = Record<string, unknown>

// Fallback chain: any key missing from a locale falls back to English
// instead of rendering the raw key path.
function deepMerge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base }
  for (const [key, value] of Object.entries(override)) {
    const baseVal = out[key]
    if (
      value && typeof value === 'object' && !Array.isArray(value) &&
      baseVal && typeof baseVal === 'object' && !Array.isArray(baseVal)
    ) {
      out[key] = deepMerge(baseVal as Messages, value as Messages)
    } else {
      out[key] = value
    }
  }
  return out
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale
  if (!locale || !routing.locales.includes(locale as any)) locale = routing.defaultLocale

  const fallback = (await import('../../messages/en.json')).default as Messages
  const messages =
    locale === routing.defaultLocale
      ? fallback
      : deepMerge(fallback, (await import(`../../messages/${locale}.json`)).default as Messages)

  return { locale, messages }
})
