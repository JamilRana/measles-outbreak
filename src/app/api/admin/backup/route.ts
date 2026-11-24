import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAuditLog, AuditActions } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BACKUP_VERSION = '1.0';
const BACKUP_PLATFORM = 'measles-outbreak-monitoring';
const MAX_BACKUP_SIZE = 150 * 1024 * 1024; // 150MB

// Model date fields map for fast, memory-efficient date conversion
const MODEL_DATE_FIELDS: Record<string, string[]> = {
  FacilityType: ['createdAt', 'updatedAt'],
  Disease: ['createdAt', 'updatedAt'],
  Settings: ['createdAt', 'updatedAt'],
  Indicator: ['createdAt', 'updatedAt'],
  Facility: ['createdAt', 'updatedAt'],
  User: ['createdAt', 'updatedAt'],
  Outbreak: [
    'startDate',
    'endDate',
    'createdAt',
    'updatedAt',
    'backlogStartDate',
    'backlogEndDate',
  ],
  EmailRecipient: ['createdAt', 'updatedAt'],
  VerificationToken: ['expires'],
  FormField: ['activeFrom', 'activeTo', 'createdAt', 'updatedAt'],
  SubmissionWindow: ['periodStart', 'periodEnd', 'opensAt', 'closesAt', 'createdAt'],
  BacklogSlot: ['periodStart', 'periodEnd', 'opensAt', 'closesAt', 'createdAt'],
  Report: ['periodStart', 'periodEnd', 'lockedAt', 'publishedAt', 'createdAt', 'updatedAt'],
  ReportFieldValue: [],
  AuditLog: ['createdAt'],
};

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

    // File validation: Size limit (150MB) and extension
    if (file.size > MAX_BACKUP_SIZE) {
      return NextResponse.json({ error: 'Backup file exceeds maximum allowed size of 150MB' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      return NextResponse.json({ error: 'Invalid file format. Backup must be a .json file' }, { status: 400 });
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

    // Helper to convert date strings back to Date objects efficiently
    const parseDates = (modelName: string, records: any[]) => {
      const dateFields = MODEL_DATE_FIELDS[modelName] || [];
      if (dateFields.length === 0) return records;

      return records.map((record: any) => {
        const parsed = { ...record };
        for (const field of dateFields) {
          const val = parsed[field];
          if (typeof val === 'string' && val.length > 0) {
            parsed[field] = new Date(val);
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

      // Step 2: Re-insert data in parent-first order in safe batches (<65k parameters)
      const BATCH_SIZE = 1000;
      for (const modelName of MODEL_NAMES) {
        const rawRecords = backup.data[modelName] || [];
        if (!Array.isArray(rawRecords) || rawRecords.length === 0) continue;

        const records = parseDates(modelName, rawRecords);
        const model = (tx as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];

        if (model?.createMany) {
          for (let i = 0; i < records.length; i += BATCH_SIZE) {
            const batch = records.slice(i, i + BATCH_SIZE);
            await model.createMany({
              data: batch,
              skipDuplicates: true,
            });
          }
        }
      }
    }, {
      maxWait: 60000,
      timeout: 300000, // 5 minutes timeout for large datasets
    });

    // Invalidate all Redis caches post-restore
    try {
      const { invalidateByPattern } = await import('@/lib/redis');
      await invalidateByPattern('*');
    } catch (cacheErr) {
      console.warn('Failed to invalidate Redis cache post-restore:', cacheErr);
    }

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
