'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Settings,
  Receipt,
  LogOut,
  Wallet,
  CreditCard,
  Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clientes', icon: Users },
  { href: '/invoices', label: 'Facturas', icon: FileText },
  { href: '/expenses', label: 'Gastos', icon: Wallet },
  { href: '/products', label: 'Productos', icon: Package },
  { href: '/receipts', label: 'Recibos', icon: Receipt },
  { href: '/banking/transactions', label: 'Transacciones', icon: CreditCard },
  { href: '/banking/reconciliation', label: 'Conciliación', icon: Calculator },
  { href: '/reports', label: 'Reportes', icon: BarChart3 },
  { href: '/settings', label: 'Configuración', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 80 : 260 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "relative z-50 hidden md:flex flex-col border-r bg-card/50 backdrop-blur-xl h-screen sticky top-0 border-border/50 shadow-sm",
        isCollapsed ? "items-center" : ""
      )}
    >
      {/* Logo Section */}
      <div className={cn("flex items-center h-20 px-6 border-b border-border/50", isCollapsed ? "justify-center px-0" : "justify-between")}>
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2"
            >
               <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/20">
                 <span className="text-white font-bold">F</span>
               </div>
               <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                 FacturaHub
               </span>
            </motion.div>
          )}
          {isCollapsed && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/20"
            >
              <span className="text-white font-bold text-lg">F</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toggle Button */}
      <div className="absolute -right-3 top-24">
         <Button 
          variant="secondary" 
          size="icon" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-6 w-6 rounded-full shadow-md border border-border hover:bg-primary hover:text-white transition-colors"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <div key={item.href} className="relative group">
              <Link
                href={item.href}
                onMouseEnter={() => setHoveredItem(item.label)}
                onMouseLeave={() => setHoveredItem(null)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-300 relative overflow-hidden",
                  isActive 
                    ? "text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  isCollapsed ? "justify-center" : ""
                )}
              >
                 {isActive && (
                  <motion.div
                    layoutId="active-nav-bg"
                    className="absolute inset-0 bg-gradient-to-r from-primary to-violet-600 z-0"
                    initial={{ borderRadius: 12 }}
                  />
                )}
                
                <Icon size={22} className={cn("relative z-10 shrink-0 transition-transform duration-300 group-hover:scale-110", isActive && "animate-pulse-subtle")} />
                
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="relative z-10 overflow-hidden whitespace-nowrap ml-1"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              {/* Tooltip for collapsed state */}
              <AnimatePresence>
                {isCollapsed && hoveredItem === item.label && (
                  <motion.div
                    initial={{ opacity: 0, x: 10, scale: 0.95 }}
                    animate={{ opacity: 1, x: 20, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.95 }}
                    className="absolute left-full top-1/2 -translate-y-1/2 z-50 px-3 py-1.5 bg-popover text-popover-foreground text-xs font-semibold rounded-md shadow-xl border border-border whitespace-nowrap"
                  >
                    {item.label}
                    {/* Arrow */}
                    <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-popover rotate-45 border-l border-b border-border" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>
      
      {/* Bottom Section (User/Logout) */}
      <div className="p-4 mt-auto border-t border-border/50">
        <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center" : "")}>
           <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
              {session?.user?.image ? (
                <Image src={session.user.image} alt="Avatar" width={36} height={36} className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-bold">
                  {session?.user?.name?.charAt(0) || 'U'}
                </div>
              )}
           </div>
           {!isCollapsed && (
             <div className="flex-1 text-xs">
                <p className="font-semibold text-foreground truncate">{session?.user?.name || 'Usuario'}</p>
                 <p className="text-muted-foreground truncate max-w-[120px]">{session?.user?.email || 'usuario@facturahub.com'}</p>
             </div>
           )}
           {!isCollapsed && (
             <Button
               variant="ghost"
               size="icon"
               onClick={() => signOut()}
               className="h-8 w-8 text-muted-foreground hover:text-destructive"
               title="Cerrar sesión"
             >
               <LogOut size={16} />
             </Button>
           )}
        </div>
        {isCollapsed && (
          <div className="mt-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
              className="h-8 w-8 mx-auto text-muted-foreground hover:text-destructive"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </Button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}