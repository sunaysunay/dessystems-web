import type { Metadata } from "next"
import PlatformClient from "./platform-client"

export const metadata: Metadata = {
  title: "Business Operating Platform — DES Systems",
  description: "DES BOP V2 — the operating system vehicle dealers run their day on. Inventory, marketplace, CRM, sales, finance and AI in one console.",
}

export default async function PlatformPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <PlatformClient locale={locale} />
}
