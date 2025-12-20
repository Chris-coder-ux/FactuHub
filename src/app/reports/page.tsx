'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReportStats, RevenueMonth } from '@/types';
import { fetcher } from '@/lib/fetcher';
import { Download, TrendingUp, AlertCircle, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { NoCompanyBanner } from '@/components/NoCompanyBanner';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportsPage() {
  const { data, error, isLoading } = useSWR<ReportStats>('/api/reports', fetcher);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isLoading) return <div className="p-6">Cargando reportes detallados...</div>;
  
  // Check if error is related to missing company
  const errorMessage = (error as any)?.message || (error as any)?.info?.error || '';
  const isCompanyError = errorMessage.includes('No company found') || errorMessage.includes('create a company');
  
  if (error && isCompanyError) {
    return (
      <div className="p-6">
        <NoCompanyBanner error={errorMessage} />
      </div>
    );
  }
  
  if (error || !data) return <div className="p-6 text-red-600">Error al cargar reportes</div>;

  const revenueChartData = data.revenueData.map((item: RevenueMonth) => ({
    month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
    revenue: item.total,
  }));

  const statusPieData = data.statusDistribution.map((item) => ({
    name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
    value: item.count
  }));

  const exportToCSV = () => {
    try {
      const headers = ['Año', 'Mes', 'Ingresos'];
      const rows = data.revenueData.map(item => [
        item._id.year,
        item._id.month,
        item.total
      ]);

      let csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `reporte_ingresos_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Reporte exportado correctamente');
    } catch (err) {
      console.error(err);
      toast.error('Error al exportar el reporte');
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reportes y Análisis</h2>
          <p className="text-muted-foreground">Visión general del estado financiero de tu negocio.</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50/50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales (Cobrados)</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">${data.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Acumulado histórico</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendiente de Cobro</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">${data.pendingRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{data.pendingInvoices} facturas emitidas</p>
          </CardContent>
        </Card>

        <Card className="bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deuda Vencida</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">${data.overdueRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{data.overdueInvoices} facturas retrasadas</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{data.clientCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Base de datos de clientes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Evolución de Ingresos</CardTitle>
            <CardDescription>Cobros mensuales confirmados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full" style={{ minHeight: '350px', minWidth: 0 }}>
              {mounted && revenueChartData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  <LineChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value: any) => [`$${value}`, 'Ingresos']}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por Estado</CardTitle>
            <CardDescription>Estado actual de todas las facturas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full" style={{ minHeight: '350px', minWidth: 0 }}>
              {mounted && statusPieData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Mes (Comparativa)</CardTitle>
            <CardDescription>Visualización en barras para detectar estacionalidad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full" style={{ minHeight: '350px', minWidth: 0 }}>
              {mounted && revenueChartData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  <BarChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}