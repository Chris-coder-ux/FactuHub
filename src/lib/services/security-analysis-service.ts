import dbConnect from '@/lib/mongodb';
import AuditLog from '@/lib/models/AuditLog';
import SecurityAlert from '@/lib/models/SecurityAlert';
import { logger } from '@/lib/logger';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';
import { emailService } from '@/lib/services/email-service';
import Settings from '@/lib/models/Settings';
import Company from '@/lib/models/Company';
import User from '@/lib/models/User';

export interface SecurityAnalysisResult {
  alertsCreated: number;
  patternsDetected: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    count: number;
    description: string;
  }>;
  summary: {
    totalLogsAnalyzed: number;
    suspiciousActivities: number;
    criticalAlerts: number;
  };
}

export interface AnalysisTimeRange {
  startDate: Date;
  endDate: Date;
}

export class SecurityAnalysisService {
  /**
   * Analiza logs de auditoría y detecta patrones sospechosos
   */
  static async analyzeSecurityLogs(
    companyId?: string,
    timeRange?: AnalysisTimeRange
  ): Promise<SecurityAnalysisResult> {
    try {
      await dbConnect();

      const endDate = timeRange?.endDate || new Date();
      const startDate = timeRange?.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Últimas 24 horas por defecto

      // Construir query base
      const query: any = {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      };

      if (companyId) {
        query.companyId = toCompanyObjectId(companyId);
      }

      // Obtener logs del período
      const logs = await AuditLog.find(query).lean();
      const totalLogsAnalyzed = logs.length;

      const alertsCreated: string[] = [];
      const patternsDetected: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        count: number;
        description: string;
      }> = [];

      // 1. Detectar múltiples intentos de login fallidos
      const failedLogins = await this.detectMultipleFailedLogins(query, startDate, endDate);
      if (failedLogins.length > 0) {
        for (const pattern of failedLogins) {
          const alertId = await this.createAlert({
            companyId: pattern.companyId,
            userId: pattern.userId,
            alertType: 'multiple_failed_logins',
            severity: pattern.count >= 10 ? 'critical' : pattern.count >= 5 ? 'high' : 'medium',
            title: `Multiple Failed Login Attempts`,
            description: `User attempted to login ${pattern.count} times unsuccessfully in the last hour`,
            details: {
              userId: pattern.userId,
              attemptCount: pattern.count,
              ipAddresses: pattern.ipAddresses,
              timeWindow: '1 hour',
            },
            relatedLogIds: pattern.logIds,
            ipAddress: pattern.ipAddresses[0],
          });
          if (alertId) alertsCreated.push(alertId);
        }
        patternsDetected.push({
          type: 'multiple_failed_logins',
          severity: 'high',
          count: failedLogins.length,
          description: `${failedLogins.length} users with multiple failed login attempts`,
        });
      }

      // 2. Detectar acceso desde IPs inusuales
      const unusualIPs = await this.detectUnusualIPAccess(query, startDate, endDate);
      if (unusualIPs.length > 0) {
        for (const pattern of unusualIPs) {
          const alertId = await this.createAlert({
            companyId: pattern.companyId,
            userId: pattern.userId,
            alertType: 'unusual_ip_access',
            severity: 'medium',
            title: `Unusual IP Address Access`,
            description: `User accessed from new IP address: ${pattern.ipAddress}`,
            details: {
              userId: pattern.userId,
              ipAddress: pattern.ipAddress,
              previousIPs: pattern.previousIPs,
            },
            relatedLogIds: pattern.logIds,
            ipAddress: pattern.ipAddress,
          });
          if (alertId) alertsCreated.push(alertId);
        }
        patternsDetected.push({
          type: 'unusual_ip_access',
          severity: 'medium',
          count: unusualIPs.length,
          description: `${unusualIPs.length} users accessed from unusual IP addresses`,
        });
      }

      // 3. Detectar escalación de privilegios
      const privilegeEscalations = await this.detectPrivilegeEscalation(query, startDate, endDate);
      if (privilegeEscalations.length > 0) {
        for (const pattern of privilegeEscalations) {
          const alertId = await this.createAlert({
            companyId: pattern.companyId,
            userId: pattern.userId,
            alertType: 'privilege_escalation',
            severity: 'critical',
            title: `Privilege Escalation Detected`,
            description: `User role changed from ${pattern.fromRole} to ${pattern.toRole}`,
            details: {
              userId: pattern.userId,
              fromRole: pattern.fromRole,
              toRole: pattern.toRole,
              changedBy: pattern.changedBy,
            },
            relatedLogIds: pattern.logIds,
          });
          if (alertId) alertsCreated.push(alertId);
        }
        patternsDetected.push({
          type: 'privilege_escalation',
          severity: 'critical',
          count: privilegeEscalations.length,
          description: `${privilegeEscalations.length} privilege escalation attempts detected`,
        });
      }

      // 4. Detectar exportaciones masivas de datos
      const massExports = await this.detectMassDataExport(query, startDate, endDate);
      if (massExports.length > 0) {
        for (const pattern of massExports) {
          const alertId = await this.createAlert({
            companyId: pattern.companyId,
            userId: pattern.userId,
            alertType: 'mass_data_export',
            severity: pattern.count >= 100 ? 'high' : 'medium',
            title: `Mass Data Export Detected`,
            description: `User exported ${pattern.count} records in a short period`,
            details: {
              userId: pattern.userId,
              exportCount: pattern.count,
              resourceTypes: pattern.resourceTypes,
              timeWindow: pattern.timeWindow,
            },
            relatedLogIds: pattern.logIds,
          });
          if (alertId) alertsCreated.push(alertId);
        }
        patternsDetected.push({
          type: 'mass_data_export',
          severity: 'high',
          count: massExports.length,
          description: `${massExports.length} users performed mass data exports`,
        });
      }

      // 5. Detectar acciones fallidas rápidas
      const rapidFailures = await this.detectRapidFailedActions(query, startDate, endDate);
      if (rapidFailures.length > 0) {
        for (const pattern of rapidFailures) {
          const alertId = await this.createAlert({
            companyId: pattern.companyId,
            userId: pattern.userId,
            alertType: 'rapid_failed_actions',
            severity: pattern.count >= 20 ? 'high' : 'medium',
            title: `Rapid Failed Actions`,
            description: `User had ${pattern.count} failed actions in a short period`,
            details: {
              userId: pattern.userId,
              failureCount: pattern.count,
              actions: pattern.actions,
              timeWindow: pattern.timeWindow,
            },
            relatedLogIds: pattern.logIds,
          });
          if (alertId) alertsCreated.push(alertId);
        }
        patternsDetected.push({
          type: 'rapid_failed_actions',
          severity: 'medium',
          count: rapidFailures.length,
          description: `${rapidFailures.length} users with rapid failed actions`,
        });
      }

      // 6. Detectar acceso en horas inusuales
      const unusualTimeAccess = await this.detectUnusualTimeAccess(query, startDate, endDate);
      if (unusualTimeAccess.length > 0) {
        for (const pattern of unusualTimeAccess) {
          const alertId = await this.createAlert({
            companyId: pattern.companyId,
            userId: pattern.userId,
            alertType: 'unusual_time_access',
            severity: 'low',
            title: `Unusual Time Access`,
            description: `User accessed system at unusual time: ${pattern.time}`,
            details: {
              userId: pattern.userId,
              accessTime: pattern.time,
              timezone: pattern.timezone,
            },
            relatedLogIds: pattern.logIds,
          });
          if (alertId) alertsCreated.push(alertId);
        }
        patternsDetected.push({
          type: 'unusual_time_access',
          severity: 'low',
          count: unusualTimeAccess.length,
          description: `${unusualTimeAccess.length} users accessed at unusual times`,
        });
      }

      // 7. Detectar eliminaciones GDPR
      const gdprDeletions = await this.detectGDPRDeletions(query, startDate, endDate);
      if (gdprDeletions.length > 0) {
        for (const pattern of gdprDeletions) {
          const alertId = await this.createAlert({
            companyId: pattern.companyId,
            userId: pattern.userId,
            alertType: 'gdpr_data_deletion',
            severity: 'high',
            title: `GDPR Data Deletion Request`,
            description: `User requested deletion of all personal data (GDPR Art. 17)`,
            details: {
              userId: pattern.userId,
              deletionDate: pattern.deletionDate,
            },
            relatedLogIds: pattern.logIds,
          });
          if (alertId) alertsCreated.push(alertId);
        }
        patternsDetected.push({
          type: 'gdpr_data_deletion',
          severity: 'high',
          count: gdprDeletions.length,
          description: `${gdprDeletions.length} GDPR data deletion requests`,
        });
      }

      const criticalAlerts = patternsDetected.filter(p => p.severity === 'critical').length;
      const suspiciousActivities = alertsCreated.length;

      return {
        alertsCreated: alertsCreated.length,
        patternsDetected,
        summary: {
          totalLogsAnalyzed,
          suspiciousActivities,
          criticalAlerts,
        },
      };
    } catch (error) {
      logger.error('Security analysis error', error);
      throw error;
    }
  }

  /**
   * Detecta múltiples intentos de login fallidos
   */
  private static async detectMultipleFailedLogins(
    baseQuery: any,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    userId: string;
    companyId?: string;
    count: number;
    ipAddresses: string[];
    logIds: any[];
  }>> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const failedLogins = await AuditLog.find({
      ...baseQuery,
      action: 'login',
      success: false,
      createdAt: { $gte: oneHourAgo, $lte: endDate },
    }).lean();

    // Agrupar por userId
    const grouped: Record<string, {
      userId: string;
      companyId?: string;
      count: number;
      ipAddresses: Set<string>;
      logIds: any[];
    }> = {};

    for (const log of failedLogins) {
      const userId = log.userId.toString();
      if (!grouped[userId]) {
        grouped[userId] = {
          userId,
          companyId: log.companyId?.toString(),
          count: 0,
          ipAddresses: new Set(),
          logIds: [],
        };
      }
      grouped[userId].count++;
      if (log.ipAddress) grouped[userId].ipAddresses.add(log.ipAddress);
      grouped[userId].logIds.push(log._id);
    }

    // Filtrar solo los que tienen 3 o más intentos fallidos
    return Object.values(grouped)
      .filter(g => g.count >= 3)
      .map(g => ({
        userId: g.userId,
        companyId: g.companyId,
        count: g.count,
        ipAddresses: Array.from(g.ipAddresses),
        logIds: g.logIds,
      }));
  }

  /**
   * Detecta acceso desde IPs inusuales
   */
  private static async detectUnusualIPAccess(
    baseQuery: any,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    userId: string;
    companyId?: string;
    ipAddress: string;
    previousIPs: string[];
    logIds: any[];
  }>> {
    // Obtener logs de login exitosos en las últimas 24 horas
    const recentLogins = await AuditLog.find({
      ...baseQuery,
      action: 'login',
      success: true,
      ipAddress: { $exists: true, $ne: null },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Para cada usuario, verificar si la IP es nueva
    const userIPs: Record<string, Set<string>> = {};
    const results: Array<{
      userId: string;
      companyId?: string;
      ipAddress: string;
      previousIPs: string[];
      logIds: any[];
    }> = [];

    // Primero, obtener historial de IPs de cada usuario (últimos 30 días)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const historicalLogins = await AuditLog.find({
      ...baseQuery,
      action: 'login',
      success: true,
      createdAt: { $gte: thirtyDaysAgo },
      ipAddress: { $exists: true, $ne: null },
    }).lean();

    for (const log of historicalLogins) {
      const userId = log.userId.toString();
      if (!userIPs[userId]) {
        userIPs[userId] = new Set();
      }
      if (log.ipAddress) {
        userIPs[userId].add(log.ipAddress);
      }
    }

    // Verificar IPs nuevas en los últimos logins
    for (const log of recentLogins) {
      const userId = log.userId.toString();
      const currentIP = log.ipAddress;
      if (!currentIP) continue;

      const previousIPs = Array.from(userIPs[userId] || []);
      // Si la IP actual no está en el historial, es inusual
      if (previousIPs.length > 0 && !userIPs[userId]?.has(currentIP)) {
        results.push({
          userId,
          companyId: log.companyId?.toString(),
          ipAddress: currentIP,
          previousIPs,
          logIds: [log._id],
        });
        // Agregar la nueva IP al historial para evitar duplicados
        userIPs[userId].add(currentIP);
      }
    }

    return results;
  }

  /**
   * Detecta escalación de privilegios
   */
  private static async detectPrivilegeEscalation(
    baseQuery: any,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    userId: string;
    companyId?: string;
    fromRole: string;
    toRole: string;
    changedBy: string;
    logIds: any[];
  }>> {
    const permissionChanges = await AuditLog.find({
      ...baseQuery,
      action: 'permission_change',
      success: true,
    }).lean();

    const results: Array<{
      userId: string;
      companyId?: string;
      fromRole: string;
      toRole: string;
      changedBy: string;
      logIds: any[];
    }> = [];

    for (const log of permissionChanges) {
      const changes = log.changes;
      if (changes?.after?.role && changes?.before?.role) {
        const fromRole = changes.before.role;
        const toRole = changes.after.role;
        // Detectar si hay escalación (user -> admin)
        if (fromRole === 'user' && toRole === 'admin') {
          results.push({
            userId: log.resourceId || log.userId.toString(),
            companyId: log.companyId?.toString(),
            fromRole,
            toRole,
            changedBy: log.userId.toString(),
            logIds: [log._id],
          });
        }
      }
    }

    return results;
  }

  /**
   * Detecta exportaciones masivas de datos
   */
  private static async detectMassDataExport(
    baseQuery: any,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    userId: string;
    companyId?: string;
    count: number;
    resourceTypes: string[];
    timeWindow: string;
    logIds: any[];
  }>> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const exports = await AuditLog.find({
      ...baseQuery,
      action: 'export',
      success: true,
      createdAt: { $gte: oneHourAgo, $lte: endDate },
    }).lean();

    // Agrupar por userId
    const grouped: Record<string, {
      userId: string;
      companyId?: string;
      count: number;
      resourceTypes: Set<string>;
      logIds: any[];
    }> = {};

    for (const log of exports) {
      const userId = log.userId.toString();
      if (!grouped[userId]) {
        grouped[userId] = {
          userId,
          companyId: log.companyId?.toString(),
          count: 0,
          resourceTypes: new Set(),
          logIds: [],
        };
      }
      grouped[userId].count++;
      if (log.resourceType) grouped[userId].resourceTypes.add(log.resourceType);
      grouped[userId].logIds.push(log._id);
    }

    // Filtrar solo los que tienen 10 o más exportaciones
    return Object.values(grouped)
      .filter(g => g.count >= 10)
      .map(g => ({
        userId: g.userId,
        companyId: g.companyId,
        count: g.count,
        resourceTypes: Array.from(g.resourceTypes),
        timeWindow: '1 hour',
        logIds: g.logIds,
      }));
  }

  /**
   * Detecta acciones fallidas rápidas
   */
  private static async detectRapidFailedActions(
    baseQuery: any,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    userId: string;
    companyId?: string;
    count: number;
    actions: string[];
    timeWindow: string;
    logIds: any[];
  }>> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const failedActions = await AuditLog.find({
      ...baseQuery,
      success: false,
      createdAt: { $gte: tenMinutesAgo, $lte: endDate },
    }).lean();

    // Agrupar por userId
    const grouped: Record<string, {
      userId: string;
      companyId?: string;
      count: number;
      actions: Set<string>;
      logIds: any[];
    }> = {};

    for (const log of failedActions) {
      const userId = log.userId.toString();
      if (!grouped[userId]) {
        grouped[userId] = {
          userId,
          companyId: log.companyId?.toString(),
          count: 0,
          actions: new Set(),
          logIds: [],
        };
      }
      grouped[userId].count++;
      if (log.action) grouped[userId].actions.add(log.action);
      grouped[userId].logIds.push(log._id);
    }

    // Filtrar solo los que tienen 10 o más acciones fallidas
    return Object.values(grouped)
      .filter(g => g.count >= 10)
      .map(g => ({
        userId: g.userId,
        companyId: g.companyId,
        count: g.count,
        actions: Array.from(g.actions),
        timeWindow: '10 minutes',
        logIds: g.logIds,
      }));
  }

  /**
   * Detecta acceso en horas inusuales (2 AM - 5 AM)
   */
  private static async detectUnusualTimeAccess(
    baseQuery: any,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    userId: string;
    companyId?: string;
    time: string;
    timezone: string;
    logIds: any[];
  }>> {
    const logs = await AuditLog.find({
      ...baseQuery,
      success: true,
    }).lean();

    const results: Array<{
      userId: string;
      companyId?: string;
      time: string;
      timezone: string;
      logIds: any[];
    }> = [];

    for (const log of logs) {
      const logDate = new Date(log.createdAt);
      const hour = logDate.getHours();
      // Detectar acceso entre 2 AM y 5 AM
      if (hour >= 2 && hour < 5) {
        results.push({
          userId: log.userId.toString(),
          companyId: log.companyId?.toString(),
          time: logDate.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          logIds: [log._id],
        });
      }
    }

    return results;
  }

  /**
   * Detecta eliminaciones GDPR
   */
  private static async detectGDPRDeletions(
    baseQuery: any,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    userId: string;
    companyId?: string;
    deletionDate: string;
    logIds: any[];
  }>> {
    // Buscar en logs de GDPR o en cambios que indiquen eliminación
    const gdprLogs = await AuditLog.find({
      ...baseQuery,
      $or: [
        { resourceType: 'user', action: 'delete' },
        { metadata: { $regex: /gdpr|erasure|deletion/i } },
      ],
    }).lean();

    return gdprLogs.map(log => ({
      userId: log.userId.toString(),
      companyId: log.companyId?.toString(),
      deletionDate: log.createdAt.toISOString(),
      logIds: [log._id],
    }));
  }

  /**
   * Envía notificación de seguridad por email
   */
  private static async sendSecurityNotification(
    alert: any,
    companyId?: string
  ): Promise<void> {
    try {
      if (!companyId) {
        logger.warn('Cannot send security notification: companyId is required');
        return;
      }

      await dbConnect();

      // Get company settings to check if notifications are enabled
      const settings = await Settings.findOne({
        companyId: toCompanyObjectId(companyId),
      }).lean();

      if (!settings) {
        logger.warn('Cannot send security notification: company settings not found', { companyId });
        return;
      }

      // Check if email notifications are enabled
      if (settings.emailNotificationsEnabled === false) {
        logger.info('Email notifications disabled for company', { companyId });
        return;
      }

      // Get company info
      const company = await Company.findById(companyId).lean();
      if (!company) {
        logger.warn('Cannot send security notification: company not found', { companyId });
        return;
      }

      // Get admin users to notify
      const adminUsers = await User.find({
        companyId: toCompanyObjectId(companyId),
        role: { $in: ['admin', 'owner'] },
      }).lean();

      if (adminUsers.length === 0) {
        logger.warn('No admin users found to notify', { companyId });
        return;
      }

      // Prepare email content
      const severityLabels: Record<string, string> = {
        critical: '🔴 CRÍTICA',
        high: '🟠 ALTA',
        medium: '🟡 MEDIA',
        low: '🔵 BAJA',
      };

      const severityLabel = severityLabels[alert.severity] || alert.severity.toUpperCase();

      const emailSubject = `[${severityLabel}] Alerta de Seguridad: ${alert.title}`;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${alert.severity === 'critical' ? '#dc2626' : alert.severity === 'high' ? '#ea580c' : '#ca8a04'}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .alert-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${alert.severity === 'critical' ? '#dc2626' : alert.severity === 'high' ? '#ea580c' : '#ca8a04'}; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .button { display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🚨 Alerta de Seguridad</h2>
              <p style="margin: 0;">Severidad: ${severityLabel}</p>
            </div>
            <div class="content">
              <h3>${alert.title}</h3>
              <p>${alert.description}</p>
              
              <div class="alert-details">
                <strong>Detalles:</strong>
                <ul>
                  ${Object.entries(alert.details || {})
                    .map(([key, value]) => `<li><strong>${key}:</strong> ${typeof value === 'object' ? JSON.stringify(value) : String(value)}</li>`)
                    .join('')}
                </ul>
                ${alert.ipAddress ? `<p><strong>IP Address:</strong> ${alert.ipAddress}</p>` : ''}
                <p><strong>Fecha:</strong> ${new Date(alert.detectedAt).toLocaleString('es-ES')}</p>
              </div>

              <a href="${process.env.NEXTAUTH_URL || 'https://app.example.com'}/security" class="button">
                Ver Alertas de Seguridad
              </a>
            </div>
            <div class="footer">
              <p>Esta es una notificación automática del sistema de seguridad de ${company.name || 'FacturaHub'}.</p>
              <p>Si no reconoces esta actividad, por favor contacta al administrador del sistema inmediatamente.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailText = `
ALERTA DE SEGURIDAD - ${severityLabel}

${alert.title}

${alert.description}

Detalles:
${Object.entries(alert.details || {})
  .map(([key, value]) => `  ${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
  .join('\n')}

${alert.ipAddress ? `IP Address: ${alert.ipAddress}\n` : ''}
Fecha: ${new Date(alert.detectedAt).toLocaleString('es-ES')}

Ver alertas: ${process.env.NEXTAUTH_URL || 'https://app.example.com'}/security
      `.trim();

      // Send email to all admin users
      const emailPromises = adminUsers.map((user) =>
        emailService.sendEmail({
          to: user.email,
          subject: emailSubject,
          html: emailHtml,
          text: emailText,
          companyId,
          userId: user._id.toString(),
          type: 'other',
          metadata: {
            alertId: alert._id?.toString() || alert.id,
            alertType: alert.alertType,
            severity: alert.severity,
          },
        })
      );

      await Promise.allSettled(emailPromises);

      logger.info('Security notification emails sent', {
        companyId,
        alertId: alert._id?.toString() || alert.id,
        recipients: adminUsers.length,
      });
    } catch (error) {
      logger.error('Failed to send security notification', { error, alertId: alert._id?.toString() || alert.id });
      // Don't throw - notification failure shouldn't fail alert creation
    }
  }

  /**
   * Crea una alerta de seguridad y envía notificación inmediata si es crítica
   */
  static async createAlertAndNotify(params: {
    companyId?: string;
    userId?: string;
    alertType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    details: Record<string, any>;
    relatedLogIds?: any[];
    ipAddress?: string;
    userAgent?: string;
  }): Promise<string | null> {
    const alertId = await this.createAlert(params);

    if (alertId && params.severity === 'critical' && params.companyId) {
      // Get the created alert to send notification
      try {
        await dbConnect();
        const alert = await SecurityAlert.findById(alertId).lean();
        if (alert) {
          // Send notification asynchronously (don't wait)
          this.sendSecurityNotification(alert, params.companyId).catch((error) => {
            logger.error('Failed to send security notification asynchronously', { error, alertId });
          });
        }
      } catch (error) {
        logger.error('Failed to fetch alert for notification', { error, alertId });
      }
    }

    return alertId;
  }

  /**
   * Crea una alerta de seguridad
   */
  private static async createAlert(params: {
    companyId?: string;
    userId?: string;
    alertType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    details: Record<string, any>;
    relatedLogIds?: any[];
    ipAddress?: string;
    userAgent?: string;
  }): Promise<string | null> {
    try {
      // Verificar si ya existe una alerta similar no resuelta
      const existingAlert = await SecurityAlert.findOne({
        companyId: params.companyId ? toCompanyObjectId(params.companyId) : undefined,
        userId: params.userId,
        alertType: params.alertType,
        acknowledged: false,
        resolvedAt: { $exists: false },
        detectedAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // Última hora
      });

      if (existingAlert) {
        // Actualizar alerta existente en lugar de crear duplicado
        existingAlert.details = { ...existingAlert.details, ...params.details };
        await existingAlert.save();
        return existingAlert._id.toString();
      }

      const alert = new SecurityAlert({
        companyId: params.companyId ? toCompanyObjectId(params.companyId) : undefined,
        userId: params.userId,
        alertType: params.alertType as any,
        severity: params.severity,
        title: params.title,
        description: params.description,
        details: params.details,
        relatedLogIds: params.relatedLogIds || [],
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        detectedAt: new Date(),
      });

      await alert.save();
      logger.warn('Security alert created', {
        alertId: alert._id.toString(),
        alertType: params.alertType,
        severity: params.severity,
      });

      return alert._id.toString();
    } catch (error) {
      logger.error('Error creating security alert', { params, error });
      return null;
    }
  }

  /**
   * Obtiene alertas de seguridad
   */
  static async getAlerts(
    companyId?: string,
    filters: {
      severity?: 'low' | 'medium' | 'high' | 'critical';
      acknowledged?: boolean;
      alertType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<{ alerts: any[]; total: number }> {
    try {
      await dbConnect();

      const query: any = {};
      if (companyId) {
        query.companyId = toCompanyObjectId(companyId);
      }
      if (filters.severity) {
        query.severity = filters.severity;
      }
      if (filters.acknowledged !== undefined) {
        query.acknowledged = filters.acknowledged;
      }
      if (filters.alertType) {
        query.alertType = filters.alertType;
      }
      if (filters.startDate || filters.endDate) {
        query.detectedAt = {};
        if (filters.startDate) {
          query.detectedAt.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.detectedAt.$lte = filters.endDate;
        }
      }

      const limit = filters.limit || 50;
      const skip = filters.skip || 0;

      const [alerts, total] = await Promise.all([
        SecurityAlert.find(query)
          .populate('userId', 'name email')
          .populate('resolvedBy', 'name email')
          .populate('acknowledgedBy', 'name email')
          .sort({ detectedAt: -1 })
          .limit(limit)
          .skip(skip)
          .lean(),
        SecurityAlert.countDocuments(query),
      ]);

      return { alerts, total };
    } catch (error) {
      logger.error('Error fetching security alerts', error);
      throw error;
    }
  }

  /**
   * Marca una alerta como reconocida
   */
  static async acknowledgeAlert(
    alertId: string,
    userId: string
  ): Promise<void> {
    try {
      await dbConnect();

      await SecurityAlert.findByIdAndUpdate(alertId, {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      });
    } catch (error) {
      logger.error('Error acknowledging security alert', { alertId, error });
      throw error;
    }
  }

  /**
   * Resuelve una alerta
   */
  static async resolveAlert(
    alertId: string,
    userId: string,
    resolutionNotes: string
  ): Promise<void> {
    try {
      await dbConnect();

      await SecurityAlert.findByIdAndUpdate(alertId, {
        resolvedAt: new Date(),
        resolvedBy: userId,
        resolutionNotes,
      });
    } catch (error) {
      logger.error('Error resolving security alert', { alertId, error });
      throw error;
    }
  }
}

