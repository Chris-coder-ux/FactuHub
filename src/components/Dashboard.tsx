'use client';

import React, { useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  DollarSign, 
  Users, 
  FileText, 
  Plus, 
  ArrowUpRight, 
  RefreshCcw,
  Bell
} from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Invoice } from '../types/invoice';
import { PaginatedResponse } from '@/lib/pagination';
import { NoCompanyBanner } from '@/components/NoCompanyBanner';
import { useTheme } from 'next-themes';

// Helper to determine badge color
const getBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" | null => {
  if (status === 'paid') return 'default';
  if (status === 'sent') return 'secondary';
  return 'destructive';
};

const chartData = [
  { name: 'Ene', total: 4000 },
  { name: 'Feb', total: 3000 },
  { name: 'Mar', total: 2000 },
  { name: 'Abr', total: 2780 },
  { name: 'May', total: 1890 },
  { name: 'Jun', total: 2390 },
  { name: 'Jul', total: 3490 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 }
};

interface ReportsData {
  totalRevenue: number;
  clientCount: number;
  pendingInvoices: number;
  monthlyRevenue: number;
}

export default function Dashboard() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const { theme } = useTheme();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const { data: reportsData, error: reportsError, isLoading: reportsLoading, mutate } = useSWR<ReportsData>('/api/reports', fetcher);
  const { data: invoicesData, error: invoicesError, isLoading: invoicesLoading } = useSWR<PaginatedResponse<Invoice>>('/api/invoices', fetcher);
  const { data: expensesData } = useSWR<{ data: any[]; pagination?: any }>('/api/expenses?limit=10&status=pending', fetcher);
  
  const pendingExpenses = expensesData?.data || [];
  const pendingExpensesCount = pendingExpenses.length;

  const stats = useMemo(() => [
    {
      title: 'Total Facturado',
      value: reportsData?.totalRevenue ? `$${reportsData.totalRevenue}` : '$0',
      icon: DollarSign,
      bg: 'bg-emerald-500/10',
      color: 'text-emerald-500'
    },
    {
      title: 'Clientes Activos',
      value: reportsData?.clientCount || '0',
      icon: Users,
      bg: 'bg-blue-500/10',
      color: 'text-blue-500'
    },
    {
      title: 'Facturas Pendientes',
      value: reportsData?.pendingInvoices || '0',
      icon: FileText,
      bg: 'bg-amber-500/10',
      color: 'text-amber-500'
    },
    {
      title: 'Ingresos Mensuales',
      value: reportsData?.monthlyRevenue ? `$${reportsData.monthlyRevenue}` : '$0',
      icon: ArrowUpRight,
      bg: 'bg-purple-500/10',
      color: 'text-purple-500'
    },
  ], [reportsData]);

  const recentInvoices = invoicesData?.data || [];

  // Check for company-related errors
  const errorMessage = 
    (reportsError as any)?.message || 
    (reportsError as any)?.info?.error || 
    (invoicesError as any)?.message || 
    (invoicesError as any)?.info?.error || '';
  const hasCompanyError = 
    errorMessage.includes('No company found') || 
    errorMessage.includes('create a company');

  if (authStatus === 'unauthenticated') {
    router.push('/auth');
    return null;
  }

  return (
    <div className="space-y-8 p-1">
      {hasCompanyError && (
        <NoCompanyBanner error={errorMessage} />
      )}
      
      {/* Pending Expenses Alert */}
      {pendingExpensesCount > 0 && (
        <div className={cn(
          "rounded-lg p-4 shadow-sm border",
          theme === 'dark' 
            ? "bg-green-900/20 border-green-800" 
            : "bg-blue-50 border-blue-200"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className={cn(
                "h-5 w-5",
                theme === 'dark' ? "text-green-400" : "text-blue-600"
              )} />
              <div>
                <h3 className={cn(
                  "font-semibold",
                  theme === 'dark' ? "text-green-100" : "text-blue-900"
                )}>
                  {pendingExpensesCount} {pendingExpensesCount === 1 ? 'gasto pendiente' : 'gastos pendientes'} de aprobación
                </h3>
                <p className={cn(
                  "text-sm",
                  theme === 'dark' ? "text-green-300" : "text-blue-700"
                )}>
                  Revisa y aprueba los gastos pendientes
                </p>
              </div>
            </div>
            <Link href="/expenses?status=pending">
              <Button variant="outline" size="sm">
                Ver Gastos
              </Button>
            </Link>
          </div>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Bienvenido de nuevo. Aquí tienes un resumen de tu negocio.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => mutate()} disabled={reportsLoading}>
            <RefreshCcw className={cn("mr-2 h-4 w-4", reportsLoading && "animate-spin")} />
            Actualizar
          </Button>
          <Button asChild>
            <Link href="/invoices/new">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Factura
            </Link>
          </Button>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        {reportsLoading ? (
          ['sk-1', 'sk-2', 'sk-3', 'sk-4'].map((id) => (
            <Card key={id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          stats.map((stat) => (
            <motion.div key={stat.title} variants={itemVariants}>
              <Card className="hover:shadow-lg hover:border-primary/20 transition-all duration-200 border border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-foreground/70">{stat.title}</CardTitle>
                  <div className={cn("p-2.5 rounded-lg bg-muted", stat.bg)}>
                    <stat.icon className={cn("h-4 w-4", stat.color)} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
                  <p className="text-xs text-muted-foreground flex items-center">
                    <ArrowUpRight className="h-3 w-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                    +12% desde el mes pasado
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="lg:col-span-4 border border-border overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Resumen de Ingresos</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px] w-full" style={{ minHeight: '350px', width: '100%' }}>
              {mounted && (
                <ResponsiveContainer width="99%" height={350} debounce={50}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#94A3B8" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ dy: 10 }}
                    />
                    <YAxis 
                      stroke="#94A3B8" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#6366f1" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorTotal)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border border-border overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Facturas Recientes</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {(() => {
              if (invoicesLoading) {
                return ['sk-tr-1', 'sk-tr-2', 'sk-tr-3'].map((id) => (
                  <div key={id} className="flex items-center justify-between p-3 border-b border-border/50">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ));
              }

              if (recentInvoices.length === 0) {
                return (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground italic">
                    No hay facturas recientes
                  </div>
                );
              }

              return recentInvoices.slice(0, 5).map((invoice: Invoice) => {
                const badgeVariant = getBadgeVariant(invoice.status);
                return (
                  <div key={invoice._id} className="flex items-center justify-between p-3 border-b border-border hover:bg-muted/50 transition-colors">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{invoice.client?.name || 'Cliente eliminado'}</p>
                      <p className="text-xs text-muted-foreground">{invoice.invoiceNumber || 'Borrador'}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className="text-sm font-bold text-primary">${invoice.total.toLocaleString()}</p>
                      <Badge variant={badgeVariant} className="text-[9px] h-4 px-1.5 uppercase">
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                );
              });
            })()}
            <Button variant="ghost" className="w-full mt-6 text-xs text-blue-600" asChild>
              <Link href="/invoices">Ver todas las facturas</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}