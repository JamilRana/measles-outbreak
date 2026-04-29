import { z } from 'zod';
import { Schemas } from './api';

export const CreateOutbreakSchema = z.object({
  name: Schemas.text(3),
  diseaseId: Schemas.id,
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'CONTAINED', 'CLOSED']).default('DRAFT'),
  isActive: z.boolean().default(true),
  allowBacklogReporting: z.boolean().default(false),
  backlogStartDate: z.string().optional().nullable(),
  backlogEndDate: z.string().optional().nullable(),
  reportingFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('DAILY'),
  submissionCutoff: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  editDeadline: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  publishTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  targetDivisions: z.array(z.string()).default([]),
  targetDistricts: z.array(z.string()).default([]),
  targetFacilityTypeIds: z.array(z.string()).default([]),
});

export type CreateOutbreakInput = z.infer<typeof CreateOutbreakSchema>;
