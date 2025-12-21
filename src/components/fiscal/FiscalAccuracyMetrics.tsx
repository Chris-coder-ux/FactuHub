'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AccuracyMetrics {
  overall: {
    averageAccuracy: number;
    totalProjections: number;
    passedThreshold: number;
    passedRate: number;
  };
  iva: {
    averageAccuracy: number;
    quarterlyAccuracy: Array<{
      quarter: number;
      accuracy: number;
      projected: number;
      actual: number;
    }>;
  };
  irpf: {
    accuracy: number;
    projected: number;
    actual: number;
  };
  byYear: Record<number, {
    iva: number;
    irpf: number;
  }>;
}

export function FiscalAccuracyMetrics({ selectedYear }: { selectedYear: number }) {
  const { data, error, isLoading } = useSWR<{
    metrics: AccuracyMetrics;
    threshold: number;
    meetsThreshold: boolean;
  }>(
    `/api/fiscal/accuracy?year=${selectedYear}&threshold=85`,
    fetcher
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Calculando métricas de precisión...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-red-600">
          Error al cargar métricas de precisión
        </CardContent>
      </Card>
    );
  }

  const { metrics, threshold, meetsThreshold } = data;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= threshold) return '#10b981';
    if (accuracy >= threshold - 10) return '#f59e0b';
    return '#ef4444';
  };

  const quarterlyChartData = metrics.iva.quarterlyAccuracy.map(q => ({
    quarter: `Q${q.quarter}`,
    accuracy: parseFloat(q.accuracy.toFixed(1)),
    projected: q.projected,
    actual: q.actual,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Precisión de Proyecciones
          </CardTitle>
          <CardDescription>
            Métricas de precisión comparando proyecciones con datos reales
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Precisión Promedio</span>
                  {meetsThreshold ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div className="text-2xl font-bold" style={{ color: getAccuracyColor(metrics.overall.averageAccuracy) }}>
                  {metrics.overall.averageAccuracy.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Umbral: {threshold}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-2">IVA Promedio</div>
                <div className="text-2xl font-bold" style={{ color: getAccuracyColor(metrics.iva.averageAccuracy) }}>
                  {metrics.iva.averageAccuracy.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-2">IRPF</div>
                <div className="text-2xl font-bold" style={{ color: getAccuracyColor(metrics.irpf.accuracy) }}>
                  {metrics.irpf.accuracy.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-2">Tasa de Éxito</div>
                <div className="text-2xl font-bold" style={{ color: getAccuracyColor(metrics.overall.passedRate) }}>
                  {metrics.overall.passedRate.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {metrics.overall.passedThreshold} de {metrics.overall.totalProjections}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quarterly IVA Accuracy Chart */}
          {quarterlyChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Precisión IVA por Trimestre</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={quarterlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="quarter" />
                    <YAxis label={{ value: 'Precisión (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value: any) => `${parseFloat(value).toFixed(1)}%`} />
                    <Bar dataKey="accuracy">
                      {quarterlyChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getAccuracyColor(entry.accuracy)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {metrics.iva.quarterlyAccuracy.map((q) => (
                    <div key={q.quarter} className="text-center p-2 border rounded">
                      <div className="text-sm font-medium">Q{q.quarter}</div>
                      <div className="text-lg font-bold" style={{ color: getAccuracyColor(q.accuracy) }}>
                        {q.accuracy.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Proy: {formatCurrency(q.projected)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Real: {formatCurrency(q.actual)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Threshold Indicator */}
          <Card className={meetsThreshold ? 'border-green-300 bg-green-50 dark:bg-green-950/20' : 'border-amber-300 bg-amber-50 dark:bg-amber-950/20'}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {meetsThreshold ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                )}
                <div>
                  <div className="font-semibold">
                    {meetsThreshold
                      ? '✅ Precisión dentro del umbral objetivo'
                      : '⚠️ Precisión por debajo del umbral objetivo'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {meetsThreshold
                      ? `La precisión promedio (${metrics.overall.averageAccuracy.toFixed(1)}%) supera el umbral del ${threshold}%`
                      : `La precisión promedio (${metrics.overall.averageAccuracy.toFixed(1)}%) está por debajo del umbral del ${threshold}%`}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}

