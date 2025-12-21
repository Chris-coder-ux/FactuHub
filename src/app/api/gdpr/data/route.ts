/**
 * GDPR Data Rights Endpoints
 * Implements Articles 15 (Access), 16 (Rectification), and 17 (Erasure) of GDPR
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { GDPRService } from '@/lib/services/gdpr-service';
import { logger } from '@/lib/logger';
import { ValidationError } from '@/lib/errors';
import { z } from 'zod';

const getClientIP = (request: NextRequest): string => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
};

const getUserAgent = (request: NextRequest): string => {
  return request.headers.get('user-agent') || 'unknown';
};

/**
 * GET /api/gdpr/data
 * Derecho de acceso (Art. 15 GDPR)
 * Returns all personal data associated with the user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const ipAddress = getClientIP(request);
    const userAgent = getUserAgent(request);

    // Record processing activity
    await GDPRService.recordProcessingActivity({
      userId: session.user.id,
      activityType: 'access',
      status: 'pending',
      ipAddress,
      userAgent,
    });

    // Get user data
    const userData = await GDPRService.getUserData(session.user.id, session.user.companyId);

    // Mark activity as completed
    await GDPRService.updateProcessingActivity(
      session.user.id,
      'access',
      'completed',
      { dataRetrieved: true }
    );

    return NextResponse.json({
      success: true,
      data: userData,
      message: 'Your personal data has been retrieved successfully',
    });
  } catch (error) {
    logger.error('GDPR data access error', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to retrieve personal data' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/gdpr/data
 * Derecho de rectificación (Art. 16 GDPR)
 * Allows users to update their personal data
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const ipAddress = getClientIP(request);
    const userAgent = getUserAgent(request);

    const updateSchema = z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        country: z.string().optional(),
      }).optional(),
    });

    const validated = updateSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validated.error.issues },
        { status: 400 }
      );
    }

    // Record processing activity
    await GDPRService.recordProcessingActivity({
      userId: session.user.id,
      activityType: 'rectification',
      status: 'pending',
      ipAddress,
      userAgent,
      metadata: { fields: Object.keys(validated.data) },
    });

    // Update user data (simplified - in production, update all related entities)
    const { default: User } = await import('@/lib/models/User');
    const { default: dbConnect } = await import('@/lib/mongodb');
    await dbConnect();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (validated.data.name) user.name = validated.data.name;
    if (validated.data.email) user.email = validated.data.email;
    await user.save();

    // Mark activity as completed
    await GDPRService.updateProcessingActivity(
      session.user.id,
      'rectification',
      'completed',
      { fieldsUpdated: Object.keys(validated.data) }
    );

    return NextResponse.json({
      success: true,
      message: 'Your personal data has been updated successfully',
    });
  } catch (error) {
    logger.error('GDPR data rectification error', error);

    return NextResponse.json(
      { error: 'Failed to update personal data' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/gdpr/data
 * Derecho al olvido (Art. 17 GDPR)
 * Deletes all personal data associated with the user
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAuth();
    const ipAddress = getClientIP(request);
    const userAgent = getUserAgent(request);

    // Record processing activity
    await GDPRService.recordProcessingActivity({
      userId: session.user.id,
      activityType: 'erasure',
      status: 'pending',
      ipAddress,
      userAgent,
    });

    // Delete user data
    await GDPRService.deleteUserData(session.user.id, session.user.companyId);

    // Mark activity as completed
    await GDPRService.updateProcessingActivity(
      session.user.id,
      'erasure',
      'completed',
      { dataDeleted: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Your personal data has been deleted successfully. You will be logged out.',
    });
  } catch (error) {
    logger.error('GDPR data erasure error', error);

    return NextResponse.json(
      { error: 'Failed to delete personal data' },
      { status: 500 }
    );
  }
}

