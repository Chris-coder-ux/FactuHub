'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, LayoutDashboard, Users, FileText, Package, BarChart3, Settings, Receipt, CreditCard, Calculator, Calendar, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from './ThemeToggle';
import { CompanySwitcher } from './CompanySwitcher';
import { Breadcrumbs, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from '@/components/ui/breadcrumbs';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const paths = pathname.split('/').filter(Boolean);
  
  // Navigation items for mobile menu
  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/clients', label: 'Clientes', icon: Users },
    { href: '/invoices', label: 'Facturas', icon: FileText },
    { href: '/expenses', label: 'Gastos', icon: Receipt },
    { href: '/products', label: 'Productos', icon: Package },
    { href: '/banking/transactions', label: 'Transacciones', icon: CreditCard },
    { href: '/banking/reconciliation', label: 'Conciliación', icon: Calculator },
    { href: '/fiscal', label: 'Previsión Fiscal', icon: Calendar },
    { href: '/reports', label: 'Reportes', icon: BarChart3 },
    { href: '/teams', label: 'Equipos', icon: UserCog },
    { href: '/settings', label: 'Configuración', icon: Settings },
  ];

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <nav className="sticky top-0 z-40 bg-background border-b border-border w-full shadow-sm">
      <div className="flex justify-between items-center px-6 py-3">
        
        {/* Left Side: Mobile Toggle & Breadcrumbs */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="hidden md:block">
            <Breadcrumbs>
              <BreadcrumbItem>
                <BreadcrumbLink href="/" className="flex items-center gap-1">
                  <Home className="h-3 w-3" />
                  Inicio
                </BreadcrumbLink>
              </BreadcrumbItem>
              {paths.map((path, index) => {
                const href = `/${paths.slice(0, index + 1).join('/')}`;
                const isLast = index === paths.length - 1;
                
                return (
                  <div key={path} className="flex items-center">
                    <BreadcrumbSeparator />
                    <BreadcrumbItem active={isLast}>
                      {isLast ? (
                        <span>{capitalize(path)}</span>
                      ) : (
                        <BreadcrumbLink href={href}>
                          {capitalize(path)}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </div>
                );
              })}
            </Breadcrumbs>
          </div>
        </div>

        {/* Right Side: Company Switcher, Theme, User */}
        <div className="flex items-center gap-3">
          {session && <CompanySwitcher />}
          <ThemeToggle />
          
          {session ? (
            <div className="flex items-center gap-3 pl-3 border-l border-border/50">
              <span className="text-sm font-medium hidden sm:block">{session.user?.name}</span>
              <Avatar className="h-8 w-8 transition-transform hover:scale-105 ring-2 ring-transparent hover:ring-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {session.user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <Button onClick={() => signOut({ callbackUrl: '/auth', redirect: true })} variant="ghost" size="sm" className="hidden sm:flex">
                Salir
              </Button>
            </div>
          ) : (
            <Button onClick={() => signIn()} size="sm" className="bg-primary hover:bg-primary/90">
              Iniciar Sesión
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-background/95 z-50 md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", damping: 20 }}
              className="fixed inset-y-0 left-0 w-3/4 max-w-xs bg-card border-r border-border z-50 p-6 flex flex-col md:hidden shadow-lg"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="font-bold text-xl">Menú</span>
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                        pathname === item.href 
                          ? "bg-primary/10 text-primary" 
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              <div className="mt-auto pt-6 border-t">
                 {session ? (
                   <Button onClick={() => signOut({ callbackUrl: '/auth', redirect: true })} variant="outline" className="w-full justify-start gap-2">
                     <span className="ml-2">Cerrar Sesión</span>
                   </Button>
                 ) : (
                   <Button onClick={() => signIn()} className="w-full">
                     Iniciar Sesión
                   </Button>
                 )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}