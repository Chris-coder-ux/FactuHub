'use client';

import { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Download,
  RefreshCw,
  Eye,
  FileText,
  Settings,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SecurityAlert {
  _id: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  details: Record<string, any>;
  detectedAt: string;
  resolvedAt?: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
  };
  ipAddress?: string;
}

interface SecurityAlertsResponse {
  success: boolean;
  alerts: SecurityAlert[];
  total: number;
  pagination: {
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

interface SecurityReport {
  success: boolean;
  report: {
    period: {
      startDate: string;
      endDate: string;
    };
    summary: {
      totalLogsAnalyzed: number;
      suspiciousActivities: number;
      criticalAlerts: number;
    };
    patternsDetected: Array<{
      type: string;
      severity: string;
      count: number;
      description: string;
    }>;
    alerts: {
      total: number;
      critical: number;
      unacknowledged: number;
    };
    topAlerts: SecurityAlert[];
    criticalAlerts: SecurityAlert[];
  };
  generatedAt: string;
}

const severityColors: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const alertTypeLabels: Record<string, string> = {
  multiple_failed_logins: 'Múltiples intentos de login fallidos',
  unusual_ip_access: 'Acceso desde IP inusual',
  privilege_escalation: 'Escalación de privilegios',
  mass_data_export: 'Exportación masiva de datos',
  suspicious_activity_pattern: 'Patrón de actividad sospechoso',
  unauthorized_access_attempt: 'Intento de acceso no autorizado',
  data_breach_attempt: 'Intento de brecha de datos',
  unusual_time_access: 'Acceso en hora inusual',
  rapid_failed_actions: 'Acciones fallidas rápidas',
  gdpr_data_deletion: 'Eliminación de datos GDPR',
  settings_modification: 'Modificación de configuración',
  other: 'Otro',
};

interface SecurityConfig {
  securityAnalysisEnabled: boolean;
  securityAnalysisFrequency: '15min' | '30min' | '1hour' | '2hours' | '6hours' | '12hours' | '24hours';
  securityAnalysisLastRun: string | null;
}

const frequencyLabels: Record<string, string> = {
  '15min': 'Cada 15 minutos',
  '30min': 'Cada 30 minutos',
  '1hour': 'Cada hora',
  '2hours': 'Cada 2 horas',
  '6hours': 'Cada 6 horas',
  '12hours': 'Cada 12 horas',
  '24hours': 'Cada 24 horas',
};

const frequencyCron: Record<string, string> = {
  '15min': '*/15 * * * *',
  '30min': '*/30 * * * *',
  '1hour': '0 * * * *',
  '2hours': '0 */2 * * *',
  '6hours': '0 */6 * * *',
  '12hours': '0 */12 * * *',
  '24hours': '0 0 * * *',
};

export default function SecurityPage() {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [acknowledgedFilter, setAcknowledgedFilter] = useState<string>('unacknowledged');
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [config, setConfig] = useState<SecurityConfig | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);

  // Fetch alerts
  const { data: alertsData, isLoading: alertsLoading, mutate: mutateAlerts } = useSWR<SecurityAlertsResponse>(
    `/api/security/alerts?severity=${severityFilter !== 'all' ? severityFilter : ''}&acknowledged=${acknowledgedFilter === 'acknowledged' ? 'true' : acknowledgedFilter === 'unacknowledged' ? 'false' : ''}`,
    fetcher
  );

  // Fetch security report
  const { data: reportData, isLoading: reportLoading, mutate: mutateReport } = useSWR<SecurityReport>(
    '/api/security/report',
    fetcher
  );

  // Fetch security config
  const { data: configData, isLoading: configLoading, mutate: mutateConfig } = useSWR<{ success: boolean; config: SecurityConfig }>(
    '/api/security/config',
    fetcher
  );

  // Update config state when data loads
  useEffect(() => {
    if (configData?.config) {
      setConfig(configData.config);
    }
  }, [configData]);

  const filteredAlerts = useMemo(() => {
    if (!alertsData?.alerts) return [];
    return alertsData.alerts;
  }, [alertsData]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      const response = await fetch('/api/security/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge',
          alertId,
        }),
      });

      if (!response.ok) throw new Error('Failed to acknowledge alert');

      toast.success('Alerta reconocida');
      mutateAlerts();
      mutateReport();
    } catch (error) {
      toast.error('Error al reconocer la alerta');
    }
  };

  const handleResolve = async (alertId: string) => {
    if (!resolutionNotes.trim()) {
      toast.error('Las notas de resolución son requeridas');
      return;
    }

    try {
      const response = await fetch('/api/security/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          alertId,
          resolutionNotes: resolutionNotes.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to resolve alert');

      toast.success('Alerta resuelta');
      setSelectedAlert(null);
      setResolutionNotes('');
      mutateAlerts();
      mutateReport();
    } catch (error) {
      toast.error('Error al resolver la alerta');
    }
  };

  const handleRefresh = () => {
    mutateAlerts();
    mutateReport();
    toast.info('Actualizando datos...');
  };

  const handleGenerateReport = async () => {
    try {
      mutateReport();
      toast.success('Reporte generado');
    } catch (error) {
      toast.error('Error al generar reporte');
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;

    setIsSavingConfig(true);
    try {
      const response = await fetch('/api/security/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          securityAnalysisEnabled: config.securityAnalysisEnabled,
          securityAnalysisFrequency: config.securityAnalysisFrequency,
        }),
      });

      if (!response.ok) throw new Error('Failed to save config');

      const data = await response.json();
      setConfig(data.config);
      mutateConfig();
      toast.success('Configuración guardada');
    } catch (error) {
      toast.error('Error al guardar configuración');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleRunAnalysis = async () => {
    setIsRunningAnalysis(true);
    try {
      const response = await fetch('/api/security/run', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to run analysis');
      }

      const data = await response.json();
      toast.success(`Análisis completado: ${data.result.alertsCreated} alertas creadas`);
      mutateConfig();
      mutateAlerts();
      mutateReport();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al ejecutar análisis');
    } finally {
      setIsRunningAnalysis(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Seguridad y Auditoría
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitorea alertas de seguridad y gestiona el análisis automatizado
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={handleGenerateReport}>
            <FileText className="h-4 w-4 mr-2" />
            Generar Reporte
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {reportLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : reportData ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Alertas</p>
                  <p className="text-2xl font-bold">{reportData.report.alerts.total}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Críticas</p>
                  <p className="text-2xl font-bold text-red-600">{reportData.report.alerts.critical}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sin Revisar</p>
                  <p className="text-2xl font-bold text-yellow-600">{reportData.report.alerts.unacknowledged}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Actividades Sospechosas</p>
                  <p className="text-2xl font-bold">{reportData.report.summary.suspiciousActivities}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <CardTitle>Configuración del Análisis Automatizado</CardTitle>
              </div>
              <CardDescription>
                Configura la frecuencia y ejecuta análisis manualmente
              </CardDescription>
            </div>
            <Button
              onClick={handleRunAnalysis}
              disabled={isRunningAnalysis || (config ? !(config.securityAnalysisEnabled ?? true) : false)}
              variant="outline"
            >
              {isRunningAnalysis ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Ejecutando...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-2" />
                  Ejecutar Ahora
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {configLoading ? (
            <Skeleton className="h-32" />
          ) : config ? (
            <div className="space-y-4">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Análisis Automatizado</p>
                  <p className="text-sm text-muted-foreground">
                    Habilita o deshabilita el análisis automático de seguridad
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.securityAnalysisEnabled ?? true}
                    onChange={(e) => setConfig({ ...config, securityAnalysisEnabled: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">
                    {config.securityAnalysisEnabled ? 'Habilitado' : 'Deshabilitado'}
                  </span>
                </label>
              </div>

              {/* Frequency */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <label className="block font-medium mb-2">Frecuencia del Análisis</label>
                <select
                  value={config.securityAnalysisFrequency}
                  onChange={(e) => setConfig({ ...config, securityAnalysisFrequency: e.target.value as any })}
                  className="w-full px-4 py-2 border rounded-lg mb-2"
                >
                  <option value="15min">Cada 15 minutos</option>
                  <option value="30min">Cada 30 minutos</option>
                  <option value="1hour">Cada hora</option>
                  <option value="2hours">Cada 2 horas</option>
                  <option value="6hours">Cada 6 horas</option>
                  <option value="12hours">Cada 12 horas</option>
                  <option value="24hours">Cada 24 horas</option>
                </select>
                <p className="text-xs text-muted-foreground mb-2">
                  Expresión Cron: <code className="bg-background px-2 py-1 rounded">{frequencyCron[config.securityAnalysisFrequency]}</code>
                </p>
                {config.securityAnalysisLastRun && (
                  <p className="text-xs text-muted-foreground">
                    Última ejecución: {format(new Date(config.securityAnalysisLastRun), 'PPpp')}
                  </p>
                )}
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="w-full"
              >
                {isSavingConfig ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Guardar Configuración
                  </>
                )}
              </Button>

              {/* Vercel Config Info */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">
                  ⚠️ Nota sobre Vercel Cron
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
                  Para cambiar la frecuencia en producción, actualiza el archivo <code>vercel.json</code>:
                </p>
                <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
{`{
  "crons": [
    {
      "path": "/api/cron/security-analysis",
      "schedule": "${frequencyCron[config.securityAnalysisFrequency]}"
    }
  ]
}`}
                </pre>
                <p className="text-xs text-blue-800 dark:text-blue-200 mt-2">
                  La configuración aquí guardada es una preferencia. El cron real se ejecuta según <code>vercel.json</code>.
                </p>
              </div>

              {/* Detected Patterns */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-medium mb-2">Patrones Detectados:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Múltiples intentos de login fallidos</li>
                  <li>Acceso desde IPs inusuales</li>
                  <li>Escalación de privilegios</li>
                  <li>Exportaciones masivas de datos</li>
                  <li>Acciones fallidas rápidas</li>
                  <li>Acceso en horas inusuales</li>
                  <li>Eliminaciones GDPR</li>
                </ul>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">Todas las severidades</option>
          <option value="low">Baja</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
          <option value="critical">Crítica</option>
        </select>
        <select
          value={acknowledgedFilter}
          onChange={(e) => setAcknowledgedFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">Todas</option>
          <option value="unacknowledged">Sin revisar</option>
          <option value="acknowledged">Reconocidas</option>
        </select>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas de Seguridad</CardTitle>
          <CardDescription>
            {alertsData?.total || 0} alertas encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alertsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : filteredAlerts.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="No hay alertas"
              description="No se encontraron alertas de seguridad con los filtros seleccionados"
            />
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <motion.div
                  key={alert._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={severityColors[alert.severity]}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {alertTypeLabels[alert.alertType] || alert.alertType}
                        </Badge>
                        {alert.acknowledged && (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Revisada
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold mb-1">{alert.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{format(new Date(alert.detectedAt), 'PPpp')}</span>
                        {alert.ipAddress && <span>IP: {alert.ipAddress}</span>}
                        {alert.userId && (
                          <span>Usuario: {alert.userId.name} ({alert.userId.email})</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!alert.acknowledged && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledge(alert._id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Revisar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAlert(alert)}
                          >
                            Resolver
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Alert Dialog */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Resolver Alerta</CardTitle>
              <CardDescription>{selectedAlert.title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Notas de Resolución</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg"
                  rows={4}
                  placeholder="Describe cómo se resolvió esta alerta..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedAlert(null);
                    setResolutionNotes('');
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={() => handleResolve(selectedAlert._id)}>
                  Resolver
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

