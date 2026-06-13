import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAuditLog, AuditActions } from '@/lib/audit';

const BACKUP_VERSION = '1.0';
const BACKUP_PLATFORM = 'measles-outbreak-monitoring';

// All model names in dependency order (parents first)
const MODEL_NAMES = [
  'FacilityType',
  'Disease',
  'Settings',
  'Indicator',
  'Facility',
  'User',
  'Outbreak',
  'EmailRecipient',
  'VerificationToken',
  'FormField',
  'SubmissionWindow',
  'BacklogSlot',
  'Report',
  'ReportFieldValue',
  'AuditLog',
] as const;

// Reverse order for deletion (children first)
const DELETE_ORDER = [...MODEL_NAMES].reverse();

/**
 * GET /api/admin/backup
 * Export full database as a downloadable JSON file.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all tables in parallel
    const [
      facilityTypes,
      diseases,
      settings,
      indicators,
      facilities,
      users,
      outbreaks,
      emailRecipients,
      verificationTokens,
      formFields,
      submissionWindows,
      backlogSlots,
      reports,
      reportFieldValues,
      auditLogs,
    ] = await Promise.all([
      prisma.facilityType.findMany(),
      prisma.disease.findMany(),
      prisma.settings.findMany(),
      prisma.indicator.findMany(),
      prisma.facility.findMany(),
      prisma.user.findMany(),
      prisma.outbreak.findMany(),
      prisma.emailRecipient.findMany(),
      prisma.verificationToken.findMany(),
      prisma.formField.findMany(),
      prisma.submissionWindow.findMany(),
      prisma.backlogSlot.findMany(),
      prisma.report.findMany(),
      prisma.reportFieldValue.findMany(),
      prisma.auditLog.findMany(),
    ]);

    const data: Record<string, any[]> = {
      FacilityType: facilityTypes,
      Disease: diseases,
      Settings: settings,
      Indicator: indicators,
      Facility: facilities,
      User: users,
      Outbreak: outbreaks,
      EmailRecipient: emailRecipients,
      VerificationToken: verificationTokens,
      FormField: formFields,
      SubmissionWindow: submissionWindows,
      BacklogSlot: backlogSlots,
      Report: reports,
      ReportFieldValue: reportFieldValues,
      AuditLog: auditLogs,
    };

    const counts: Record<string, number> = {};
    for (const [key, value] of Object.entries(data)) {
      counts[key] = value.length;
    }

    const backup = {
      version: BACKUP_VERSION,
      platform: BACKUP_PLATFORM,
      exportedAt: new Date().toISOString(),
      exportedBy: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      counts,
      data,
    };

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.BACKUP_EXPORT,
      entityType: 'System',
      details: { counts, exportedAt: backup.exportedAt },
    });

    const jsonStr = JSON.stringify(backup, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `backup-${BACKUP_PLATFORM}-${timestamp}.json`;

    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Backup export error:', error);
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
  }
}

/**
 * POST /api/admin/backup
 * Restore database from a previously exported backup JSON file.
 * Use ?preview=true to get a dry-run comparison without modifying data.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isPreview = searchParams.get('preview') === 'true';

    // Parse the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    let backup: any;
    try {
      const text = await file.text();
      backup = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON file' }, { status: 400 });
    }

    // Validate backup structure
    if (!backup.version || !backup.platform || !backup.data) {
      return NextResponse.json({ 
        error: 'Invalid backup file: missing version, platform, or data fields' 
      }, { status: 400 });
    }

    if (backup.platform !== BACKUP_PLATFORM) {
      return NextResponse.json({ 
        error: `Invalid platform: expected "${BACKUP_PLATFORM}", got "${backup.platform}"` 
      }, { status: 400 });
    }

    // Check that all expected model keys exist
    const missingModels = MODEL_NAMES.filter(name => !backup.data[name]);
    if (missingModels.length > 0) {
      return NextResponse.json({ 
        error: `Invalid backup: missing data for models: ${missingModels.join(', ')}` 
      }, { status: 400 });
    }

    // Compute incoming counts
    const incomingCounts: Record<string, number> = {};
    for (const name of MODEL_NAMES) {
      incomingCounts[name] = Array.isArray(backup.data[name]) ? backup.data[name].length : 0;
    }

    // Get current database counts for comparison
    const currentCounts: Record<string, number> = {};
    const [
      fc1, fc2, fc3, fc4, fc5, fc6, fc7, fc8, fc9, fc10, fc11, fc12, fc13, fc14, fc15,
    ] = await Promise.all([
      prisma.facilityType.count(),
      prisma.disease.count(),
      prisma.settings.count(),
      prisma.indicator.count(),
      prisma.facility.count(),
      prisma.user.count(),
      prisma.outbreak.count(),
      prisma.emailRecipient.count(),
      prisma.verificationToken.count(),
      prisma.formField.count(),
      prisma.submissionWindow.count(),
      prisma.backlogSlot.count(),
      prisma.report.count(),
      prisma.reportFieldValue.count(),
      prisma.auditLog.count(),
    ]);
    currentCounts['FacilityType'] = fc1;
    currentCounts['Disease'] = fc2;
    currentCounts['Settings'] = fc3;
    currentCounts['Indicator'] = fc4;
    currentCounts['Facility'] = fc5;
    currentCounts['User'] = fc6;
    currentCounts['Outbreak'] = fc7;
    currentCounts['EmailRecipient'] = fc8;
    currentCounts['VerificationToken'] = fc9;
    currentCounts['FormField'] = fc10;
    currentCounts['SubmissionWindow'] = fc11;
    currentCounts['BacklogSlot'] = fc12;
    currentCounts['Report'] = fc13;
    currentCounts['ReportFieldValue'] = fc14;
    currentCounts['AuditLog'] = fc15;

    // Preview mode: return comparison without modifying data
    if (isPreview) {
      return NextResponse.json({
        valid: true,
        version: backup.version,
        platform: backup.platform,
        exportedAt: backup.exportedAt,
        exportedBy: backup.exportedBy,
        incomingCounts,
        currentCounts,
      });
    }

    // Log the restore action BEFORE we wipe data
    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.BACKUP_RESTORE,
      entityType: 'System',
      details: {
        backupExportedAt: backup.exportedAt,
        backupExportedBy: backup.exportedBy,
        incomingCounts,
        currentCounts,
      },
    });

    // Helper to convert date strings back to Date objects
    const parseDates = (records: any[]) => {
      return records.map((record: any) => {
        const parsed = { ...record };
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
            parsed[key] = new Date(value);
          }
        }
        return parsed;
      });
    };

    // Execute full restore in a transaction
    await prisma.$transaction(async (tx) => {
      // Step 1: Delete all data in child-first order
      for (const modelName of DELETE_ORDER) {
        const model = (tx as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
        if (model?.deleteMany) {
          await model.deleteMany({});
        }
      }

      // Step 2: Re-insert data in parent-first order
      for (const modelName of MODEL_NAMES) {
        const records = parseDates(backup.data[modelName] || []);
        if (records.length === 0) continue;

        const model = (tx as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
        if (model?.createMany) {
          // createMany for bulk inserts
          await model.createMany({
            data: records,
            skipDuplicates: true,
          });
        }
      }
    }, {
      maxWait: 60000,
      timeout: 120000,
    });

    return NextResponse.json({
      success: true,
      message: 'Database restored successfully',
      restoredCounts: incomingCounts,
    });
  } catch (error) {
    console.error('Backup restore error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to restore backup' 
    }, { status: 500 });
  }
}
