import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import connectDB from '@/lib/mongodb';
import { getFiscalCalendar } from '@/lib/fiscal/forecasting';
import FiscalProjection from '@/lib/models/FiscalProjection';
import { createCompanyFilter } from '@/lib/mongodb-helpers';
import { differenceInDays, isPast, isToday } from 'date-fns';
import sgMail from '@sendgrid/mail';
import { logger } from '@/lib/logger';
import User from '@/lib/models/User';
import Settings from '@/lib/models/Settings';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface ReminderPreferences {
  emailEnabled: boolean;
  daysBeforeReminder: number[]; // e.g., [30, 14, 7, 1]
}

/**
 * GET /api/fiscal/reminders
 * Get upcoming deadlines that need reminders
 */
export async function GET(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();
    
    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canViewReports'
    );

    await connectDB();

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const action = searchParams.get('action'); // 'check' or 'send'

    // Get user and settings
    const user = await User.findById(session.user.id);
    const settings = await Settings.findOne(createCompanyFilter(companyId, { userId: session.user.id }));

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get fiscal calendar
    const calendarDeadlines = await getFiscalCalendar(year);
    const projections = await FiscalProjection.find(
      createCompanyFilter(companyId, {
        userId: session.user.id,
        year,
      })
    ).lean();

    const now = new Date();
    const reminders: Array<{
      deadlineId: string;
      title: string;
      dueDate: Date;
      daysUntil: number;
      status: 'upcoming' | 'due-soon' | 'overdue';
      shouldSend: boolean;
    }> = [];

    // Check each deadline
    for (const calendarDeadline of calendarDeadlines) {
      const dueDate = calendarDeadline.dueDate;
      const daysUntil = differenceInDays(dueDate, now);
      
      const projection = projections.find(
        p => p.type === 'iva' && p.quarter === calendarDeadline.quarter
      );

      // Skip if already completed
      if (projection?.actualAmount !== undefined && projection.actualAmount !== null) {
        continue;
      }

      let status: 'upcoming' | 'due-soon' | 'overdue';
      if (isPast(dueDate) && !isToday(dueDate)) {
        status = 'overdue';
      } else if (daysUntil <= 7 && daysUntil >= 0) {
        status = 'due-soon';
      } else {
        status = 'upcoming';
      }

      // Determine if reminder should be sent
      const reminderDays = settings?.fiscalReminderDays || [30, 14, 7, 1];
      const shouldSend = reminderDays.includes(daysUntil) || status === 'overdue' || status === 'due-soon';

      reminders.push({
        deadlineId: `iva-q${calendarDeadline.quarter}-${year}`,
        title: `IVA Trimestre ${calendarDeadline.quarter}`,
        dueDate,
        daysUntil,
        status,
        shouldSend,
      });
    }

    // If action is 'send', actually send the reminders
    if (action === 'send' && process.env.SENDGRID_API_KEY && user.email) {
      const remindersToSend = reminders.filter(r => r.shouldSend);
      
      for (const reminder of remindersToSend) {
        try {
          await sendFiscalReminderEmail(user.email, user.name || 'Usuario', reminder, settings);
          logger.info(`Fiscal reminder sent to ${user.email} for ${reminder.title}`);
        } catch (error) {
          logger.error(`Failed to send fiscal reminder to ${user.email}`, error);
        }
      }

      return NextResponse.json({
        success: true,
        remindersSent: remindersToSend.length,
        reminders,
      });
    }

    return NextResponse.json({ reminders });
  } catch (error: any) {
    logger.error('Error processing fiscal reminders', error);
    
    const { isPermissionError, handlePermissionError } = await import('@/lib/api-error-handler');
    if (isPermissionError(error)) {
      return handlePermissionError(error);
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function sendFiscalReminderEmail(
  email: string,
  userName: string,
  reminder: { title: string; dueDate: Date; daysUntil: number; status: string },
  settings: any
) {
  const companyName = settings?.companyName || 'Tu Empresa';
  const dueDateStr = reminder.dueDate.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const urgencyColor = reminder.status === 'overdue' ? '#ef4444' : reminder.status === 'due-soon' ? '#f59e0b' : '#3b82f6';
  const urgencyText = reminder.status === 'overdue' ? 'URGENTE - Vencido' : reminder.status === 'due-soon' ? 'Próximo a vencer' : 'Recordatorio';

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${urgencyColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .deadline-box { background: white; border-left: 4px solid ${urgencyColor}; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .button { display: inline-block; background: ${urgencyColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">${urgencyText}: ${reminder.title}</h1>
        </div>
        <div class="content">
          <p>Hola ${userName},</p>
          
          <p>Te recordamos que tienes una fecha límite fiscal próxima:</p>
          
          <div class="deadline-box">
            <h2 style="margin-top: 0; color: ${urgencyColor};">${reminder.title}</h2>
            <p><strong>Fecha límite:</strong> ${dueDateStr}</p>
            <p><strong>Días restantes:</strong> ${reminder.daysUntil > 0 ? reminder.daysUntil : 'Vencido'}</p>
            <p><strong>Descripción:</strong> Modelo 303 - Declaración trimestral de IVA</p>
          </div>
          
          ${reminder.status === 'overdue' ? '<p style="color: #ef4444; font-weight: bold;">⚠️ Esta declaración está vencida. Por favor, complétala lo antes posible.</p>' : ''}
          ${reminder.status === 'due-soon' ? '<p style="color: #f59e0b; font-weight: bold;">⏰ Esta declaración vence pronto. Asegúrate de tener todo listo.</p>' : ''}
          
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/fiscal" class="button">
            Ver Calendario Fiscal
          </a>
          
          <div class="footer">
            <p>Este es un recordatorio automático de ${companyName}.</p>
            <p>Puedes gestionar tus preferencias de recordatorios en la configuración de la aplicación.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@facturaly.com',
    subject: `${reminder.status === 'overdue' ? '⚠️ URGENTE: ' : ''}Recordatorio Fiscal: ${reminder.title}`,
    html: emailHtml,
  };

  await sgMail.send(msg);
}

