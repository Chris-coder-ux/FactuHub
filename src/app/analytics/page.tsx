'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetcher } from '@/lib/fetcher';
import { Download, TrendingUp, TrendingDown, DollarSign, Users, Package, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { NoCompanyBanner } from '@/components/NoCompanyBanner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import MaterializedViewsSettings from '@/components/analytics/MaterializedViewsSettings';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface AnalyticsData {
  clientProfitability: Array<{
    clientId: string;
    clientName: string;
    clientEmail: string;
    totalRevenue: number;
    totalCost: number;
    profit: number;
    margin: number;
    invoiceCount: number;
    averageInvoiceValue: number;
  }>;
  productProfitability: Array<{
    productId: string;
    productName: string;
    totalRevenue: number;
    totalQuantity: number;
    averagePrice: number;
    invoiceCount: number;
    estimatedCost: number;
    estimatedProfit: number;
    margin: number;
  }>;
  cashFlow: Array<{
    date: string;
    in: number;
    out: number;
    net: number;
  }>;
  trends: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
    invoiceCount: number;
    expenseCount: number;
  }>;
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    totalProfit: number;
    averageMargin: number;
    clientCount: number;
    productCount: number;
  };
}

export default function AnalyticsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dateParams = new URLSearchParams();
  if (startDate) dateParams.set('startDate', startDate);
  if (endDate) dateParams.set('endDate', endDate);

  const { data, error, isLoading, mutate } = useSWR<AnalyticsData>(
    `/api/analytics?${dateParams.toString()}`,
    fetcher
  );

  if (isLoading) return <div className="p-6">Cargando analytics avanzados...</div>;

  const errorMessage = (error as any)?.message || (error as any)?.info?.error || '';
  const isCompanyError = errorMessage.includes('No company found') || errorMessage.includes('create a company');

  if (error && isCompanyError) {
    return (
      <div className="p-6">
        <NoCompanyBanner error={errorMessage} />
      </div>
    );
  }

  if (error || !data) return <div className="p-6 text-red-600">Error al cargar analytics</div>;

  const exportToCSV = (section: string) => {
    try {
      let headers: string[] = [];
      let rows: any[] = [];

      switch (section) {
        case 'clients':
          headers = ['Cliente', 'Email', 'Ingresos', 'Costos', 'Beneficio', 'Margen %', 'Facturas', 'Promedio Factura'];
          rows = data.clientProfitability.map((c) => [
            c.clientName,
            c.clientEmail,
            c.totalRevenue.toFixed(2),
            c.totalCost.toFixed(2),
            c.profit.toFixed(2),
            c.margin.toFixed(2),
            c.invoiceCount,
            c.averageInvoiceValue.toFixed(2),
          ]);
          break;
        case 'products':
          headers = ['Producto', 'Ingresos', 'Cantidad', 'Precio Promedio', 'Beneficio Estimado', 'Margen %', 'Facturas'];
          rows = data.productProfitability.map((p) => [
            p.productName,
            p.totalRevenue.toFixed(2),
            p.totalQuantity,
            p.averagePrice.toFixed(2),
            p.estimatedProfit.toFixed(2),
            p.margin.toFixed(2),
            p.invoiceCount,
          ]);
          break;
        case 'cashflow':
          headers = ['Fecha', 'Entradas', 'Salidas', 'Flujo Neto'];
          rows = data.cashFlow.map((cf) => [
            cf.date,
            cf.in.toFixed(2),
            cf.out.toFixed(2),
            cf.net.toFixed(2),
          ]);
          break;
        case 'trends':
          headers = ['Mes', 'Ingresos', 'Gastos', 'Beneficio', 'Facturas', 'Gastos Count'];
          rows = data.trends.map((t) => [
            t.month,
            t.revenue.toFixed(2),
            t.expenses.toFixed(2),
            t.profit.toFixed(2),
            t.invoiceCount,
            t.expenseCount,
          ]);
          break;
      }

      const csvContent = 'data:text/csv;charset=utf-8,'
        + headers.join(',') + '\n'
        + rows.map((e) => e.join(',')).join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `analytics_${section}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Reporte ${section} exportado correctamente`);
    } catch (err) {
      toast.error('Error al exportar el reporte');
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Avanzados</h2>
          <p className="text-muted-foreground">Rentabilidad, cash flow y tendencias detalladas.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="start-date" className="text-sm">Desde:</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="end-date" className="text-sm">Hasta:</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button onClick={() => mutate()} variant="outline" size="sm">
            Actualizar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50/50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">${data.summary.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">${data.summary.totalExpenses.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className={`${data.summary.totalProfit >= 0 ? 'bg-green-50/50 border-green-100 dark:bg-green-950/20 dark:border-green-900/30' : 'bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beneficio Neto</CardTitle>
            {data.summary.totalProfit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.summary.totalProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              ${data.summary.totalProfit.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50/50 border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{data.summary.averageMargin.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Cash Flow</CardTitle>
            <CardDescription>Entradas vs Salidas diarias</CardDescription>
          </div>
          <Button onClick={() => exportToCSV('cashflow')} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          {mounted && data.cashFlow.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.cashFlow}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="in" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Entradas" />
                <Area type="monotone" dataKey="out" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Salidas" />
                <Line type="monotone" dataKey="net" stroke="#2563eb" strokeWidth={2} name="Flujo Neto" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-muted-foreground">No hay datos de cash flow</div>
          )}
        </CardContent>
      </Card>

      {/* Trends Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tendencias Mensuales</CardTitle>
            <CardDescription>Evolución de ingresos, gastos y beneficio</CardDescription>
          </div>
          <Button onClick={() => exportToCSV('trends')} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          {mounted && data.trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Ingresos" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Gastos" />
                <Line type="monotone" dataKey="profit" stroke="#2563eb" strokeWidth={2} name="Beneficio" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-muted-foreground">No hay datos de tendencias</div>
          )}
        </CardContent>
      </Card>

      {/* Client Profitability */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Rentabilidad por Cliente</CardTitle>
            <CardDescription>Top clientes por ingresos y margen</CardDescription>
          </div>
          <Button onClick={() => exportToCSV('clients')} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          {data.clientProfitability.length > 0 ? (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.clientProfitability.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="clientName" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={100} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalRevenue" fill="#2563eb" name="Ingresos" />
                  <Bar dataKey="profit" fill="#10b981" name="Beneficio" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Cliente</th>
                      <th className="text-right p-2">Ingresos</th>
                      <th className="text-right p-2">Beneficio</th>
                      <th className="text-right p-2">Margen %</th>
                      <th className="text-right p-2">Facturas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.clientProfitability.slice(0, 20).map((client) => (
                      <tr key={client.clientId} className="border-b hover:bg-muted/50">
                        <td className="p-2">{client.clientName}</td>
                        <td className="text-right p-2">${client.totalRevenue.toLocaleString()}</td>
                        <td className={`text-right p-2 ${client.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${client.profit.toLocaleString()}
                        </td>
                        <td className="text-right p-2">{client.margin.toFixed(1)}%</td>
                        <td className="text-right p-2">{client.invoiceCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="h-300 flex items-center justify-center text-muted-foreground">No hay datos de clientes</div>
          )}
        </CardContent>
      </Card>

      {/* Product Profitability */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Rentabilidad por Producto</CardTitle>
            <CardDescription>Top productos por ingresos y unidades vendidas</CardDescription>
          </div>
          <Button onClick={() => exportToCSV('products')} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          {data.productProfitability.length > 0 ? (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.productProfitability.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="productName" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={100} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalRevenue" fill="#8b5cf6" name="Ingresos" />
                  <Bar dataKey="totalQuantity" fill="#f59e0b" name="Cantidad" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Producto</th>
                      <th className="text-right p-2">Ingresos</th>
                      <th className="text-right p-2">Cantidad</th>
                      <th className="text-right p-2">Precio Prom.</th>
                      <th className="text-right p-2">Beneficio Est.</th>
                      <th className="text-right p-2">Facturas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.productProfitability.slice(0, 20).map((product) => (
                      <tr key={product.productId} className="border-b hover:bg-muted/50">
                        <td className="p-2">{product.productName}</td>
                        <td className="text-right p-2">${product.totalRevenue.toLocaleString()}</td>
                        <td className="text-right p-2">{product.totalQuantity}</td>
                        <td className="text-right p-2">${product.averagePrice.toFixed(2)}</td>
                        <td className="text-right p-2">${product.estimatedProfit.toLocaleString()}</td>
                        <td className="text-right p-2">{product.invoiceCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="h-300 flex items-center justify-center text-muted-foreground">No hay datos de productos</div>
          )}
        </CardContent>
      </Card>

      {/* Materialized Views Settings */}
      <MaterializedViewsSettings />
    </div>
  );
}

