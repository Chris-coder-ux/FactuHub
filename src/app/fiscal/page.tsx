'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Calendar, TrendingUp, Euro, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface FiscalProjection {
  _id: string;
  year: number;
  quarter?: number;
  type: 'iva' | 'irpf';
  projectedAmount: number;
  actualAmount?: number;
  confidence: number;
}

export default function FiscalPage() {
  const [projections, setProjections] = useState<FiscalProjection[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchProjections();
  }, [selectedYear]);

  const fetchProjections = async () => {
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
  };

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

      {/* Fiscal Alerts */}
      {getUpcomingDeadlines(selectedYear).length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Próximas Fechas Límite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getUpcomingDeadlines(selectedYear).map((deadline, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded border border-amber-200">
                  <div>
                    <p className="font-medium">IVA Trimestre {deadline.quarter}</p>
                    <p className="text-sm text-muted-foreground">Modelo 303</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{deadline.date.toLocaleDateString('es-ES')}</p>
                    <p className="text-sm text-muted-foreground">
                      {Math.ceil((deadline.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} días
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fiscal Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Calendario Fiscal {selectedYear}</CardTitle>
          <CardDescription>Fechas límite para declaraciones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <h4 className="font-semibold">IVA Q1</h4>
              <p className="text-sm text-muted-foreground">30 enero {selectedYear + 1}</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <h4 className="font-semibold">IVA Q2</h4>
              <p className="text-sm text-muted-foreground">20 abril {selectedYear}</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <h4 className="font-semibold">IVA Q3</h4>
              <p className="text-sm text-muted-foreground">20 julio {selectedYear}</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <h4 className="font-semibold">IVA Q4</h4>
              <p className="text-sm text-muted-foreground">20 octubre {selectedYear}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}