import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/src/i18n/routing'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { CookieConsent } from '@/components/cookie-consent'
import '../globals.css'
export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  const messages = await getMessages()
  return (
    <html lang={locale}>
      <head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" /><link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet" /></head>
      <body style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--text)' }}>
        <NextIntlClientProvider messages={messages}><Nav /><main>{children}</main><Footer /><CookieConsent /></NextIntlClientProvider>
      </body>
    </html>
  )
}
