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
  title: 'Aplicación de Facturación',
  description: 'Sistema completo de facturación web',
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