import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { localeAlternates } from "@/src/i18n/seo"

// contact/page.tsx is a client component; metadata lives here instead.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Meta" })
  return {
    title: t("contact_title"),
    description: t("contact_desc"),
    alternates: localeAlternates("/contact"),
  }
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
