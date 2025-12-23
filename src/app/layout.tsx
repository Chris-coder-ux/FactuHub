import './globals.css';
import MainLayout from '@/components/MainLayout';
import { ThemeProvider } from 'next-themes';
import { CSPNonceProvider } from '@/components/CSPNonceProvider';
import { headers } from 'next/headers';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata = {
  title: 'FacturaHub - Sistema de Facturación',
  description: 'Sistema completo de facturación, gestión de clientes y análisis financiero',
  manifest: '/manifest.json',
  themeColor: '#0f172a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FacturaHub',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get CSP nonce from headers (set by middleware)
  const headersList = await headers();
  const nonce = headersList.get('x-csp-nonce') || '';

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Pass nonce to client components via meta tag */}
        <meta name="csp-nonce" content={nonce} />
        {/* PWA Meta Tags */}
        <meta name="application-name" content="FacturaHub" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FacturaHub" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="min-h-screen bg-background text-foreground" suppressHydrationWarning>
        <CSPNonceProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <MainLayout>
              {children}
            </MainLayout>
          </ThemeProvider>
        </CSPNonceProvider>
      </body>
    </html>
  );
}