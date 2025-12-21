/**
 * Plantillas predefinidas basadas en estilos profesionales comunes
 * Inspiradas en: Infactura, Square, Invoice Ninja, HubSpot, etc.
 */

export interface PredesignedTemplate {
  id: string;
  name: string;
  type: 'invoice' | 'email' | 'pdf';
  description: string;
  category: 'minimal' | 'professional' | 'detailed' | 'branded';
  preview: {
    thumbnail: string; // Descripción de cómo se ve
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
  };
  config: any;
}

export const PREDESIGNED_TEMPLATES: PredesignedTemplate[] = [
  // ========== PLANTILLAS DE FACTURAS ==========
  {
    id: 'invoice-minimal',
    name: 'Factura Minimalista',
    type: 'invoice',
    description: 'Diseño limpio y moderno, ideal para servicios profesionales',
    category: 'minimal',
    preview: {
      thumbnail: 'Diseño limpio con espacios en blanco generosos, tipografía clara y colores neutros',
      colors: {
        primary: '#1f2937',
        secondary: '#6b7280',
        accent: '#3b82f6',
      },
    },
    config: {
      invoiceTemplate: {
        items: [
          {
            product: 'Servicio de Consultoría',
            quantity: 1,
            price: 1000,
            tax: 21,
            description: 'Asesoramiento profesional',
          },
        ],
        notes: 'Gracias por su confianza. Pago a 30 días.',
        dueDateDays: 30,
        status: 'draft',
      },
    },
  },
  {
    id: 'invoice-professional',
    name: 'Factura Profesional',
    type: 'invoice',
    description: 'Estilo corporativo con detalles completos, perfecto para empresas',
    category: 'professional',
    preview: {
      thumbnail: 'Diseño corporativo con secciones bien definidas, información completa y branding destacado',
      colors: {
        primary: '#0f172a',
        secondary: '#475569',
        accent: '#2563eb',
      },
    },
    config: {
      invoiceTemplate: {
        items: [
          {
            product: 'Producto/Servicio',
            quantity: 1,
            price: 500,
            tax: 21,
            description: 'Descripción del producto o servicio',
          },
        ],
        notes: 'Términos y condiciones de pago aplicables según acuerdo comercial.',
        dueDateDays: 30,
        status: 'draft',
      },
    },
  },
  {
    id: 'invoice-detailed',
    name: 'Factura Detallada',
    type: 'invoice',
    description: 'Formato completo con todos los detalles, ideal para proyectos complejos',
    category: 'detailed',
    preview: {
      thumbnail: 'Formato completo con múltiples secciones, desglose detallado y información fiscal completa',
      colors: {
        primary: '#111827',
        secondary: '#4b5563',
        accent: '#059669',
      },
    },
    config: {
      invoiceTemplate: {
        items: [
          {
            product: 'Item 1',
            quantity: 2,
            price: 250,
            tax: 21,
            description: 'Descripción detallada del item',
          },
          {
            product: 'Item 2',
            quantity: 1,
            price: 150,
            tax: 10,
            description: 'Descripción detallada del item',
          },
        ],
        notes: 'Factura detallada con desglose completo de servicios y productos. Todos los importes incluyen IVA según normativa vigente.',
        dueDateDays: 30,
        status: 'draft',
      },
    },
  },

  // ========== PLANTILLAS DE EMAILS ==========
  {
    id: 'email-simple',
    name: 'Email Simple',
    type: 'email',
    description: 'Mensaje directo y claro, perfecto para comunicación rápida',
    category: 'minimal',
    preview: {
      thumbnail: 'Email con diseño minimalista, mensaje directo y call-to-action claro',
      colors: {
        primary: '#1f2937',
        secondary: '#6b7280',
        accent: '#3b82f6',
      },
    },
    config: {
      emailTemplate: {
        subject: 'Factura {{invoiceNumber}} - {{clientName}}',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hola {{clientName}},</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Adjunto encontrarás la factura <strong>{{invoiceNumber}}</strong> por un importe de <strong>{{total}}€</strong>.
            </p>
            <p style="color: #4b5563; line-height: 1.6;">
              La fecha de vencimiento es el <strong>{{dueDate}}</strong>.
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin-top: 30px;">
              Si tienes alguna pregunta, no dudes en contactarnos.
            </p>
            <p style="color: #4b5563; margin-top: 30px;">
              Saludos cordiales,<br>
              El equipo de facturación
            </p>
          </div>
        `,
        variables: ['invoiceNumber', 'clientName', 'total', 'dueDate'],
      },
    },
  },
  {
    id: 'email-professional',
    name: 'Email Profesional',
    type: 'email',
    description: 'Formato corporativo con branding y estructura profesional',
    category: 'professional',
    preview: {
      thumbnail: 'Email corporativo con header con logo, secciones estructuradas y footer profesional',
      colors: {
        primary: '#0f172a',
        secondary: '#475569',
        accent: '#2563eb',
      },
    },
    config: {
      emailTemplate: {
        subject: 'Factura {{invoiceNumber}} - {{clientName}} | Pago Pendiente',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
            <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="color: #0f172a; margin: 0; font-size: 24px;">Factura {{invoiceNumber}}</h1>
              </div>
              
              <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Estimado/a <strong>{{clientName}}</strong>,
              </p>
              
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                Le informamos que se ha generado la factura <strong>{{invoiceNumber}}</strong> correspondiente a nuestros servicios.
              </p>
              
              <div style="background: #f1f5f9; padding: 20px; border-radius: 6px; margin: 30px 0;">
                <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">IMPORTE TOTAL</p>
                <p style="margin: 0; font-size: 32px; font-weight: bold; color: #0f172a;">{{total}}€</p>
                <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">Vencimiento: {{dueDate}}</p>
              </div>
              
              <p style="color: #4b5563; line-height: 1.6; margin-top: 30px;">
                Puede descargar la factura completa en formato PDF haciendo clic en el enlace adjunto.
              </p>
              
              <p style="color: #4b5563; line-height: 1.6; margin-top: 20px;">
                Si tiene alguna consulta o necesita aclaración sobre esta factura, estaremos encantados de ayudarle.
              </p>
              
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; color: #64748b; font-size: 12px;">
                  Este es un mensaje automático. Por favor, no responda a este correo.
                </p>
              </div>
            </div>
          </div>
        `,
        variables: ['invoiceNumber', 'clientName', 'total', 'dueDate'],
      },
    },
  },
  {
    id: 'email-branded',
    name: 'Email con Branding',
    type: 'email',
    description: 'Diseño con colores corporativos y elementos visuales destacados',
    category: 'branded',
    preview: {
      thumbnail: 'Email con diseño visual atractivo, colores corporativos y elementos gráficos',
      colors: {
        primary: '#111827',
        secondary: '#4b5563',
        accent: '#059669',
      },
    },
    config: {
      emailTemplate: {
        subject: '📧 Factura {{invoiceNumber}} - {{clientName}}',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2px; border-radius: 12px;">
            <div style="background: white; padding: 40px; border-radius: 10px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-size: 28px; font-weight: bold;">F</span>
                </div>
                <h1 style="color: #111827; margin: 0; font-size: 28px;">Factura {{invoiceNumber}}</h1>
              </div>
              
              <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 8px; margin-bottom: 30px;">
                <p style="margin: 0 0 15px 0; color: #0c4a6e; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Para</p>
                <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 600;">{{clientName}}</p>
              </div>
              
              <div style="text-align: center; background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
                <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">IMPORTE TOTAL</p>
                <p style="margin: 0; font-size: 48px; font-weight: bold; color: #111827; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">{{total}}€</p>
                <p style="margin: 15px 0 0 0; color: #64748b; font-size: 14px;">Vence el {{dueDate}}</p>
              </div>
              
              <p style="color: #4b5563; line-height: 1.8; margin-bottom: 30px; text-align: center;">
                Hemos generado su factura. Puede descargarla en formato PDF desde el enlace adjunto.
              </p>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="#" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                  Descargar Factura PDF
                </a>
              </div>
              
              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                Gracias por confiar en nosotros
              </p>
            </div>
          </div>
        `,
        variables: ['invoiceNumber', 'clientName', 'total', 'dueDate'],
      },
    },
  },

  // ========== PLANTILLAS DE PDF ==========
  {
    id: 'pdf-minimal',
    name: 'PDF Minimalista',
    type: 'pdf',
    description: 'Diseño limpio y elegante para facturas PDF',
    category: 'minimal',
    preview: {
      thumbnail: 'PDF con diseño minimalista, tipografía clara y espacios generosos',
      colors: {
        primary: '#1f2937',
        secondary: '#6b7280',
        accent: '#3b82f6',
      },
    },
    config: {
      pdfTemplate: {
        layout: 'minimal',
        colors: {
          primary: '#1f2937',
          secondary: '#6b7280',
        },
        footer: 'Gracias por su confianza',
      },
    },
  },
  {
    id: 'pdf-professional',
    name: 'PDF Profesional',
    type: 'pdf',
    description: 'Formato corporativo estándar para empresas',
    category: 'professional',
    preview: {
      thumbnail: 'PDF corporativo con secciones bien definidas y branding profesional',
      colors: {
        primary: '#0f172a',
        secondary: '#475569',
        accent: '#2563eb',
      },
    },
    config: {
      pdfTemplate: {
        layout: 'default',
        colors: {
          primary: '#0f172a',
          secondary: '#475569',
        },
        footer: 'Términos y condiciones aplicables según acuerdo comercial',
      },
    },
  },
  {
    id: 'pdf-detailed',
    name: 'PDF Detallado',
    type: 'pdf',
    description: 'Formato completo con toda la información fiscal',
    category: 'detailed',
    preview: {
      thumbnail: 'PDF completo con múltiples secciones, desglose detallado y información fiscal',
      colors: {
        primary: '#111827',
        secondary: '#4b5563',
        accent: '#059669',
      },
    },
    config: {
      pdfTemplate: {
        layout: 'detailed',
        colors: {
          primary: '#111827',
          secondary: '#4b5563',
        },
        footer: 'Factura detallada con desglose completo. Todos los importes incluyen IVA según normativa vigente.',
      },
    },
  },
];

/**
 * Obtiene plantillas predefinidas por tipo
 */
export function getPredesignedTemplates(type?: 'invoice' | 'email' | 'pdf'): PredesignedTemplate[] {
  if (type) {
    return PREDESIGNED_TEMPLATES.filter(t => t.type === type);
  }
  return PREDESIGNED_TEMPLATES;
}

/**
 * Obtiene una plantilla predefinida por ID
 */
export function getPredesignedTemplate(id: string): PredesignedTemplate | undefined {
  return PREDESIGNED_TEMPLATES.find(t => t.id === id);
}

