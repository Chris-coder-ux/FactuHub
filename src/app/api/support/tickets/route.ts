/**
 * Support Tickets API
 * Create and list support tickets
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import SupportTicket from '@/lib/models/SupportTicket';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import mongoose from 'mongoose';

const CreateTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  category: z.enum(['technical', 'billing', 'feature', 'bug', 'other']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  metadata: z.object({
    relatedInvoiceId: z.string().optional(),
    relatedFeature: z.string().optional(),
  }).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { session, companyId } = await requireCompanyContext();
    const searchParams = request.nextUrl.searchParams;
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') as string | null;
    const category = searchParams.get('category') as string | null;
    
    const query: any = { companyId };
    
    // Filtrar por usuario si no es admin
    const userRole = session.user.role;
    if (userRole !== 'admin' && userRole !== 'owner') {
      query.userId = session.user.id;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (category) {
      query.category = category;
    }
    
    const tickets = await SupportTicket.find(query)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();
    
    const total = await SupportTicket.countDocuments(query);
    
    return NextResponse.json({
      data: tickets,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error('Failed to fetch support tickets', error);
    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { session, companyId } = await requireCompanyContext();
    const body = await request.json();
    
    const validated = CreateTicketSchema.parse(body);
    
    // Obtener IP y User-Agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Generar ticketNumber antes de crear
    let ticketNumber: string | undefined;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const count = await SupportTicket.countDocuments() || 0;
      const candidateNumber = `TKT-${String(count + 1).padStart(6, '0')}`;
      
      // Verificar que no existe
      const exists = await SupportTicket.findOne({ ticketNumber: candidateNumber });
      if (!exists) {
        ticketNumber = candidateNumber;
        break;
      }
      
      attempts++;
      // Pequeño delay para evitar race conditions
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Fallback si falla la generación
    if (!ticketNumber) {
      ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;
    }
    
    // Convertir IDs a ObjectId y crear ticket
    const ticket = await SupportTicket.create({
      ticketNumber,
      companyId: new mongoose.Types.ObjectId(companyId),
      userId: new mongoose.Types.ObjectId(session.user.id),
      subject: validated.subject,
      description: validated.description,
      category: validated.category || 'other',
      priority: validated.priority || 'medium',
      status: 'open',
      messages: [{
        userId: new mongoose.Types.ObjectId(session.user.id),
        message: validated.description,
        createdAt: new Date(),
      }],
      metadata: {
        ...validated.metadata,
        ipAddress,
        userAgent,
        ...(validated.metadata?.relatedInvoiceId && {
          relatedInvoiceId: new mongoose.Types.ObjectId(validated.metadata.relatedInvoiceId),
        }),
      },
    });
    
    logger.info('Support ticket created', { 
      ticketId: ticket._id, 
      ticketNumber: ticket.ticketNumber 
    });
    
    return NextResponse.json(
      { 
        data: ticket,
        message: 'Support ticket created successfully' 
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Ticket validation error', { error: error.issues });
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    
    // Log error details for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('Failed to create support ticket', { 
      error: errorMessage,
      stack: errorStack,
      errorObject: error 
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to create support ticket',
        message: errorMessage,
        // Only include details in development
        ...(process.env.NODE_ENV === 'development' && { details: errorStack })
      },
      { status: 500 }
    );
  }
}

