import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './src/i18n/routing';

// Country → locale (same pattern as descaravan middleware)
const countryToLocale: Record<string, string> = {
  NL: 'nl', BE: 'nl',
  DE: 'de', AT: 'de', CH: 'de', LI: 'de',
  FR: 'fr', LU: 'fr', MC: 'fr',
  TR: 'tr', CY: 'tr',
  RO: 'ro', MD: 'ro',
  BG: 'bg',
  GR: 'el',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es',
  IT: 'it', SM: 'it',
};

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Locale-prefixed paths: let next-intl serve them as usual
  if (pathname !== '/') return intlMiddleware(request);

  // 1. Respect manual choice from the language dropdown
  const manualLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (manualLocale && routing.locales.includes(manualLocale as (typeof routing.locales)[number])) {
    const url = request.nextUrl.clone();
    url.pathname = `/${manualLocale}`;
    return NextResponse.redirect(url, { status: 307 });
  }

  // 2. Geo-detect from Cloudflare IP country header
  const cfCountry =
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-vercel-ip-country') ||
    '';
  const country = cfCountry && cfCountry !== 'XX' && cfCountry !== 'T1'
    ? cfCountry.toUpperCase() : null;

  let detectedLocale = (country && countryToLocale[country]) || null;

  // 3. Fallback: browser Accept-Language
  if (!detectedLocale) {
    const acceptLang = request.headers.get('accept-language') || '';
    const browserLangs = acceptLang.split(',').map(p => p.split(';')[0].trim().slice(0, 2).toLowerCase());
    detectedLocale = browserLangs.find(l => routing.locales.includes(l as (typeof routing.locales)[number])) || routing.defaultLocale;
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${detectedLocale}`;
  const response = NextResponse.redirect(url, { status: 307 });
  // Debug cookie (1h TTL) — does NOT gate detection
  response.cookies.set('_geo', `${country || '?'}:${detectedLocale}`, { path: '/', maxAge: 60 * 60 });
  return response;
}

export const config = {
  matcher: ['/', '/(en|nl|de|fr|tr|ro|bg|el|es|it)/:path*']
};
