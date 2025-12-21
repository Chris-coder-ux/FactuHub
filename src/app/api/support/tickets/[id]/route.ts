/**
 * Support Ticket Detail API
 * Get, update, and add messages to a specific ticket
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import SupportTicket from '@/lib/models/SupportTicket';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import mongoose from 'mongoose';

const AddMessageSchema = z.object({
  message: z.string().min(1).max(5000),
  attachments: z.array(z.string()).optional(),
});

const UpdateTicketSchema = z.object({
  status: z.enum(['open', 'in-progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().optional(),
  resolutionNotes: z.string().max(2000).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, companyId } = await requireCompanyContext();
    const ticketId = params.id;

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return NextResponse.json(
        { error: 'Invalid ticket ID' },
        { status: 400 }
      );
    }

    const ticket = await SupportTicket.findOne({
      _id: ticketId,
      companyId,
    })
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .populate('messages.userId', 'name email')
      .lean();

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Verificar permisos: solo el usuario que creó el ticket o admins pueden verlo
    const userRole = session.user.role;
    if (
      userRole !== 'admin' &&
      userRole !== 'owner' &&
      ticket.userId._id.toString() !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: ticket });
  } catch (error) {
    logger.error('Failed to fetch ticket', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, companyId } = await requireCompanyContext();
    const ticketId = params.id;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return NextResponse.json(
        { error: 'Invalid ticket ID' },
        { status: 400 }
      );
    }

    const validated = UpdateTicketSchema.parse(body);
    const userRole = session.user.role;

    // Solo admins pueden actualizar tickets
    if (userRole !== 'admin' && userRole !== 'owner') {
      return NextResponse.json(
        { error: 'Unauthorized: Only admins can update tickets' },
        { status: 403 }
      );
    }

    const updateData: any = { ...validated };

    // Si se marca como resuelto, agregar fecha de resolución
    if (validated.status === 'resolved' && !validated.resolutionNotes) {
      updateData.resolvedAt = new Date();
    }

    // Si se cierra, agregar fecha de cierre
    if (validated.status === 'closed') {
      updateData.closedAt = new Date();
    }

    const ticket = await SupportTicket.findOneAndUpdate(
      {
        _id: ticketId,
        companyId,
      },
      { $set: updateData },
      { new: true }
    )
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .lean();

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    logger.info('Ticket updated', { ticketId, updatedBy: session.user.id });

    return NextResponse.json({ data: ticket });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Failed to update ticket', error);
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, companyId } = await requireCompanyContext();
    const ticketId = params.id;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return NextResponse.json(
        { error: 'Invalid ticket ID' },
        { status: 400 }
      );
    }

    const validated = AddMessageSchema.parse(body);

    const ticket = await SupportTicket.findOne({
      _id: ticketId,
      companyId,
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Verificar permisos
    const userRole = session.user.role;
    if (
      userRole !== 'admin' &&
      userRole !== 'owner' &&
      ticket.userId.toString() !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Agregar mensaje
    ticket.messages.push({
      userId: new mongoose.Types.ObjectId(session.user.id),
      message: validated.message,
      attachments: validated.attachments || [],
      createdAt: new Date(),
    });

    // Si el ticket estaba cerrado y se agrega un mensaje, reabrirlo
    if (ticket.status === 'closed') {
      ticket.status = 'open';
      ticket.closedAt = undefined;
    }

    await ticket.save();

    const updatedTicket = await SupportTicket.findById(ticketId)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .populate('messages.userId', 'name email')
      .lean();

    logger.info('Message added to ticket', {
      ticketId,
      userId: session.user.id,
    });

    return NextResponse.json({ data: updatedTicket });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Failed to add message to ticket', error);
    return NextResponse.json(
      { error: 'Failed to add message' },
      { status: 500 }
    );
  }
}

