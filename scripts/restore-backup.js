const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

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
];

const DELETE_ORDER = [...MODEL_NAMES].reverse();

const MODEL_DATE_FIELDS = {
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

async function restoreBackup(filePath) {
  if (!filePath) {
    console.error('Usage: node scripts/restore-backup.js <path-to-backup.json>');
    process.exit(1);
  }

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Backup file not found at: ${resolvedPath}`);
    process.exit(1);
  }

  console.log(`[Backup Restore] Reading backup file: ${resolvedPath}`);
  const t0 = Date.now();
  const backup = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

  if (!backup.version || !backup.platform || !backup.data) {
    console.error('Invalid backup file: missing version, platform, or data fields');
    process.exit(1);
  }

  console.log(`[Backup Restore] Valid backup (${backup.platform} v${backup.version}), exported at ${backup.exportedAt}`);

  const parseDates = (modelName, records) => {
    const dateFields = MODEL_DATE_FIELDS[modelName] || [];
    if (dateFields.length === 0) return records;
    return records.map((record) => {
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

  await prisma.$transaction(
    async (tx) => {
      console.log('[Backup Restore] Deleting existing database records (child-first)...');
      for (const modelName of DELETE_ORDER) {
        const prop = modelName.charAt(0).toLowerCase() + modelName.slice(1);
        if (tx[prop]?.deleteMany) {
          await tx[prop].deleteMany({});
        }
      }
      console.log('[Backup Restore] Existing records cleared. Inserting new records...');

      const BATCH_SIZE = 1000;
      for (const modelName of MODEL_NAMES) {
        const rawRecords = backup.data[modelName] || [];
        if (!Array.isArray(rawRecords) || rawRecords.length === 0) continue;

        const records = parseDates(modelName, rawRecords);
        const prop = modelName.charAt(0).toLowerCase() + modelName.slice(1);

        if (tx[prop]?.createMany) {
          process.stdout.write(`  -> Inserting ${records.length} records into ${modelName}... `);
          const start = Date.now();
          for (let i = 0; i < records.length; i += BATCH_SIZE) {
            const batch = records.slice(i, i + BATCH_SIZE);
            await tx[prop].createMany({
              data: batch,
              skipDuplicates: true,
            });
          }
          console.log(`done (${Date.now() - start}ms)`);
        }
      }
    },
    {
      maxWait: 60000,
      timeout: 300000,
    }
  );

  console.log(`[Backup Restore] Database restored successfully in ${((Date.now() - t0) / 1000).toFixed(2)}s!`);
}

const targetFile = process.argv[2];
restoreBackup(targetFile)
  .catch((err) => {
    console.error('[Backup Restore] Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
