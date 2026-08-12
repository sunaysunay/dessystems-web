import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dessystems.io'),
  title: 'DES Systems — Enterprise Solutions',
  description: 'DES Systems delivers enterprise ERP consulting, MES integrations and automation solutions.',
}
export default function RootLayout({ children }: { children: React.ReactNode }) { return children }
