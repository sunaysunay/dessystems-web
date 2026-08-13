import createMiddleware from 'next-intl/middleware'
import { routing, locales, type Locale } from './src/i18n/routing'
import { NextRequest, NextResponse } from 'next/server'

// Geo fallback only — an explicit user choice (NEXT_LOCALE cookie) and the
// browser's Accept-Language always take precedence over IP country.
const countryToLocale: Record<string, Locale> = {
  GB: 'en', IE: 'en', US: 'en',
  NL: 'nl', BE: 'nl',
  DE: 'de', AT: 'de', CH: 'de',
  FR: 'fr', LU: 'fr',
  TR: 'tr',
  RO: 'ro', MD: 'ro',
  BG: 'bg',
  GR: 'el', CY: 'el',
  PL: 'pl',
  ES: 'es',
  IT: 'it',
}

const intlMiddleware = createMiddleware(routing)
const STATIC_EXT = /\.(?:jpg|jpeg|png|gif|webp|svg|ico|css|js|woff2?|ttf|otf|mp4|pdf|txt|xml|json)$/i

function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value)
}

function fromAcceptLanguage(header: string | null): Locale | undefined {
  if (!header) return undefined
  const ranked = header
    .split(',')
    .map(part => {
      const [tag, ...params] = part.trim().split(';')
      const q = params.find(p => p.trim().startsWith('q='))
      return { tag: tag.trim().toLowerCase(), q: q ? parseFloat(q.split('=')[1]) : 1 }
    })
    .filter(e => e.tag && !Number.isNaN(e.q))
    .sort((a, b) => b.q - a.q)
  for (const { tag } of ranked) {
    const base = tag.split('-')[0]
    if (isLocale(base)) return base
  }
  return undefined
}

function detectLocale(request: NextRequest): Locale {
  const cookie = request.cookies.get('NEXT_LOCALE')?.value
  if (isLocale(cookie)) return cookie

  // Geo first — location expectation wins; browser language is the fallback
  const country = (request.headers.get('cf-ipcountry') ?? '').toUpperCase()
  const geo = countryToLocale[country]
  if (geo) return geo

  const negotiated = fromAcceptLanguage(request.headers.get('accept-language'))
  return negotiated ?? routing.defaultLocale
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    STATIC_EXT.test(pathname)
  ) {
    return NextResponse.next()
  }
  const hasLocale = locales.some(l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`)
  if (!hasLocale) {
    const locale = detectLocale(request)
    const url = request.nextUrl.clone()
    url.pathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`
    return NextResponse.redirect(url, 307)
  }
  return intlMiddleware(request)
}

export const config = { matcher: ['/((?!_next).*)'] }
