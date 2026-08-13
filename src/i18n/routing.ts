import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'
export const routing = defineRouting({ locales: ['en','nl','de','fr','tr','ro','bg','el','es','it'], defaultLocale: 'en' })
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing)
