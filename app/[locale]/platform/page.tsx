import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import PlatformClient from "./platform-client"

type Props = {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "bop_platform" })
  return {
    title: t("page_title"),
    description: t("page_desc")
  }
}

export default function PlatformPage() {
  return <PlatformClient />
}
