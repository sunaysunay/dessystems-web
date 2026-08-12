import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

// Single source of truth for supported locales.
// nav.tsx (dropdown), proxy.ts (geo/language detection) and SEO helpers all import from here.
export const LOCALE_REGISTRY = [
  { code: 'en', name: 'English',    flag: null },
  { code: 'nl', name: 'Nederlands', flag: 'nl' },
  { code: 'de', name: 'Deutsch',    flag: 'de' },
  { code: 'fr', name: 'Français',   flag: 'fr' },
  { code: 'tr', name: 'Türkçe',     flag: 'tr' },
  { code: 'ro', name: 'Română',     flag: 'ro' },
  { code: 'bg', name: 'Български',  flag: 'bg' },
  { code: 'el', name: 'Ελληνικά',   flag: 'gr' },
  { code: 'pl', name: 'Polski',     flag: 'pl' },
  { code: 'es', name: 'Español',    flag: 'es' },
  { code: 'it', name: 'Italiano',   flag: 'it' },
] as const

export type Locale = (typeof LOCALE_REGISTRY)[number]['code']
export const locales = LOCALE_REGISTRY.map(l => l.code) as unknown as [Locale, ...Locale[]]

export const routing = defineRouting({ locales, defaultLocale: 'en' })
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing)
