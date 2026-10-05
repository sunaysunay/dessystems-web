import "./globals.css";
import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono, Archivo } from "next/font/google";
import { ScopeProvider } from "@/lib/scope-context";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap", variable: "--font-ibm-plex-mono" });
const archivo = Archivo({ subsets: ["latin"], weight: ["900"], style: ["italic"], display: "swap", variable: "--font-archivo" });

export const metadata: Metadata = {
  title: "DES Systems — BOP Console",
  description: "DESPANEL-V2 — DES Business Operating Platform",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.className} ${ibmPlexMono.variable} ${archivo.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/fi-192.png" />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ScopeProvider>{children}</ScopeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
