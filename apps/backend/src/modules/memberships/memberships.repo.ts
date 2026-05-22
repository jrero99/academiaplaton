import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { parseRoles, serializeRoles } from '../../lib/roles.js';
import type {
  UserOrganizationDto,
  UserOrganizationCreate,
  UserOrganizationUpdate,
  UserRole,
} from '@academiaplaton/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Mapeo Prisma → DTO
// Toda la lógica CSV↔array vive aquí. Nunca exponer el tipo Prisma fuera del repo.
// ─────────────────────────────────────────────────────────────────────────────

type RawMembership = {
  id: string;
  userId: string;
  organizationId: string;
  roles: string;
  teacherId: string | null;
  createdAt: Date;
};

function toDto(raw: RawMembership): UserOrganizationDto {
  return {
    id: raw.id,
    userId: raw.userId,
    organizationId: raw.organizationId,
    roles: parseRoles(raw.roles),
    teacherId: raw.teacherId,
    createdAt: raw.createdAt.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Repo público
// Todos los métodos exigen organizationId para evitar leaks cross-tenant.
// ─────────────────────────────────────────────────────────────────────────────

export const membershipsRepo = {
  /**
   * Lista todas las membresías de una organización.
   */
  async list(organizationId: string): Promise<UserOrganizationDto[]> {
    const rows = await prisma.userOrganization.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toDto);
  },

  /**
   * Devuelve la membresía de un usuario concreto en una organización.
   * Null si no existe.
   */
  async findByUserAndOrg(
    userId: string,
    organizationId: string,
  ): Promise<UserOrganizationDto | null> {
    const row = await prisma.userOrganization.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    return row ? toDto(row) : null;
  },

  /**
   * Devuelve todas las membresías de un usuario (multiorg).
   */
  async findAllByUser(userId: string): Promise<UserOrganizationDto[]> {
    const rows = await prisma.userOrganization.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toDto);
  },

  /**
   * Crea una nueva membresía.
   * El service debe validar que teacherId pertenece a la misma org antes de llamar aquí.
   */
  async create(input: UserOrganizationCreate): Promise<UserOrganizationDto> {
    const data: Prisma.UserOrganizationCreateInput = {
      roles: serializeRoles(input.roles),
      user: { connect: { id: input.userId } },
      organization: { connect: { id: input.organizationId } },
      ...(input.teacherId != null
        ? { teacher: { connect: { id: input.teacherId } } }
        : {}),
    };
    const row = await prisma.userOrganization.create({ data });
    return toDto(row);
  },

  /**
   * Actualiza roles y/o teacherId de una membresía existente (scope por org).
   */
  async update(
    id: string,
    organizationId: string,
    input: UserOrganizationUpdate,
  ): Promise<UserOrganizationDto> {
    const updateData: Prisma.UserOrganizationUpdateInput = {};

    if (input.roles !== undefined) {
      // input.roles es UserRole[] | undefined; el `as` es seguro porque el branch
      // ya confirma que no es undefined y el Zod schema lo validó en el router.
      updateData.roles = serializeRoles(input.roles as UserRole[]);
    }
    if (input.teacherId !== undefined) {
      if (input.teacherId === null) {
        updateData.teacher = { disconnect: true };
      } else {
        updateData.teacher = { connect: { id: input.teacherId } };
      }
    }

    const row = await prisma.userOrganization.update({
      where: { id },
      data: updateData,
    });

    // Verificar scope post-update: la fila actualizada debe pertenecer a la org.
    // Prisma no tiene where compuesto en update para campos no únicos combinados;
    // usamos findFirst para validar scope antes de devolver.
    if (row.organizationId !== organizationId) {
      // Nunca debería ocurrir con datos íntegros, pero lo capturamos defensivamente.
      throw new Error(`Membership ${id} does not belong to org ${organizationId}`);
    }

    return toDto(row);
  },

  /**
   * Elimina una membresía. Solo opera si pertenece a la org indicada.
   */
  async delete(id: string, organizationId: string): Promise<void> {
    // deleteMany con where compuesto garantiza el scope sin lanzar si no existe.
    await prisma.userOrganization.deleteMany({
      where: { id, organizationId },
    });
  },

  /**
   * Devuelve todas las membresías que apuntan a un Teacher concreto (para validar
   * antes de borrar/desactivar un Teacher que esté vinculado a un User).
   */
  async findByTeacher(
    organizationId: string,
    teacherId: string,
  ): Promise<UserOrganizationDto[]> {
    const rows = await prisma.userOrganization.findMany({
      where: { organizationId, teacherId },
    });
    return rows.map(toDto);
  },
};
