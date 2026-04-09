import { prisma } from "@/lib/prisma";

interface AuditLogInput {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

export async function createAuditLog(input: AuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        details: input.details,
        ipAddress: input.ipAddress,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

export const AuditActions = {
  REPORT_CREATE: "REPORT_CREATE",
  REPORT_UPDATE: "REPORT_UPDATE",
  REPORT_DELETE: "REPORT_DELETE",
  USER_LOGIN: "USER_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
  USER_CREATE: "USER_CREATE",
  USER_UPDATE: "USER_UPDATE",
  USER_DELETE: "USER_DELETE",
  USER_ROLE_CHANGE: "USER_ROLE_CHANGE",
  SETTINGS_UPDATE: "SETTINGS_UPDATE",
  REPORT_PUBLISH: "REPORT_PUBLISH",
  REPORT_UNPUBLISH: "REPORT_UNPUBLISH",
  REPORT_LOCK: "REPORT_LOCK",
  REPORT_UNLOCK: "REPORT_UNLOCK",
  OUTBREAK_CREATE: "OUTBREAK_CREATE",
  OUTBREAK_UPDATE: "OUTBREAK_UPDATE",
  FORM_FIELD_CREATE: "FORM_FIELD_CREATE",
  FORM_FIELD_UPDATE: "FORM_FIELD_UPDATE",
  DATA_CLEAN: "DATA_CLEAN",
  BULK_UPLOAD: "BULK_UPLOAD",
  CSV_IMPORT: "CSV_IMPORT",
} as const;

export type AuditAction = typeof AuditActions[keyof typeof AuditActions];