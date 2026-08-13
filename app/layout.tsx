import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ScopeProvider } from "@/lib/scope-context";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "DES Systems — BOP Console",
  description: "DESPANEL-V2 — DES Business Operating Platform",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.className}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ScopeProvider>{children}</ScopeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
