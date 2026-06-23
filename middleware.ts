import createMiddleware from 'next-intl/middleware'
import { routing } from './src/i18n/routing'
import { NextRequest, NextResponse } from 'next/server'
const countryToLocale: Record<string,string> = { NL:'nl',BE:'nl',DE:'de',AT:'de',CH:'de',FR:'fr',LU:'fr',TR:'tr',CY:'tr' }
const intlMiddleware = createMiddleware(routing)
const STATIC_EXT = /\.(?:jpg|jpeg|png|gif|webp|svg|ico|css|js|woff2?|ttf|otf|mp4|pdf|txt|xml|json)$/i

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    STATIC_EXT.test(pathname)
  ) {
    return NextResponse.next()
  }
  const hasLocale = routing.locales.some(l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`)
  if (!hasLocale) {
    const country = (request.headers.get('cf-ipcountry') ?? '').toUpperCase()
    const locale = countryToLocale[country] ?? routing.defaultLocale
    const url = request.nextUrl.clone()
    url.pathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`
    return NextResponse.redirect(url, 307)
  }
  return intlMiddleware(request)
}
export const config = { matcher: ['/((?!_next).*)'] }
