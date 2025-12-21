'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Calendar, TrendingUp, Euro, Loader2, AlertTriangle, Bell } from 'lucide-react';
import { FiscalDeadlineAlerts } from '@/components/fiscal/FiscalDeadlineAlerts';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';

// Lazy load heavy components to reduce initial bundle size
const FiscalCalendar = dynamic(() => import('@/components/fiscal/FiscalCalendar').then(mod => ({ default: mod.FiscalCalendar })), {
  loading: () => <Skeleton className="h-96 w-full" />,
  ssr: false
});

const FiscalTrendsChart = dynamic(() => import('@/components/fiscal/FiscalTrendsChart').then(mod => ({ default: mod.FiscalTrendsChart })), {
  loading: () => <Skeleton className="h-96 w-full" />,
  ssr: false
});

const WhatIfAnalysis = dynamic(() => import('@/components/fiscal/WhatIfAnalysis').then(mod => ({ default: mod.WhatIfAnalysis })), {
  loading: () => <Skeleton className="h-96 w-full" />,
  ssr: false
});

const FiscalAccuracyMetrics = dynamic(() => import('@/components/fiscal/FiscalAccuracyMetrics').then(mod => ({ default: mod.FiscalAccuracyMetrics })), {
  loading: () => <Skeleton className="h-96 w-full" />,
  ssr: false
});

interface FiscalProjection {
  _id: string;
  year: number;
  quarter?: number;
  type: 'iva' | 'irpf';
  projectedAmount: number;
  actualAmount?: number;
  confidence: number;
}

interface FiscalDeadline {
  id: string;
  quarter?: number;
  type: 'iva' | 'irpf' | 'other';
  title: string;
  description: string;
  dueDate: Date;
  status: 'upcoming' | 'due-soon' | 'overdue' | 'completed';
  daysUntil: number;
}

export default function FiscalPage() {
  const [projections, setProjections] = useState<FiscalProjection[]>([]);
  const [deadlines, setDeadlines] = useState<FiscalDeadline[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchProjections = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/fiscal/projections?year=${selectedYear}`);
      const data = await response.json();
      setProjections(data.projections);
    } catch (error) {
      toast.error('Error cargando proyecciones');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  const fetchDeadlines = useCallback(async () => {
    try {
      const response = await fetch(`/api/fiscal/calendar?year=${selectedYear}`);
      const data = await response.json();
      setDeadlines(data.deadlines.map((d: any) => ({
        ...d,
        dueDate: new Date(d.dueDate),
      })));
    } catch (error) {
      logger.error('Error fetching deadlines', error);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchProjections();
    fetchDeadlines();
  }, [fetchProjections, fetchDeadlines]);

  const generateProjections = async (type: 'iva' | 'irpf') => {
    setGenerating(true);
    try {
      const response = await fetch('/api/fiscal/projections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYear, type }),
      });

      if (response.ok) {
        toast.success('Proyecciones generadas');
        fetchProjections();
      } else {
        toast.error('Error generando proyecciones');
      }
    } catch (error) {
      toast.error('Error generando proyecciones');
    } finally {
      setGenerating(false);
    }
  };

  const ivaData = projections
    .filter(p => p.type === 'iva' && p.quarter)
    .map(p => ({
      quarter: `Q${p.quarter}`,
      projected: p.projectedAmount,
      actual: p.actualAmount || 0,
    }));

  const irpfData = projections
    .filter(p => p.type === 'irpf')
    .map(p => ({
      year: p.year.toString(),
      projected: p.projectedAmount,
      actual: p.actualAmount || 0,
    }));

  const getUpcomingDeadlines = (year: number) => {
    const deadlines = [
      { quarter: 1, date: new Date(year + 1, 0, 30) }, // Jan 30 next year
      { quarter: 2, date: new Date(year, 3, 20) }, // Apr 20
      { quarter: 3, date: new Date(year, 6, 20) }, // Jul 20
      { quarter: 4, date: new Date(year, 9, 20) }, // Oct 20
    ];

    const now = new Date();
    return deadlines.filter(d => d.date > now && d.date.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000); // Next 30 days
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Previsión Fiscal</h1>
          <p className="text-muted-foreground">Proyecciones de IVA e IRPF basadas en tu historial</p>
        </div>
        <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2026">2026</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* IVA Projections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Proyecciones IVA Trimestrales
              </CardTitle>
              <CardDescription>
                Estimaciones de IVA a pagar por trimestre (Modelo 303)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ivaData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ivaData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="quarter" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`€${(value as number)?.toFixed(2) || '0.00'}`, '']} />
                    <Bar dataKey="projected" fill="#3b82f6" name="Proyectado" />
                    <Bar dataKey="actual" fill="#10b981" name="Real" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No hay proyecciones IVA para este año</p>
                  <Button onClick={() => generateProjections('iva')} disabled={generating}>
                    {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Generar Proyecciones IVA
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* IRPF Projections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Proyección IRPF Anual
              </CardTitle>
              <CardDescription>
                Estimación de IRPF a pagar anualmente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {irpfData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={irpfData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`€${(value as number)?.toFixed(2) || '0.00'}`, '']} />
                    <Line type="monotone" dataKey="projected" stroke="#3b82f6" strokeWidth={2} name="Proyectado" />
                    <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} name="Real" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No hay proyección IRPF para este año</p>
                  <Button onClick={() => generateProjections('irpf')} disabled={generating}>
                    {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Generar Proyección IRPF
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Fiscal Deadline Alerts */}
      <FiscalDeadlineAlerts year={selectedYear} />

      {/* Fiscal Calendar Component */}
      <FiscalCalendar
        year={selectedYear}
        deadlines={deadlines}
        onDeadlineClick={(deadline) => {
          toast.info(`${deadline.title}: ${deadline.description}`);
        }}
      />

      {/* Advanced Trends Charts */}
      <FiscalTrendsChart selectedYear={selectedYear} />

      {/* What-If Analysis */}
      <WhatIfAnalysis selectedYear={selectedYear} />

      {/* Accuracy Metrics */}
      <FiscalAccuracyMetrics selectedYear={selectedYear} />
    </div>
  );
}