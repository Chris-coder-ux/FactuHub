/* eslint-env node */
/* global process */
import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
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

