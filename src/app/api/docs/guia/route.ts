/* eslint-env node */
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    // eslint-disable-next-line no-undef
    const filePath = path.join(process.cwd(), 'docs', 'api', 'GUIA_COMPLETA.md');
    const content = await fs.readFile(filePath, 'utf-8');
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    logger.error('Error reading guide', { error });
    return NextResponse.json(
      { error: 'No se pudo cargar la guía completa' },
      { status: 500 }
    );
  }
}

