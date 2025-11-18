import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'StrikeIQ - Options Trading Signals',
  description: 'AI-powered options trading signals with confidence scoring and risk management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-background text-white min-h-screen">
        {children}
      </body>
    </html>
  )
}
