import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { NextRequest, NextResponse } from 'next/server'
const countryToLocale: Record<string,string> = { NL:'nl',BE:'nl',DE:'de',AT:'de',CH:'de',FR:'fr',LU:'fr',TR:'tr',CY:'tr' }
const intlMiddleware = createMiddleware(routing)
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) return NextResponse.next()
  const hasLocale = routing.locales.some(l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`)
  if (!hasLocale && pathname === '/') {
    const country = request.headers.get('cf-ipcountry') ?? ''
    const detected = countryToLocale[country.toUpperCase()]
    if (detected && detected !== 'en') { const url = request.nextUrl.clone(); url.pathname = `/${detected}`; return NextResponse.redirect(url) }
  }
  return intlMiddleware(request)
}
export const config = { matcher: ['/((?!_next|favicon|.*\..*).*)'] }
