import { Role } from "@prisma/client";

export const PERMISSIONS = {
  // Reports
  'report:create':    ['ADMIN' as Role, 'EDITOR' as Role, 'USER' as Role],
  'report:read:own':  ['ADMIN' as Role, 'EDITOR' as Role, 'USER' as Role, 'VIEWER' as Role],
  'report:read:all':  ['ADMIN' as Role, 'EDITOR' as Role, 'VIEWER' as Role],
  'report:update:own':['ADMIN' as Role, 'EDITOR' as Role, 'USER' as Role],
  'report:update:any':['ADMIN' as Role],
  'report:delete':    ['ADMIN' as Role],
  'report:lock':      ['ADMIN' as Role, 'EDITOR' as Role],
  'report:publish':   ['ADMIN' as Role, 'EDITOR' as Role],

  // Dashboard
  'dashboard:view':           ['ADMIN' as Role, 'EDITOR' as Role, 'USER' as Role, 'VIEWER' as Role],
  'dashboard:view:all':       ['ADMIN' as Role, 'EDITOR' as Role, 'VIEWER' as Role],
  'dashboard:view:scoped':    ['EDITOR' as Role], // Scoped by division/district
  'dashboard:export':         ['ADMIN' as Role, 'EDITOR' as Role, 'VIEWER' as Role],

  // Admin
  'user:manage':      ['ADMIN' as Role],
  'settings:manage':  ['ADMIN' as Role],
  'outbreak:manage':  ['ADMIN' as Role],
  'formfield:manage': ['ADMIN' as Role],
  'data:manage':      ['ADMIN' as Role, 'EDITOR' as Role],

  // Audit
  'audit:view':       ['ADMIN' as Role],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Checks if a role has a specific permission.
 */
export function hasPermission(role: Role | string, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission] as readonly string[];
  return allowedRoles.includes(role);
}

/**
 * Throws an error if the role does not have the specific permission.
 */
export function requirePermission(role: Role | string, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Unauthorized: Permission '${permission}' required for role '${role}'`);
  }
}

/**
 * Helper to check if a user can edit a report based on role and ownership.
 * @param userRole Role of the current user
 * @param isOwner Whether the user is the one who created the report
 * @param isLocked Whether the report is currently locked
 */
export function canEditReport(userRole: Role | string, isOwner: boolean, isLocked: boolean): boolean {
  if (userRole === 'ADMIN') return true;
  if (isLocked) return false;
  
  if (userRole === 'EDITOR') return true;
  if (userRole === 'USER' && isOwner) return true;
  
  return false;
}
