import en from "@/messages/en.json";
import nl from "@/messages/nl.json";
import de from "@/messages/de.json";
import fr from "@/messages/fr.json";
import tr from "@/messages/tr.json";

export type PortalLocale = "en" | "nl" | "de" | "fr" | "tr";

const MESSAGES: Record<PortalLocale, Record<string, string>> = {
  en: (en as any).portal,
  nl: (nl as any).portal,
  de: (de as any).portal,
  fr: (fr as any).portal,
  tr: (tr as any).portal,
};

export function toPortalLocale(raw: string | null | undefined): PortalLocale {
  const l = (raw || "en").slice(0, 2) as PortalLocale;
  return (["en", "nl", "de", "fr", "tr"] as const).includes(l) ? l : "en";
}

export function portalT(locale: string | null | undefined) {
  const l = toPortalLocale(locale);
  const dict = MESSAGES[l];
  return (key: string) => dict[key] ?? MESSAGES.en[key] ?? key;
}
