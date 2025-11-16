import type { Metadata } from 'next'
import { Instrument_Serif } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SidebarWrapper } from "@/components/sidebar-wrapper"
import { CloudscapeThemeProvider } from "@/components/cloudscape-theme-provider"
import '@cloudscape-design/global-styles/index.css'
import './globals.css'

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: "400"
})

export const metadata: Metadata = {
  title: 'Procure - Procurement Dashboard Generator',
  description: 'Generate dynamic dashboards based on your procurement data.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${instrumentSerif.variable}`}>
        <CloudscapeThemeProvider />
        <TooltipProvider>
          <SidebarWrapper>
            {children}
            <Toaster />
            <SonnerToaster position="bottom-left" richColors duration={3000} />
          </SidebarWrapper>
        </TooltipProvider>
        <Analytics />
      </body>
    </html>
  )
}
