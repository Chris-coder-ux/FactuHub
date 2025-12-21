'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Calculator, TrendingUp, TrendingDown, Euro, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

interface WhatIfScenario {
  name: string;
  revenueChange: number; // Percentage change
  taxRateChange: number; // Percentage change
  quarter?: number;
  year: number;
}

interface WhatIfResult {
  scenario: WhatIfScenario;
  projectedIVA: number;
  projectedIRPF: number;
  currentIVA: number;
  currentIRPF: number;
  ivaChange: number;
  irpfChange: number;
}

export function WhatIfAnalysis({ selectedYear }: { selectedYear: number }) {
  const [scenarios, setScenarios] = useState<WhatIfScenario[]>([
    { name: 'Escenario Base', revenueChange: 0, taxRateChange: 0, year: selectedYear },
    { name: 'Crecimiento 10%', revenueChange: 10, taxRateChange: 0, year: selectedYear },
    { name: 'Crecimiento 20%', revenueChange: 20, taxRateChange: 0, year: selectedYear },
  ]);
  const [newScenario, setNewScenario] = useState<WhatIfScenario>({
    name: '',
    revenueChange: 0,
    taxRateChange: 0,
    year: selectedYear,
  });
  const [results, setResults] = useState<WhatIfResult[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: currentProjections } = useSWR(
    `/api/fiscal/projections?year=${selectedYear}`,
    fetcher
  );

  const calculateWhatIf = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/fiscal/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarios }),
      });

      if (!response.ok) {
        throw new Error('Error calculating what-if scenarios');
      }

      const data = await response.json();
      setResults(data.results);
      toast.success('Análisis what-if completado');
    } catch (error) {
      toast.error('Error calculando escenarios');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addScenario = () => {
    if (!newScenario.name.trim()) {
      toast.error('Por favor ingresa un nombre para el escenario');
      return;
    }
    setScenarios([...scenarios, { ...newScenario }]);
    setNewScenario({
      name: '',
      revenueChange: 0,
      taxRateChange: 0,
      year: selectedYear,
    });
  };

  const removeScenario = (index: number) => {
    setScenarios(scenarios.filter((_, i) => i !== index));
    if (results.length > index) {
      setResults(results.filter((_, i) => i !== index));
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

  const chartData = results.map((result, index) => ({
    scenario: result.scenario.name,
    'IVA Actual': result.currentIVA,
    'IVA Proyectado': result.projectedIVA,
    'IRPF Actual': result.currentIRPF,
    'IRPF Proyectado': result.projectedIRPF,
    'Cambio IVA': result.ivaChange,
    'Cambio IRPF': result.irpfChange,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Análisis What-If Interactivo
          </CardTitle>
          <CardDescription>
            Simula diferentes escenarios de ingresos y tasas fiscales para ver su impacto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Scenario */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg bg-muted/50">
            <div>
              <Label htmlFor="whatif-scenario-name">Nombre del Escenario</Label>
              <Input
                id="whatif-scenario-name"
                placeholder="Ej: Recesión 5%"
                value={newScenario.name}
                onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="whatif-revenue-change">Cambio Ingresos (%)</Label>
              <Input
                id="whatif-revenue-change"
                type="number"
                step="0.1"
                value={newScenario.revenueChange}
                onChange={(e) => setNewScenario({ ...newScenario, revenueChange: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="whatif-tax-rate-change">Cambio Tasa Fiscal (%)</Label>
              <Input
                id="whatif-tax-rate-change"
                type="number"
                step="0.1"
                value={newScenario.taxRateChange}
                onChange={(e) => setNewScenario({ ...newScenario, taxRateChange: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label id="whatif-quarter-label">Trimestre (opcional)</Label>
              <Select
                value={newScenario.quarter?.toString() || 'all'}
                onValueChange={(v) => setNewScenario({ ...newScenario, quarter: v === 'all' ? undefined : parseInt(v) })}
              >
                <SelectTrigger aria-labelledby="whatif-quarter-label" id="whatif-quarter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="1">Q1</SelectItem>
                  <SelectItem value="2">Q2</SelectItem>
                  <SelectItem value="3">Q3</SelectItem>
                  <SelectItem value="4">Q4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={addScenario} className="w-full">
                Agregar Escenario
              </Button>
            </div>
          </div>

          {/* Scenarios List */}
          <div className="space-y-2">
            <h3 className="font-semibold">Escenarios Configurados</h3>
            {scenarios.map((scenario, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg bg-card"
              >
                <div className="flex-1 grid grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm font-medium">{scenario.name}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Ingresos: </span>
                    <span className={scenario.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {scenario.revenueChange > 0 ? '+' : ''}{scenario.revenueChange}%
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Tasa Fiscal: </span>
                    <span className={scenario.taxRateChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {scenario.taxRateChange > 0 ? '+' : ''}{scenario.taxRateChange}%
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {scenario.quarter ? `Q${scenario.quarter}` : 'Todos los trimestres'}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeScenario(index)}
                  className="ml-4"
                >
                  Eliminar
                </Button>
              </div>
            ))}
          </div>

          {/* Calculate Button */}
          <Button
            onClick={calculateWhatIf}
            disabled={loading || scenarios.length === 0}
            className="w-full"
            size="lg"
          >
            {loading ? 'Calculando...' : 'Calcular Escenarios'}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Comparación de Escenarios</CardTitle>
              <CardDescription>Impacto fiscal de cada escenario</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="scenario" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="IVA Actual" fill="#3b82f6" opacity={0.7} />
                  <Bar dataKey="IVA Proyectado" fill="#10b981" opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cambios en Impuestos</CardTitle>
              <CardDescription>Diferencia entre escenarios y situación actual</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="scenario" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="Cambio IVA" fill="#f59e0b" />
                  <Bar dataKey="Cambio IRPF" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed Results Table */}
          <Card>
            <CardHeader>
              <CardTitle>Resultados Detallados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Escenario</th>
                      <th className="text-right p-2">IVA Actual</th>
                      <th className="text-right p-2">IVA Proyectado</th>
                      <th className="text-right p-2">Cambio IVA</th>
                      <th className="text-right p-2">IRPF Actual</th>
                      <th className="text-right p-2">IRPF Proyectado</th>
                      <th className="text-right p-2">Cambio IRPF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{result.scenario.name}</td>
                        <td className="text-right p-2">{formatCurrency(result.currentIVA)}</td>
                        <td className="text-right p-2">{formatCurrency(result.projectedIVA)}</td>
                        <td className={`text-right p-2 ${result.ivaChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {result.ivaChange >= 0 ? '+' : ''}{formatCurrency(result.ivaChange)}
                        </td>
                        <td className="text-right p-2">{formatCurrency(result.currentIRPF)}</td>
                        <td className="text-right p-2">{formatCurrency(result.projectedIRPF)}</td>
                        <td className={`text-right p-2 ${result.irpfChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {result.irpfChange >= 0 ? '+' : ''}{formatCurrency(result.irpfChange)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

