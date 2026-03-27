import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import AIAssistantProvider from "@/components/ai/ai-assistant-provider"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Memosphere - Intelligent Dashboard Platform",
  description: "Advanced AI-powered dashboard and collaboration platform with local AI capabilities",
  generator: "memosphere.app",
  icons: {
    icon: "/MEMOSPHERE.png",
    shortcut: "/MEMOSPHERE.png",
    apple: "/MEMOSPHERE.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AIAssistantProvider>
            {children}
          </AIAssistantProvider>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
