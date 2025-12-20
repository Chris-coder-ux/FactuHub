'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { fetcher } from '@/lib/fetcher';
import { Download, BarChart3 } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const categoryLabels: Record<string, string> = {
  travel: 'Viajes',
  meals: 'Comidas',
  office: 'Oficina',
  supplies: 'Suministros',
  utilities: 'Servicios',
  marketing: 'Marketing',
  software: 'Software',
  professional_services: 'Servicios Profesionales',
  other: 'Otros',
};

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

interface ExpenseReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseReportsDialog({ open, onOpenChange }: ExpenseReportsDialogProps) {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string>('all');

  const queryParams = new URLSearchParams({
    startDate,
    endDate,
    ...(category !== 'all' && { category })
  });

  const { data, isLoading } = useSWR<{
    expenses: any[];
    summary: {
      totals: { total: number; taxTotal: number; count: number };
      byCategory: Array<{ _id: string; total: number; count: number; taxTotal: number }>;
      byStatus: Array<{ _id: string; total: number; count: number }>;
      byMonth: Array<{ _id: { year: number; month: number }; total: number; count: number; taxTotal: number }>;
    };
  }>(
    open ? `/api/expenses/reports?${queryParams}` : null,
    fetcher
  );

  const handleExport = (format: 'pdf' | 'csv') => {
    const params = new URLSearchParams({
      format,
      startDate,
      endDate,
      ...(category !== 'all' && { category })
    });
    window.open(`/api/expenses/export?${params}`, '_blank');
  };

  const categoryChartData = data?.summary?.byCategory?.map((item: any) => ({
    name: categoryLabels[item._id] || item._id,
    value: item.total,
    count: item.count
  })) || [];

  const statusChartData = data?.summary?.byStatus?.map((item: any) => ({
    name: item._id === 'pending' ? 'Pendiente' : item._id === 'approved' ? 'Aprobado' : 'Rechazado',
    value: item.total,
    count: item.count
  })) || [];

  const monthlyChartData = data?.summary?.byMonth?.map((item: any) => ({
    month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
    total: item.total,
    count: item.count
  })) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reportes de Gastos</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => handleExport('pdf')} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button onClick={() => handleExport('csv')} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          {data?.summary?.totals && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(data.summary.totals.total + data.summary.totals.taxTotal).toFixed(2)} €
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.summary.totals.count} gastos
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Importe Base</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data.summary.totals.total.toFixed(2)} €
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total IVA</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data.summary.totals.taxTotal.toFixed(2)} €
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          {isLoading ? (
            <div className="text-center py-8">Cargando reportes...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* By Category */}
              {categoryChartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Por Categoría</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={categoryChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip formatter={(value: any) => `${Number(value).toFixed(2)} €`} />
                        <Bar dataKey="value" fill="#2563eb" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* By Status */}
              {statusChartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Por Estado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => `${Number(value).toFixed(2)} €`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* By Month */}
              {monthlyChartData.length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Evolución Mensual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={monthlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value: any) => `${Number(value).toFixed(2)} €`} />
                        <Bar dataKey="total" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

