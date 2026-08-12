import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { localeAlternates } from "@/src/i18n/seo"
import PlatformClient from "./platform-client"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "bop_platform" })
  return { title: t("meta.title"), description: t("meta.desc"), alternates: localeAlternates("/platform") }
}

export default async function PlatformPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <PlatformClient locale={locale} />
}
