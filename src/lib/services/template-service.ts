import Template, { ITemplate, TemplateType } from '@/lib/models/Template';
import Invoice from '@/lib/models/Invoice';
import { logger } from '@/lib/logger';
import { toCompanyObjectId } from '@/lib/mongodb-helpers';
import dbConnect from '@/lib/mongodb';

export interface CreateTemplateParams {
  name: string;
  type: TemplateType;
  companyId: string;
  createdBy: string;
  isDefault?: boolean;
  isShared?: boolean;
  invoiceTemplate?: ITemplate['invoiceTemplate'];
  emailTemplate?: ITemplate['emailTemplate'];
  pdfTemplate?: ITemplate['pdfTemplate'];
  metadata?: ITemplate['metadata'];
}

export interface ApplyInvoiceTemplateParams {
  templateId: string;
  companyId: string;
  clientId?: string; // Override cliente de la plantilla
  dueDateDays?: number; // Override días de vencimiento
}

export class TemplateService {
  /**
   * Crea una nueva plantilla
   */
  static async createTemplate(params: CreateTemplateParams): Promise<ITemplate> {
    try {
      await dbConnect();

      const template = new Template({
        name: params.name,
        type: params.type,
        companyId: toCompanyObjectId(params.companyId),
        createdBy: params.createdBy,
        isDefault: params.isDefault ?? false,
        isShared: params.isShared ?? false,
        invoiceTemplate: params.invoiceTemplate,
        emailTemplate: params.emailTemplate,
        pdfTemplate: params.pdfTemplate,
        metadata: params.metadata,
      });

      await template.save();
      return template;
    } catch (error) {
      logger.error('Error creating template', error);
      throw error;
    }
  }

  /**
   * Obtiene plantillas por tipo y empresa
   */
  static async getTemplates(
    companyId: string,
    type?: TemplateType,
    includeShared: boolean = false
  ): Promise<ITemplate[]> {
    try {
      await dbConnect();

      const query: any = {
        companyId: toCompanyObjectId(companyId),
      };

      if (type) {
        query.type = type;
      }

      if (includeShared) {
        query.$or = [
          { companyId: toCompanyObjectId(companyId) },
          { isShared: true },
        ];
      }

      const templates = await Template.find(query)
        .populate('invoiceTemplate.client', 'name email')
        .populate('invoiceTemplate.items.product', 'name price tax')
        .populate('createdBy', 'name email')
        .sort({ isDefault: -1, createdAt: -1 })
        .lean();

      return templates;
    } catch (error) {
      logger.error('Error fetching templates', error);
      throw error;
    }
  }

  /**
   * Obtiene una plantilla por ID
   */
  static async getTemplateById(
    templateId: string,
    companyId: string
  ): Promise<ITemplate | null> {
    try {
      await dbConnect();

      const template = await Template.findOne({
        _id: templateId,
        companyId: toCompanyObjectId(companyId),
      })
        .populate('invoiceTemplate.client', 'name email')
        .populate('invoiceTemplate.items.product', 'name price tax')
        .lean();

      return template;
    } catch (error) {
      logger.error('Error fetching template', error);
      throw error;
    }
  }

  /**
   * Actualiza una plantilla
   */
  static async updateTemplate(
    templateId: string,
    companyId: string,
    updates: Partial<CreateTemplateParams>
  ): Promise<ITemplate | null> {
    try {
      await dbConnect();

      const template = await Template.findOneAndUpdate(
        {
          _id: templateId,
          companyId: toCompanyObjectId(companyId),
        },
        { $set: updates },
        { new: true }
      );

      return template;
    } catch (error) {
      logger.error('Error updating template', error);
      throw error;
    }
  }

  /**
   * Elimina una plantilla
   */
  static async deleteTemplate(
    templateId: string,
    companyId: string
  ): Promise<boolean> {
    try {
      await dbConnect();

      const result = await Template.deleteOne({
        _id: templateId,
        companyId: toCompanyObjectId(companyId),
      });

      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting template', error);
      throw error;
    }
  }

  /**
   * Aplica una plantilla de factura y retorna los datos para crear una factura
   */
  static async applyInvoiceTemplate(
    params: ApplyInvoiceTemplateParams
  ): Promise<{
    client?: string;
    items: Array<{
      product: string;
      quantity: number;
      price: number;
      tax: number;
      description?: string;
    }>;
    notes?: string;
    dueDate: Date;
    status: 'draft' | 'sent';
  }> {
    try {
      await dbConnect();

      const template = await Template.findOne({
        _id: params.templateId,
        companyId: toCompanyObjectId(params.companyId),
        type: 'invoice',
      })
        .populate('invoiceTemplate.items.product')
        .lean();

      if (!template || !template.invoiceTemplate) {
        throw new Error('Template not found or invalid type');
      }

      // Actualizar contador de uso
      await Template.updateOne(
        { _id: params.templateId },
        {
          $inc: { 'metadata.usageCount': 1 },
          $set: { 'metadata.lastUsedAt': new Date() },
        }
      );

      const invoiceData = template.invoiceTemplate;
      const dueDateDays = params.dueDateDays ?? invoiceData.dueDateDays ?? 30;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueDateDays);

      return {
        client: params.clientId || invoiceData.client?.toString(),
        items: invoiceData.items.map((item: any) => ({
          product: item.product._id?.toString() || item.product.toString(),
          quantity: item.quantity,
          price: item.price,
          tax: item.tax,
          description: item.description,
        })),
        notes: invoiceData.notes,
        dueDate,
        status: invoiceData.status || 'draft',
      };
    } catch (error) {
      logger.error('Error applying invoice template', error);
      throw error;
    }
  }

  /**
   * Renderiza una plantilla de email con variables
   */
  static renderEmailTemplate(
    template: ITemplate,
    variables: Record<string, string | number>
  ): { subject: string; body: string } {
    if (!template.emailTemplate) {
      throw new Error('Template is not an email template');
    }

    let subject = template.emailTemplate.subject;
    let body = template.emailTemplate.body;

    // Reemplazar variables {{variableName}}
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(regex, String(value));
      body = body.replace(regex, String(value));
    });

    return { subject, body };
  }

  /**
   * Obtiene la plantilla por defecto de un tipo
   */
  static async getDefaultTemplate(
    companyId: string,
    type: TemplateType
  ): Promise<ITemplate | null> {
    try {
      await dbConnect();

      const template = await Template.findOne({
        companyId: toCompanyObjectId(companyId),
        type,
        isDefault: true,
      }).lean();

      return template;
    } catch (error) {
      logger.error('Error fetching default template', error);
      throw error;
    }
  }
}

