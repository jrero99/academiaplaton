import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// UserRole — valores canónicos del sistema.
// `staff` queda eliminado; se reemplaza por `center_manager`.
// El enum Prisma en schema.prisma debe mantenerse sincronizado.
// ─────────────────────────────────────────────────────────────────────────────

export const UserRoleSchema = z.enum(['admin', 'center_manager', 'teacher']);
export type UserRole = z.infer<typeof UserRoleSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// UserOrganization — membresía de un User en una Organization.
// `roles` es un array (min 1, sin duplicados). En MySQL se almacena como CSV;
// el mapeo CSV↔array vive exclusivamente en el repo del backend.
// `teacherId` es opcional: solo presente cuando el usuario también actúa como
// profesor y tiene un registro Teacher asociado en la misma organización.
// ─────────────────────────────────────────────────────────────────────────────

// Helper de validación compartido: sin duplicados
const uniqueRoles = (arr: UserRole[]): boolean =>
  new Set(arr).size === arr.length;

export const UserOrganizationCreateSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  roles: z
    .array(UserRoleSchema)
    .min(1, 'At least one role is required')
    .refine(uniqueRoles, 'Roles must not contain duplicates'),
  teacherId: z.string().uuid().nullable().optional(),
});
export type UserOrganizationCreate = z.infer<typeof UserOrganizationCreateSchema>;

export const UserOrganizationUpdateSchema = z.object({
  roles: z
    .array(UserRoleSchema)
    .min(1, 'At least one role is required')
    .refine(uniqueRoles, 'Roles must not contain duplicates')
    .optional(),
  teacherId: z.string().uuid().nullable().optional(),
});
export type UserOrganizationUpdate = z.infer<typeof UserOrganizationUpdateSchema>;

export const UserOrganizationDtoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  roles: z
    .array(UserRoleSchema)
    .min(1)
    .refine(uniqueRoles, 'Roles must not contain duplicates'),
  teacherId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});
export type UserOrganizationDto = z.infer<typeof UserOrganizationDtoSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Permission helpers — sin lógica de negocio, solo consultas sobre roles.
// Convención de jerarquía: admin puede todo; center_manager puede lo que
// puede teacher (en términos de permisos declarados); teacher solo teacher.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Comprueba si el array de roles contiene el rol indicado.
 * Uso directo; para jerarquía usar `canAct`.
 */
export function hasRole(roles: UserRole[], role: UserRole): boolean {
  return roles.includes(role);
}

/**
 * Comprueba si la membresía puede actuar con el `required` dado,
 * respetando jerarquía:
 *   admin      → puede actuar como cualquier rol
 *   center_manager → puede actuar como teacher (si además tiene teacherId)
 *   teacher    → solo como teacher
 *
 * Para permisos de gestión (sin restricción de teacherId) usa `hasRole`.
 */
export function canAct(roles: UserRole[], required: UserRole): boolean {
  if (roles.includes('admin')) return true;
  if (required === 'teacher' && roles.includes('center_manager')) return true;
  return roles.includes(required);
}

/**
 * Comprueba si la membresía puede actuar como profesor en sesiones/grupos.
 * Requisitos: rol `teacher` (o `admin`, o `center_manager`) Y `teacherId` no nulo.
 */
export function canActAsTeacher(membership: {
  roles: UserRole[];
  teacherId: string | null;
}): boolean {
  return membership.teacherId !== null && canAct(membership.roles, 'teacher');
}

// ─────────────────────────────────────────────────────────────────────────────
// UserMembership — resumen de membresía que viajará en el payload de auth
// (reemplaza el anterior `UserMembership` de organization.ts con `role` singular)
// ─────────────────────────────────────────────────────────────────────────────

export const UserMembershipSchema = z.object({
  organizationId: z.string().uuid(),
  organizationSlug: z.string(),
  organizationName: z.string(),
  roles: z
    .array(UserRoleSchema)
    .min(1)
    .refine(uniqueRoles, 'Roles must not contain duplicates'),
  teacherId: z.string().uuid().nullable(),
});
export type UserMembership = z.infer<typeof UserMembershipSchema>;
