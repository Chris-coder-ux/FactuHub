'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Euro } from 'lucide-react';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

interface TrendData {
  iva: Array<{
    year: number;
    quarter: number;
    period: string;
    projected: number;
    actual: number;
    variance: number;
    variancePercent: number;
  }>;
  irpf: Array<{
    year: number;
    projected: number;
    actual: number;
    variance: number;
    variancePercent: number;
  }>;
  yearOverYear: Record<string, { iva: number; irpf: number }>;
  trends: {
    iva: {
      direction: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';
      quarterlyAverages: Array<{ year: number; average: number; total: number }>;
    };
    irpf: {
      direction: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';
      annualData: any[];
    };
  };
  years: number[];
}

interface FiscalTrendsChartProps {
  selectedYear: number;
}

export function FiscalTrendsChart({ selectedYear }: FiscalTrendsChartProps) {
  const [chartType, setChartType] = useState<'iva' | 'irpf' | 'comparison'>('iva');
  const [viewMode, setViewMode] = useState<'quarterly' | 'annual' | 'trend'>('quarterly');
  
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear];
  
  const { data, error, isLoading } = useSWR<TrendData>(
    `/api/fiscal/trends?years=${years.join(',')}`,
    fetcher
  );

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Cargando datos de tendencias...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-red-600">
          Error al cargar datos de tendencias
        </CardContent>
      </Card>
    );
  }

  // Prepare IVA quarterly data
  const ivaQuarterlyData = data.iva.map(d => ({
    period: d.period,
    year: d.year,
    quarter: `Q${d.quarter}`,
    Proyectado: d.projected,
    Real: d.actual,
    Diferencia: d.variance,
  }));

  // Prepare IVA annual totals
  const ivaAnnualData = data.years.map(year => {
    const yearData = data.iva.filter(d => d.year === year);
    return {
      year: year.toString(),
      Proyectado: yearData.reduce((sum, d) => sum + d.projected, 0),
      Real: yearData.reduce((sum, d) => sum + d.actual, 0),
    };
  });

  // Prepare IRPF data
  const irpfData = data.irpf.map(d => ({
    year: d.year.toString(),
    Proyectado: d.projected,
    Real: d.actual,
    Diferencia: d.variance,
  }));

  // Year-over-year comparison data
  const yoyData = Object.entries(data.yearOverYear).map(([period, growth]) => {
    const [fromYear, toYear] = period.split('-');
    return {
      period: `${fromYear} → ${toYear}`,
      'IVA': parseFloat(growth.iva.toFixed(2)),
      'IRPF': parseFloat(growth.irpf.toFixed(2)),
    };
  });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5" />
            Análisis de Tendencias Fiscales
          </CardTitle>
          <CardDescription>
            Gráficos avanzados y comparación año sobre año
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label id="trends-chart-type-label" className="text-sm font-medium mb-2 block">Tipo de Análisis</Label>
              <Select value={chartType} onValueChange={(v: any) => setChartType(v)}>
                <SelectTrigger aria-labelledby="trends-chart-type-label" id="trends-chart-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iva">IVA</SelectItem>
                  <SelectItem value="irpf">IRPF</SelectItem>
                  <SelectItem value="comparison">Comparación Año sobre Año</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {chartType !== 'comparison' && (
              <div className="flex-1 min-w-[200px]">
                <Label id="trends-view-mode-label" className="text-sm font-medium mb-2 block">Vista</Label>
                <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                  <SelectTrigger aria-labelledby="trends-view-mode-label" id="trends-view-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                    <SelectItem value="trend">Tendencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trend Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tendencia IVA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getTrendIcon(data.trends.iva.direction)}
              <span className="text-lg font-semibold">
                {data.trends.iva.direction === 'increasing' ? 'En aumento' :
                 data.trends.iva.direction === 'decreasing' ? 'En disminución' :
                 data.trends.iva.direction === 'stable' ? 'Estable' : 'Datos insuficientes'}
              </span>
            </div>
            {data.trends.iva.quarterlyAverages.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Promedio trimestral: {formatCurrency(
                  data.trends.iva.quarterlyAverages[data.trends.iva.quarterlyAverages.length - 1].average
                )}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tendencia IRPF</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getTrendIcon(data.trends.irpf.direction)}
              <span className="text-lg font-semibold">
                {data.trends.irpf.direction === 'increasing' ? 'En aumento' :
                 data.trends.irpf.direction === 'decreasing' ? 'En disminución' :
                 data.trends.irpf.direction === 'stable' ? 'Estable' : 'Datos insuficientes'}
              </span>
            </div>
            {data.trends.irpf.annualData.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Último año: {formatCurrency(
                  data.trends.irpf.annualData[data.trends.irpf.annualData.length - 1].actual
                )}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {chartType === 'iva' && viewMode === 'quarterly' && (
        <Card>
          <CardHeader>
            <CardTitle>IVA Trimestral - Comparación Proyectado vs Real</CardTitle>
            <CardDescription>Últimos 3 años</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={ivaQuarterlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="Proyectado" fill="#3b82f6" opacity={0.7} />
                <Bar dataKey="Real" fill="#10b981" opacity={0.7} />
                <Line type="monotone" dataKey="Diferencia" stroke="#ef4444" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {chartType === 'iva' && viewMode === 'annual' && (
        <Card>
          <CardHeader>
            <CardTitle>IVA Anual - Comparación por Año</CardTitle>
            <CardDescription>Totales anuales proyectados vs reales</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={ivaAnnualData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="Proyectado" fill="#3b82f6" />
                <Bar dataKey="Real" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {chartType === 'iva' && viewMode === 'trend' && (
        <Card>
          <CardHeader>
            <CardTitle>IVA - Tendencias Trimestrales</CardTitle>
            <CardDescription>Evolución temporal</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={ivaQuarterlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend />
                <Area type="monotone" dataKey="Proyectado" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                <Area type="monotone" dataKey="Real" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {chartType === 'irpf' && (
        <Card>
          <CardHeader>
            <CardTitle>IRPF Anual - Comparación Proyectado vs Real</CardTitle>
            <CardDescription>Últimos 3 años</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={irpfData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="Proyectado" fill="#3b82f6" opacity={0.7} />
                <Bar dataKey="Real" fill="#10b981" opacity={0.7} />
                <Line type="monotone" dataKey="Diferencia" stroke="#ef4444" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {chartType === 'comparison' && (
        <Card>
          <CardHeader>
            <CardTitle>Comparación Año sobre Año</CardTitle>
            <CardDescription>Crecimiento porcentual entre años consecutivos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={yoyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis label={{ value: 'Crecimiento (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: any) => `${parseFloat(value).toFixed(2)}%`} />
                <Legend />
                <Bar dataKey="IVA" fill="#3b82f6" />
                <Bar dataKey="IRPF" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Nota:</strong> Los valores positivos indican crecimiento, los negativos indican disminución.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

