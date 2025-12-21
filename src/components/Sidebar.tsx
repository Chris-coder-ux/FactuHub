'use client';

import { useState, useEffect } from 'react';
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
  Calculator,
  Calendar,
  UserCog,
  FileSearch,
  FileStack,
  TrendingUp,
  Shield,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  DollarSign,
  LineChart,
  Building2,
  Code,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  defaultOpen?: boolean;
}

const navGroups: NavGroup[] = [
  {
    id: 'main',
    label: 'Principal',
    icon: LayoutDashboard,
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
    defaultOpen: true,
  },
  {
    id: 'sales',
    label: 'Ventas y Facturación',
    icon: ShoppingCart,
    items: [
      { href: '/clients', label: 'Clientes', icon: Users },
      { href: '/invoices', label: 'Facturas', icon: FileText },
      { href: '/products', label: 'Productos', icon: Package },
    ],
    defaultOpen: true,
  },
  {
    id: 'finance',
    label: 'Gastos y Finanzas',
    icon: DollarSign,
    items: [
      { href: '/expenses', label: 'Gastos', icon: Wallet },
      { href: '/receipts', label: 'Recibos', icon: Receipt },
      { href: '/banking/transactions', label: 'Transacciones', icon: CreditCard },
      { href: '/banking/reconciliation', label: 'Conciliación', icon: Calculator },
    ],
    defaultOpen: true,
  },
  {
    id: 'analytics',
    label: 'Análisis y Reportes',
    icon: LineChart,
    items: [
      { href: '/fiscal', label: 'Previsión Fiscal', icon: Calendar },
      { href: '/reports', label: 'Reportes', icon: BarChart3 },
      { href: '/analytics', label: 'Analytics', icon: TrendingUp },
    ],
    defaultOpen: false,
  },
  {
    id: 'admin',
    label: 'Administración',
    icon: Building2,
    items: [
      { href: '/teams', label: 'Equipos', icon: UserCog },
      { href: '/templates', label: 'Plantillas', icon: FileStack },
      { href: '/audit-logs', label: 'Logs de Auditoría', icon: FileSearch },
    ],
    defaultOpen: false,
  },
  {
    id: 'security',
    label: 'Seguridad y Soporte',
    icon: Shield,
    items: [
      { href: '/security', label: 'Seguridad', icon: Shield },
      { href: '/support', label: 'Soporte', icon: HelpCircle },
    ],
    defaultOpen: false,
  },
  {
    id: 'config',
    label: 'Configuración',
    icon: Settings,
    items: [
      { href: '/api-docs', label: 'API Docs', icon: Code },
      { href: '/settings', label: 'Configuración', icon: Settings },
    ],
    defaultOpen: false,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(navGroups.filter(g => g.defaultOpen).map(g => g.id))
  );

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Auto-expand group if current path matches any item in it
  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => {
      if (item.href === '/') {
        return pathname === '/';
      }
      return pathname.startsWith(item.href);
    });
  };

  // Auto-expand active groups when pathname changes
  useEffect(() => {
    if (isCollapsed) return;
    
    setOpenGroups(prev => {
      const next = new Set(prev);
      navGroups.forEach(group => {
        const isActive = group.items.some(item => {
          if (item.href === '/') {
            return pathname === '/';
          }
          return pathname.startsWith(item.href);
        });
        if (isActive && !next.has(group.id)) {
          next.add(group.id);
        }
      });
      return next;
    });
  }, [pathname, isCollapsed]);

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
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navGroups.map((group) => {
          const GroupIcon = group.icon;
          const isGroupOpen = openGroups.has(group.id);
          const isActiveGroup = isGroupActive(group);

          return (
            <div key={group.id} className="space-y-1">
              {/* Group Header */}
              {!isCollapsed && (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/30",
                    isActiveGroup && "text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon size={14} />
                    <span>{group.label}</span>
                  </div>
                  {isGroupOpen ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </button>
              )}

              {/* Group Items */}
              <AnimatePresence>
                {((isCollapsed && isActiveGroup) || isGroupOpen || isCollapsed) && (
                  <motion.div
                    initial={isCollapsed ? undefined : { height: 0, opacity: 0 }}
                    animate={isCollapsed ? {} : { height: 'auto', opacity: 1 }}
                    exit={isCollapsed ? undefined : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn("space-y-1", isCollapsed && "space-y-1")}
                  >
                    {group.items.map((item) => {
                      const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                      const Icon = item.icon;

                      return (
                        <div key={item.href} className="relative group">
                          <Link
                            href={item.href}
                            onMouseEnter={() => setHoveredItem(item.label)}
                            onMouseLeave={() => setHoveredItem(null)}
                            className={cn(
                              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 relative overflow-hidden",
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
                            
                            <Icon size={20} className={cn("relative z-10 shrink-0 transition-transform duration-300 group-hover:scale-110", isActive && "animate-pulse-subtle")} />
                            
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
               onClick={() => signOut({ callbackUrl: '/auth', redirect: true })}
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
              onClick={() => signOut({ callbackUrl: '/auth', redirect: true })}
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