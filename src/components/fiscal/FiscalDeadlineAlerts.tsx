'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, CheckCircle, Bell, Calendar } from 'lucide-react';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { toast } from 'sonner';

interface FiscalDeadline {
  id: string;
  quarter?: number;
  type: 'iva' | 'irpf' | 'other';
  title: string;
  description: string;
  dueDate: Date;
  status: 'upcoming' | 'due-soon' | 'overdue' | 'completed';
  daysUntil: number;
  projectionId?: string;
}

export function FiscalDeadlineAlerts({ year }: { year: number }) {
  const { data, error, mutate } = useSWR<{ deadlines: FiscalDeadline[] }>(
    `/api/fiscal/calendar?year=${year}`,
    fetcher
  );

  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const deadlines = data?.deadlines || [];

  // Filter and sort deadlines
  const activeDeadlines = deadlines
    .filter(d => !dismissedAlerts.has(d.id) && d.status !== 'completed')
    .sort((a, b) => {
      // Overdue first, then due-soon, then upcoming
      const statusOrder: Record<string, number> = { overdue: 0, 'due-soon': 1, upcoming: 2 };
      const aOrder = statusOrder[a.status] ?? 3;
      const bOrder = statusOrder[b.status] ?? 3;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return a.daysUntil - b.daysUntil;
    });

  const overdueDeadlines = activeDeadlines.filter(d => d.status === 'overdue');
  const dueSoonDeadlines = activeDeadlines.filter(d => d.status === 'due-soon');
  const upcomingDeadlines = activeDeadlines.filter(d => d.status === 'upcoming');

  const dismissAlert = (id: string) => {
    setDismissedAlerts(new Set([...dismissedAlerts, id]));
  };

  const enableReminders = async () => {
    try {
      const response = await fetch('/api/fiscal/reminders?action=send', {
        method: 'GET',
      });
      if (response.ok) {
        toast.success('Recordatorios activados');
      }
    } catch (error) {
      toast.error('Error activando recordatorios');
    }
  };

  if (activeDeadlines.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Overdue Alerts */}
      {overdueDeadlines.length > 0 && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" />
              Fechas Límite Vencidas
            </CardTitle>
            <CardDescription className="text-red-700 dark:text-red-400">
              Acción requerida inmediatamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdueDeadlines.map((deadline) => (
              <div
                key={deadline.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-800"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-red-900 dark:text-red-200">
                      {deadline.title}
                    </h4>
                    <Badge variant="destructive">Vencido</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {deadline.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-red-700 dark:text-red-300">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Vencido el {format(new Date(deadline.dueDate), 'dd/MM/yyyy')}
                    </span>
                    <span className="text-red-700 dark:text-red-300 font-medium">
                      {Math.abs(deadline.daysUntil)} días de retraso
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => dismissAlert(deadline.id)}
                  >
                    Descartar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Due Soon Alerts */}
      {dueSoonDeadlines.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <Clock className="h-5 w-5" />
              Próximas Fechas Límite
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-400">
              Vencen en los próximos 7 días
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dueSoonDeadlines.map((deadline) => (
              <div
                key={deadline.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-lg border border-amber-200 dark:border-amber-800"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-amber-900 dark:text-amber-200">
                      {deadline.title}
                    </h4>
                    <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
                      Próximo
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {deadline.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-amber-700 dark:text-amber-300">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Vence el {format(new Date(deadline.dueDate), 'dd/MM/yyyy')}
                    </span>
                    <span className="text-amber-700 dark:text-amber-300 font-medium">
                      {deadline.daysUntil} días restantes
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={enableReminders}
                    className="flex items-center gap-1"
                  >
                    <Bell className="h-4 w-4" />
                    Recordatorio
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => dismissAlert(deadline.id)}
                  >
                    Descartar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Alerts */}
      {upcomingDeadlines.length > 0 && upcomingDeadlines.length <= 3 && (
        <Card className="border-blue-300 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
              <Calendar className="h-5 w-5" />
              Próximas Declaraciones
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-400">
              Fechas límite futuras
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingDeadlines.map((deadline) => (
              <div
                key={deadline.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-blue-900 dark:text-blue-200">
                      {deadline.title}
                    </h4>
                    <Badge variant="outline" className="border-blue-500 text-blue-700 dark:text-blue-400">
                      {deadline.daysUntil} días
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(deadline.dueDate), 'dd/MM/yyyy')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissAlert(deadline.id)}
                >
                  Descartar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

