import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Client from '@/lib/models/Client';
import Invoice from '@/lib/models/Invoice';
import Expense from '@/lib/models/Expense';
import GDPRConsent from '@/lib/models/GDPRConsent';
import GDPRProcessingActivity from '@/lib/models/GDPRProcessingActivity';
import { logger } from '@/lib/logger';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';

export interface UserDataExport {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    updatedAt: string;
  };
  clients: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: any;
    taxId?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    client: string;
    total: number;
    status: string;
    issuedDate?: string;
    dueDate: string;
    createdAt: string;
    updatedAt: string;
  }>;
  expenses: Array<{
    id: string;
    description: string;
    amount: number;
    category: string;
    date: string;
    createdAt: string;
    updatedAt: string;
  }>;
  consents: Array<{
    type: string;
    granted: boolean;
    grantedAt?: string;
    revokedAt?: string;
    version: string;
  }>;
  processingActivities: Array<{
    type: string;
    status: string;
    requestDate: string;
    completedDate?: string;
  }>;
}

export class GDPRService {
  /**
   * Obtiene todos los datos del usuario (Derecho de acceso - Art. 15 GDPR)
   */
  static async getUserData(userId: string, companyId?: string): Promise<UserDataExport> {
    try {
      await dbConnect();

      const user = await User.findById(userId).lean();
      if (!user) {
        throw new Error('User not found');
      }

      const companyObjectId = companyId ? toCompanyObjectId(companyId) : undefined;

      // Obtener clientes del usuario
      const clients = await Client.find({
        companyId: companyObjectId || user.companyId,
        deletedAt: null,
      })
        .select('name email phone address taxId createdAt updatedAt')
        .lean();

      // Obtener facturas del usuario
      const invoices = await Invoice.find({
        companyId: companyObjectId || user.companyId,
        deletedAt: null,
      })
        .select('invoiceNumber client total status issuedDate dueDate createdAt updatedAt')
        .populate('client', 'name email')
        .lean();

      // Obtener gastos del usuario
      const expenses = await Expense.find({
        companyId: companyObjectId || user.companyId,
        deletedAt: null,
      })
        .select('description amount category date createdAt updatedAt')
        .lean();

      // Obtener consentimientos
      const consents = await GDPRConsent.find({ userId })
        .select('consentType granted grantedAt revokedAt version')
        .lean();

      // Obtener actividades de procesamiento
      const processingActivities = await GDPRProcessingActivity.find({ userId })
        .select('activityType status requestDate completedDate')
        .lean();

      return {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt?.toISOString() || '',
          updatedAt: user.updatedAt?.toISOString() || '',
        },
        clients: clients.map(c => ({
          id: c._id.toString(),
          name: c.name,
          email: c.email,
          phone: c.phone,
          address: c.address,
          taxId: c.taxId,
          createdAt: c.createdAt?.toISOString() || '',
          updatedAt: c.updatedAt?.toISOString() || '',
        })),
        invoices: invoices.map(i => ({
          id: i._id.toString(),
          invoiceNumber: i.invoiceNumber,
          client: typeof i.client === 'object' && i.client !== null
            ? `${(i.client as any).name} (${(i.client as any).email})`
            : i.client?.toString() || 'Unknown',
          total: i.total,
          status: i.status,
          issuedDate: i.issuedDate?.toISOString(),
          dueDate: i.dueDate?.toISOString() || '',
          createdAt: i.createdAt?.toISOString() || '',
          updatedAt: i.updatedAt?.toISOString() || '',
        })),
        expenses: expenses.map(e => ({
          id: e._id.toString(),
          description: e.description || '',
          amount: e.amount,
          category: e.category || '',
          date: e.date?.toISOString() || '',
          createdAt: e.createdAt?.toISOString() || '',
          updatedAt: e.updatedAt?.toISOString() || '',
        })),
        consents: consents.map(c => ({
          type: c.consentType,
          granted: c.granted,
          grantedAt: c.grantedAt?.toISOString(),
          revokedAt: c.revokedAt?.toISOString(),
          version: c.version,
        })),
        processingActivities: processingActivities.map(a => ({
          type: a.activityType,
          status: a.status,
          requestDate: a.requestDate.toISOString(),
          completedDate: a.completedDate?.toISOString(),
        })),
      };
    } catch (error) {
      logger.error('Error getting user data for GDPR', { userId, error });
      throw error;
    }
  }

  /**
   * Registra una actividad de procesamiento GDPR
   */
  static async recordProcessingActivity(params: {
    userId: string;
    companyId?: string;
    activityType: 'access' | 'rectification' | 'portability' | 'erasure' | 'restriction' | 'objection';
    status?: 'pending' | 'completed' | 'rejected';
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await dbConnect();

      const activity = new GDPRProcessingActivity({
        userId: params.userId,
        companyId: params.companyId ? toCompanyObjectId(params.companyId) : undefined,
        activityType: params.activityType,
        status: params.status || 'pending',
        requestDate: new Date(),
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata,
      });

      await activity.save();
      logger.info('GDPR processing activity recorded', {
        userId: params.userId,
        activityType: params.activityType,
      });
    } catch (error) {
      logger.error('Error recording GDPR processing activity', { params, error });
      // No lanzar error para no afectar la operación principal
    }
  }

  /**
   * Actualiza el estado de una actividad de procesamiento
   */
  static async updateProcessingActivity(
    userId: string,
    activityType: string,
    status: 'completed' | 'rejected',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await dbConnect();

      await GDPRProcessingActivity.findOneAndUpdate(
        { userId, activityType, status: 'pending' },
        {
          status,
          completedDate: new Date(),
          metadata: metadata || {},
        }
      );
    } catch (error) {
      logger.error('Error updating GDPR processing activity', { userId, activityType, error });
    }
  }

  /**
   * Elimina todos los datos del usuario (Derecho al olvido - Art. 17 GDPR)
   */
  static async deleteUserData(userId: string, companyId?: string): Promise<void> {
    try {
      await dbConnect();

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const companyObjectId = companyId ? toCompanyObjectId(companyId) : user.companyId;

      // Soft delete: marcar como eliminado en lugar de borrar físicamente
      // (requisito legal: algunos datos deben conservarse por períodos legales)
      user.deletedAt = new Date();
      user.email = `deleted_${Date.now()}_${user.email}`; // Anonimizar email
      user.name = 'Deleted User';
      user.password = ''; // Eliminar password
      user.mfaSecret = undefined;
      user.mfaBackupCodes = [];
      await user.save();

      // Eliminar clientes asociados (soft delete)
      await Client.updateMany(
        { companyId: companyObjectId },
        { deletedAt: new Date() }
      );

      // Eliminar facturas asociadas (soft delete)
      await Invoice.updateMany(
        { companyId: companyObjectId },
        { deletedAt: new Date() }
      );

      // Eliminar gastos asociados (soft delete)
      await Expense.updateMany(
        { companyId: companyObjectId },
        { deletedAt: new Date() }
      );

      // Revocar todos los consentimientos
      await GDPRConsent.updateMany(
        { userId },
        {
          granted: false,
          revokedAt: new Date(),
        }
      );

      // Registrar actividad de eliminación
      await this.recordProcessingActivity({
        userId,
        companyId: companyId || user.companyId?.toString(),
        activityType: 'erasure',
        status: 'completed',
        metadata: { deletedAt: new Date().toISOString() },
      });

      logger.info('User data deleted for GDPR', { userId, companyId });
    } catch (error) {
      logger.error('Error deleting user data for GDPR', { userId, error });
      throw error;
    }
  }

  /**
   * Gestiona consentimientos GDPR
   */
  static async updateConsent(params: {
    userId: string;
    companyId?: string;
    consentType: 'marketing' | 'analytics' | 'necessary' | 'functional';
    granted: boolean;
    version: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await dbConnect();

      const existingConsent = await GDPRConsent.findOne({
        userId: params.userId,
        consentType: params.consentType,
      });

      if (existingConsent) {
        existingConsent.granted = params.granted;
        if (params.granted) {
          existingConsent.grantedAt = new Date();
          existingConsent.revokedAt = undefined;
        } else {
          existingConsent.revokedAt = new Date();
        }
        existingConsent.version = params.version;
        existingConsent.ipAddress = params.ipAddress;
        existingConsent.userAgent = params.userAgent;
        await existingConsent.save();
      } else {
        const consent = new GDPRConsent({
          userId: params.userId,
          companyId: params.companyId ? toCompanyObjectId(params.companyId) : undefined,
          consentType: params.consentType,
          granted: params.granted,
          grantedAt: params.granted ? new Date() : undefined,
          revokedAt: params.granted ? undefined : new Date(),
          version: params.version,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        });
        await consent.save();
      }

      logger.info('GDPR consent updated', {
        userId: params.userId,
        consentType: params.consentType,
        granted: params.granted,
      });
    } catch (error) {
      logger.error('Error updating GDPR consent', { params, error });
      throw error;
    }
  }

  /**
   * Obtiene el estado de consentimientos del usuario
   */
  static async getUserConsents(userId: string): Promise<Array<{
    type: string;
    granted: boolean;
    grantedAt?: Date;
    revokedAt?: Date;
    version: string;
  }>> {
    try {
      await dbConnect();

      const consents = await GDPRConsent.find({ userId })
        .select('consentType granted grantedAt revokedAt version')
        .lean();

      return consents.map(c => ({
        type: c.consentType,
        granted: c.granted,
        grantedAt: c.grantedAt,
        revokedAt: c.revokedAt,
        version: c.version,
      }));
    } catch (error) {
      logger.error('Error getting user consents', { userId, error });
      throw error;
    }
  }
}

