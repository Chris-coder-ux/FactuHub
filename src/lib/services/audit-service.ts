import AuditLog, { IAuditLog } from '@/lib/models/AuditLog';
import { logger } from '@/lib/logger';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';
import dbConnect from '@/lib/mongodb';

export interface CreateAuditLogParams {
  userId: string;
  companyId: string;
  action: IAuditLog['action'];
  resourceType: IAuditLog['resourceType'];
  resourceId?: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    fields?: string[];
  };
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

export class AuditService {
  /**
   * Crea un log de auditoría
   */
  static async createLog(params: CreateAuditLogParams): Promise<IAuditLog | null> {
    try {
      await dbConnect();

      const auditLog = new AuditLog({
        userId: params.userId,
        companyId: toCompanyObjectId(params.companyId),
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        changes: params.changes,
        metadata: params.metadata,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        success: params.success ?? true,
        errorMessage: params.errorMessage,
      });

      await auditLog.save();
      return auditLog;
    } catch (error) {
      // No queremos que errores de auditoría afecten la operación principal
      logger.error('Error creating audit log', error);
      return null;
    }
  }

  /**
   * Crea un log de auditoría de forma asíncrona (no bloquea)
   */
  static async createLogAsync(params: CreateAuditLogParams): Promise<void> {
    // Ejecutar en background sin esperar
    this.createLog(params).catch((error) => {
      logger.error('Error in async audit log creation', error);
    });
  }

  /**
   * Obtiene logs de auditoría con filtros
   */
  static async getLogs(
    companyId: string,
    filters: {
      userId?: string;
      action?: IAuditLog['action'];
      resourceType?: IAuditLog['resourceType'];
      resourceId?: string;
      success?: boolean;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<{ logs: IAuditLog[]; total: number }> {
    try {
      await dbConnect();

      const query: any = {
        companyId: toCompanyObjectId(companyId),
      };

      if (filters.userId) {
        query.userId = filters.userId;
      }

      if (filters.action) {
        query.action = filters.action;
      }

      if (filters.resourceType) {
        query.resourceType = filters.resourceType;
      }

      if (filters.resourceId) {
        query.resourceId = filters.resourceId;
      }

      if (filters.success !== undefined) {
        query.success = filters.success;
      }

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.createdAt.$lte = filters.endDate;
        }
      }

      const limit = filters.limit || 50;
      const skip = filters.skip || 0;

      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .populate('userId', 'name email')
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .lean(),
        AuditLog.countDocuments(query),
      ]);

      return { logs, total };
    } catch (error) {
      logger.error('Error fetching audit logs', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de auditoría
   */
  static async getStats(
    companyId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    byAction: Record<string, number>;
    byResourceType: Record<string, number>;
    bySuccess: { success: number; failed: number };
    recentActivity: number;
  }> {
    try {
      await dbConnect();

      const query: any = {
        companyId: toCompanyObjectId(companyId),
      };

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = startDate;
        }
        if (endDate) {
          query.createdAt.$lte = endDate;
        }
      }

      const logs = await AuditLog.find(query).lean();

      const stats = {
        total: logs.length,
        byAction: {} as Record<string, number>,
        byResourceType: {} as Record<string, number>,
        bySuccess: {
          success: logs.filter((log) => log.success).length,
          failed: logs.filter((log) => !log.success).length,
        },
        recentActivity: logs.filter(
          (log) => new Date(log.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
        ).length,
      };

      logs.forEach((log) => {
        stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
        stats.byResourceType[log.resourceType] = (stats.byResourceType[log.resourceType] || 0) + 1;
      });

      return stats;
    } catch (error) {
      logger.error('Error fetching audit stats', error);
      throw error;
    }
  }
}

