import type { Metadata } from "next"
import CalculatorClient from "./calculator-client"

export const metadata: Metadata = {
  title: "Savings & Profit Calculator — DES BOP V2",
  description: "Model what the DES Business Operating Platform is worth to your dealership — hard cash saved, hours reclaimed, and net profit uplift.",
}

export default async function CalculatorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <CalculatorClient locale={locale} />
}
