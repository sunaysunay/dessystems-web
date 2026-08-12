import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { localeAlternates } from "@/src/i18n/seo"
import FounderClient from "./founder-client"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Founder" })
  return { title: t("meta.title"), description: t("meta.desc"), alternates: localeAlternates("/founder") }
}

export default function FounderPage() {
  return <FounderClient />
}
