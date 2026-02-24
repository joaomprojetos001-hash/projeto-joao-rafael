import { ThemeProvider } from '@/components/providers/ThemeProvider'
import type { Metadata } from 'next'
import "./globals.css"
import "./styles/animations.css"
import { Inter } from 'next/font/google'
import { CompanyProvider } from '@/context/CompanyContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dashboard de Leads',
  description: 'Sistema de gestão de leads',
  icons: {
    icon: '/logo-winged-lion.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <ThemeProvider>
          <CompanyProvider>
            {children}
          </CompanyProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
