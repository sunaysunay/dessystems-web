import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = { title: 'DES Systems — Enterprise Solutions', description: 'DES Systems delivers enterprise ERP consulting, MES integrations and automation solutions.' }
export default function RootLayout({ children }: { children: React.ReactNode }) { return children }
