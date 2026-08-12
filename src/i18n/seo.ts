import { locales } from './routing'

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dessystems.io'

// hreflang alternates for a route ("" for home, "/solutions", ...).
// x-default points at the un-prefixed URL, which geo/language-detects via proxy.ts.
export function localeAlternates(path: string) {
  const languages: Record<string, string> = {}
  for (const l of locales) languages[l] = `${SITE_URL}/${l}${path}`
  languages['x-default'] = `${SITE_URL}${path || '/'}`
  return { canonical: `${SITE_URL}${path || '/'}`, languages }
}
