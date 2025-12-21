import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import User from '@/lib/models/User';
import Settings from '@/lib/models/Settings';
import { getFiscalCalendar } from '@/lib/fiscal/forecasting';
import FiscalProjection from '@/lib/models/FiscalProjection';
import { createCompanyFilter } from '@/lib/mongodb-helpers';
import { differenceInDays, isPast, isToday } from 'date-fns';
import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Cron job to send fiscal reminders
 * Should be called daily to check for upcoming deadlines
 * 
 * Usage: GET /api/cron/fiscal-reminders?secret=CRON_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${env.CRON_SECRET}`;
    
    if (!env.CRON_SECRET || authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const currentYear = new Date().getFullYear();
    const calendarDeadlines = await getFiscalCalendar(currentYear);

    // Get all active users with companies
    const users = await User.find({}).lean();
    let totalRemindersSent = 0;
    const results: Array<{ userId: string; email: string; remindersSent: number }> = [];

    for (const user of users) {
      try {
        // Get user's settings (simplified - in real app, you'd query Company model)
        const settings = await Settings.findOne({ userId: user._id });
        if (!settings || !user.email || !settings.fiscalRemindersEnabled) continue;

        const companyId = settings.companyId;
        if (!companyId) continue;

        // Get projections for this user/company
        const projections = await FiscalProjection.find(
          createCompanyFilter(companyId.toString(), {
            userId: user._id,
            year: currentYear,
          })
        ).lean();

        const now = new Date();
        let userRemindersSent = 0;

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

          // Determine if reminder should be sent
          const reminderDays = settings.fiscalReminderDays || [30, 14, 7, 1];
          const shouldSend = reminderDays.includes(daysUntil);

          if (shouldSend && process.env.SENDGRID_API_KEY) {
            try {
              const status = isPast(dueDate) && !isToday(dueDate) 
                ? 'overdue' 
                : daysUntil <= 7 
                  ? 'due-soon' 
                  : 'upcoming';

              await sendFiscalReminderEmail(
                user.email!,
                user.name || 'Usuario',
                {
                  title: `IVA Trimestre ${calendarDeadline.quarter}`,
                  dueDate,
                  daysUntil,
                  status,
                },
                settings
              );
              userRemindersSent++;
              logger.info(`Fiscal reminder sent to ${user.email} for IVA Q${calendarDeadline.quarter}`);
            } catch (error) {
              logger.error(`Failed to send reminder to ${user.email}`, error);
            }
          }
        }

        if (userRemindersSent > 0) {
          totalRemindersSent += userRemindersSent;
          results.push({
            userId: user._id.toString(),
            email: user.email!,
            remindersSent: userRemindersSent,
          });
        }
      } catch (error) {
        logger.error(`Error processing reminders for user ${user._id}`, error);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalRemindersSent,
      usersNotified: results.length,
      details: results,
    });
  } catch (error) {
    logger.error('Fiscal reminders cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
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

