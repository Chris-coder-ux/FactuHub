'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetcher } from '@/lib/fetcher';
import { Loader2, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface OCRMetrics {
  total: number;
  averageConfidence: number;
  averageCompleteness: number;
  passedRate: number;
  meetsThreshold: boolean;
  confidenceRanges: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  trend: {
    recentAverage: number;
    previousAverage: number;
    change: number;
    direction: 'up' | 'down' | 'stable';
  };
  thresholds: {
    minConfidence: number;
    minAccuracy: number;
  };
}

export function OCRAccuracyMetrics() {
  const [minConfidence, setMinConfidence] = useState(80);
  const [minAccuracy, setMinAccuracy] = useState(90);
  
  const { data, error, isLoading, mutate } = useSWR<{ metrics: OCRMetrics }>(
    `/api/receipts/validate-accuracy?minConfidence=${minConfidence}&minAccuracy=${minAccuracy}`,
    fetcher
  );

  const metrics = data?.metrics;

  const confidenceChartData = metrics?.confidenceRanges ? [
    { name: 'Excelente (≥90%)', value: metrics.confidenceRanges.excellent || 0, color: '#10b981' },
    { name: 'Buena (80-89%)', value: metrics.confidenceRanges.good || 0, color: '#3b82f6' },
    { name: 'Regular (70-79%)', value: metrics.confidenceRanges.fair || 0, color: '#f59e0b' },
    { name: 'Baja (<70%)', value: metrics.confidenceRanges.poor || 0, color: '#ef4444' },
  ] : [];

  const getTrendIcon = () => {
    if (!metrics?.trend) return null;
    switch (metrics.trend.direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-red-600">Error al cargar métricas de precisión OCR</p>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Precisión Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metrics.averageCompleteness * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Completitud de datos extraídos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Confianza Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.averageConfidence.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Score promedio de confianza OCR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metrics.passedRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Recibos que cumplen umbrales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {metrics.meetsThreshold ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-lg font-semibold text-green-600">Cumple</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-lg font-semibold text-red-600">No Cumple</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.meetsThreshold ? '≥90% precisión' : '<90% precisión'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Card */}
      <Card>
        <CardHeader>
          <CardTitle>Tendencia de Confianza</CardTitle>
          <CardDescription>Comparación últimos 30 días vs anteriores 30 días</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              <span className="text-2xl font-bold">
                {metrics.trend?.change !== undefined 
                  ? (metrics.trend.change > 0 ? '+' : '') + metrics.trend.change.toFixed(1) + '%'
                  : 'N/A'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              <div>Últimos 30 días: {metrics.trend?.recentAverage?.toFixed(1) || 'N/A'}%</div>
              <div>Anteriores 30 días: {metrics.trend?.previousAverage?.toFixed(1) || 'N/A'}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confidence Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Confianza</CardTitle>
          <CardDescription>Clasificación de recibos por nivel de confianza</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={confidenceChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8">
                {confidenceChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Estadísticas Detalladas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Total Recibos</div>
              <div className="text-2xl font-bold">{metrics.total}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Excelente (≥90%)</div>
              <div className="text-2xl font-bold text-green-600">
                {metrics.confidenceRanges?.excellent ?? 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Buena (80-89%)</div>
              <div className="text-2xl font-bold text-blue-600">
                {metrics.confidenceRanges?.good ?? 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Regular (70-79%)</div>
              <div className="text-2xl font-bold text-yellow-600">
                {metrics.confidenceRanges?.fair ?? 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Baja (&lt;70%)</div>
              <div className="text-2xl font-bold text-red-600">
                {metrics.confidenceRanges?.poor ?? 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Umbrales de Validación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant={metrics.meetsThreshold ? 'default' : 'destructive'}>
              {metrics.meetsThreshold ? '✅ Cumple' : '❌ No Cumple'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Confianza mínima: {metrics.thresholds?.minConfidence || 80}% | 
              Precisión mínima: {metrics.thresholds?.minAccuracy || 90}%
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => mutate()} variant="outline">
          <BarChart3 className="h-4 w-4 mr-2" />
          Actualizar Métricas
        </Button>
      </div>
    </div>
  );
}

