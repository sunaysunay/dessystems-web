import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { localeAlternates } from "@/src/i18n/seo"
import CalculatorClient from "./calculator-client"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "bop_calculator" })
  return { title: t("meta.title"), description: t("meta.desc"), alternates: localeAlternates("/platform/calculator") }
}

export default async function CalculatorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <CalculatorClient locale={locale} />
}
