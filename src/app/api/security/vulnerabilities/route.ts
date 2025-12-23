import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyContext } from '@/lib/auth';
import { requireCompanyPermission } from '@/lib/company-rbac';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { logger } from '@/lib/logger';

const execAsync = promisify(exec);

interface VulnerabilityResult {
  success: boolean;
  timestamp: string;
  npmAudit?: {
    vulnerabilities: number;
    critical: number;
    high: number;
    moderate: number;
    low: number;
    summary: string;
  };
  error?: string;
}

/**
 * GET /api/security/vulnerabilities
 * Get vulnerability scan results
 */
export async function GET(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();

    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageSettings'
    );

    // Try to read audit results file if it exists (from CI/CD)
    const auditResultsPath = join(process.cwd(), 'security-audit-results.json');
    let npmAuditData: any = null;

    if (existsSync(auditResultsPath)) {
      try {
        const fileContent = await readFile(auditResultsPath, 'utf-8');
        npmAuditData = JSON.parse(fileContent);
      } catch (error) {
        logger.warn('Could not read security audit results file', { error });
      }
    }

    // If no file exists, try to run npm audit (only in development or if explicitly allowed)
    if (!npmAuditData && (process.env.NODE_ENV === 'development' || process.env.ALLOW_RUNTIME_AUDIT === 'true')) {
      try {
        const { stdout, stderr } = await execAsync('npm audit --json --audit-level=moderate', {
          cwd: process.cwd(),
          timeout: 30000, // 30 seconds timeout
        });

        if (stdout) {
          npmAuditData = JSON.parse(stdout);
        }
      } catch (error: any) {
        // npm audit exits with non-zero code if vulnerabilities found
        if (error.stdout) {
          try {
            npmAuditData = JSON.parse(error.stdout);
          } catch {
            logger.warn('Could not parse npm audit output', { error });
          }
        }
      }
    }

    // Parse npm audit results
    let vulnerabilities = {
      vulnerabilities: 0,
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      summary: 'No se encontraron vulnerabilidades',
    };

    if (npmAuditData) {
      const vulns = npmAuditData.vulnerabilities || {};
      const vulnCount = Object.keys(vulns).length;

      let critical = 0;
      let high = 0;
      let moderate = 0;
      let low = 0;

      for (const vuln of Object.values(vulns) as any[]) {
        if (vuln.severity === 'critical') critical++;
        else if (vuln.severity === 'high') high++;
        else if (vuln.severity === 'moderate') moderate++;
        else if (vuln.severity === 'low') low++;
      }

      vulnerabilities = {
        vulnerabilities: vulnCount,
        critical,
        high,
        moderate,
        low,
        summary: vulnCount === 0
          ? 'No se encontraron vulnerabilidades'
          : `${vulnCount} vulnerabilidades encontradas (${critical} críticas, ${high} altas, ${moderate} moderadas, ${low} bajas)`,
      };
    }

    const result: VulnerabilityResult = {
      success: true,
      timestamp: new Date().toISOString(),
      npmAudit: vulnerabilities,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error('Get vulnerabilities error', error);

    const { isPermissionError, handlePermissionError } = await import('@/lib/api-error-handler');
    if (isPermissionError(error)) {
      return handlePermissionError(error);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security/vulnerabilities
 * Trigger vulnerability scan
 */
export async function POST(request: NextRequest) {
  try {
    const { session, companyId } = await requireCompanyContext();

    await requireCompanyPermission(
      session.user.id,
      companyId,
      'canManageSettings'
    );

    // Only allow in development or if explicitly enabled
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_RUNTIME_AUDIT !== 'true') {
      return NextResponse.json(
        {
          error: 'Runtime vulnerability scans are disabled in production for security reasons. Use CI/CD workflows instead.',
        },
        { status: 403 }
      );
    }

    try {
      const { stdout, stderr } = await execAsync('npm audit --json --audit-level=moderate', {
        cwd: process.cwd(),
        timeout: 30000,
      });

      let npmAuditData: any = null;
      if (stdout) {
        npmAuditData = JSON.parse(stdout);
      }

      // Parse results
      const vulns = npmAuditData?.vulnerabilities || {};
      const vulnCount = Object.keys(vulns).length;

      let critical = 0;
      let high = 0;
      let moderate = 0;
      let low = 0;

      for (const vuln of Object.values(vulns) as any[]) {
        if (vuln.severity === 'critical') critical++;
        else if (vuln.severity === 'high') high++;
        else if (vuln.severity === 'moderate') moderate++;
        else if (vuln.severity === 'low') low++;
      }

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        npmAudit: {
          vulnerabilities: vulnCount,
          critical,
          high,
          moderate,
          low,
          summary: vulnCount === 0
            ? 'No se encontraron vulnerabilidades'
            : `${vulnCount} vulnerabilidades encontradas (${critical} críticas, ${high} altas, ${moderate} moderadas, ${low} bajas)`,
        },
      });
    } catch (error: any) {
      // npm audit exits with non-zero if vulnerabilities found
      if (error.stdout) {
        try {
          const npmAuditData = JSON.parse(error.stdout);
          const vulns = npmAuditData.vulnerabilities || {};
          const vulnCount = Object.keys(vulns).length;

          let critical = 0;
          let high = 0;
          let moderate = 0;
          let low = 0;

          for (const vuln of Object.values(vulns) as any[]) {
            if (vuln.severity === 'critical') critical++;
            else if (vuln.severity === 'high') high++;
            else if (vuln.severity === 'moderate') moderate++;
            else if (vuln.severity === 'low') low++;
          }

          return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            npmAudit: {
              vulnerabilities: vulnCount,
              critical,
              high,
              moderate,
              low,
              summary: `${vulnCount} vulnerabilidades encontradas (${critical} críticas, ${high} altas, ${moderate} moderadas, ${low} bajas)`,
            },
          });
        } catch (parseError) {
          logger.error('Could not parse npm audit output', { error, parseError });
          return NextResponse.json(
            {
              success: false,
              error: 'Could not parse audit results',
            },
            { status: 500 }
          );
        }
      }

      throw error;
    }
  } catch (error: any) {
    logger.error('Vulnerability scan error', error);

    const { isPermissionError, handlePermissionError } = await import('@/lib/api-error-handler');
    if (isPermissionError(error)) {
      return handlePermissionError(error);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

