/**
 * Real-time Notifications Component
 * Displays real-time updates using Server-Sent Events
 * 
 * Usage:
 * <RealtimeNotifications />
 */

'use client';

import { useEffect } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { RealtimeEvent } from '@/lib/services/realtime-service';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle, Bell, FileText, Shield } from 'lucide-react';

export function RealtimeNotifications() {
  const { events, isConnected } = useRealtime({
    enabled: true,
    onEvent: (event: RealtimeEvent) => {
      // Handle different event types with appropriate notifications
      switch (event.type) {
        case 'invoice.created':
          toast.success('Nueva factura creada', {
            description: `Factura ${event.data.invoiceNumber} creada`,
            icon: <FileText className="h-4 w-4" />,
          });
          break;

        case 'invoice.paid':
          toast.success('Factura pagada', {
            description: `Factura ${event.data.invoiceNumber} marcada como pagada`,
            icon: <CheckCircle2 className="h-4 w-4" />,
          });
          break;

        case 'invoice.updated':
          toast.info('Factura actualizada', {
            description: `Estado: ${event.data.status}`,
            icon: <FileText className="h-4 w-4" />,
          });
          break;

        case 'invoice.overdue':
          toast.warning('Factura vencida', {
            description: `Factura ${event.data.invoiceNumber} está vencida`,
            icon: <AlertCircle className="h-4 w-4" />,
          });
          break;

        case 'receipt.processed':
          toast.success('Recibo procesado', {
            description: 'El OCR se completó correctamente',
            icon: <CheckCircle2 className="h-4 w-4" />,
          });
          break;

        case 'security.alert':
          const severity = event.data.severity;
          const severityConfig = {
            critical: { variant: 'error' as const, icon: <AlertCircle className="h-4 w-4" /> },
            high: { variant: 'error' as const, icon: <AlertCircle className="h-4 w-4" /> },
            medium: { variant: 'warning' as const, icon: <Shield className="h-4 w-4" /> },
            low: { variant: 'info' as const, icon: <Bell className="h-4 w-4" /> },
          };
          const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.low;
          
          toast[config.variant](`Alerta de seguridad: ${event.data.title}`, {
            description: `Severidad: ${severity}`,
            icon: config.icon,
            duration: severity === 'critical' || severity === 'high' ? 10000 : 5000,
          });
          break;

        case 'notification.new':
          toast.info('Nueva notificación', {
            description: event.data.message || 'Tienes una nueva notificación',
            icon: <Bell className="h-4 w-4" />,
          });
          break;

        default:
          // Silent for unknown event types
          break;
      }
    },
  });

  // Show connection status (optional, for debugging)
  useEffect(() => {
    // Connection status is handled by useRealtime hook
    // No need to log here as it's already handled in the hook
  }, [isConnected]);

  // This component doesn't render anything visible
  // It just handles real-time events in the background
  return null;
}

