'use client';

import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AuthProvider from './AuthProvider';
import { usePathname } from 'next/navigation';
import ErrorBoundary from './ErrorBoundary';
import { Toaster } from "@/components/ui/sonner";
import { RealtimeNotifications } from './RealtimeNotifications';
import { ServiceWorkerRegistration } from './ServiceWorkerRegistration';
import { PWAInstallPrompt } from './PWAInstallPrompt';

export default function MainLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/auth');

  if (isAuthPage) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  return (
    <AuthProvider>
      <ErrorBoundary>
        <ServiceWorkerRegistration />
        <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen relative overflow-x-hidden">
            <Navbar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 bg-muted/30">
              {children}
            </main>
          </div>
        </div>
        <Toaster />
        <RealtimeNotifications />
        <PWAInstallPrompt />
      </ErrorBoundary>
    </AuthProvider>
  );
}
