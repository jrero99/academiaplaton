import type { Teacher } from '@prisma/client';
import {
  TEACHER_COLOR_PALETTE,
  type TeacherColorId,
  type TeacherCreate,
  type TeacherDto,
  type TeacherFilters,
  type TeacherUpdate,
} from '@academiaplaton/shared';
import { AppError } from '../../lib/AppError.js';
import { prisma } from '../../lib/prisma.js';
import { teachersRepo } from './teachers.repo.js';

function toDto(t: Teacher): TeacherDto {
  return {
    id: t.id,
    organizationId: t.organizationId,
    centerId: t.centerId,
    firstName: t.firstName,
    lastName: t.lastName,
    email: t.email,
    phone: t.phone ?? undefined,
    color: (t.color as TeacherColorId | null) ?? undefined,
    active: t.active,
    notes: t.notes ?? undefined,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

async function assertCenterBelongsToOrg(organizationId: string, centerId: string) {
  const center = await prisma.center.findUnique({ where: { id: centerId } });
  if (!center || center.organizationId !== organizationId) {
    throw AppError.notFound('Center');
  }
}

async function assertColorAvailable(
  centerId: string,
  color: TeacherColorId,
  excludeTeacherId?: string,
) {
  const existing = await teachersRepo.findByCenterAndColor(centerId, color);
  if (existing && existing.id !== excludeTeacherId) {
    const label = TEACHER_COLOR_PALETTE[color]?.label ?? color;
    throw AppError.conflict(
      `El color "${label}" ya está asignado a otro profesor de este centro`,
    );
  }
}

export const teachersService = {
  async list(organizationId: string, filters: TeacherFilters) {
    const where = {
      organizationId,
      ...(filters.centerId && { centerId: filters.centerId }),
      ...(filters.active !== undefined && { active: filters.active }),
      ...(filters.search && {
        OR: [
          { firstName: { contains: filters.search } },
          { lastName: { contains: filters.search } },
          { email: { contains: filters.search } },
        ],
      }),
    };
    const skip = (filters.page - 1) * filters.pageSize;
    const [rows, total] = await teachersRepo.list(where, skip, filters.pageSize);
    return {
      items: rows.map(toDto),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  },

  async getById(organizationId: string, id: string): Promise<TeacherDto> {
    const found = await teachersRepo.findById(id);
    if (!found || found.organizationId !== organizationId) throw AppError.notFound('Teacher');
    return toDto(found);
  },

  async create(organizationId: string, input: TeacherCreate): Promise<TeacherDto> {
    await assertCenterBelongsToOrg(organizationId, input.centerId);
    const dup = await teachersRepo.findByEmail(organizationId, input.email);
    if (dup) throw AppError.conflict(`Teacher email "${input.email}" already in use`);
    if (input.color) {
      await assertColorAvailable(input.centerId, input.color);
    }
    const { centerId, ...rest } = input;
    const created = await teachersRepo.create({
      ...rest,
      organization: { connect: { id: organizationId } },
      center: { connect: { id: centerId } },
    });
    return toDto(created);
  },

  async update(organizationId: string, id: string, input: TeacherUpdate): Promise<TeacherDto> {
    const existing = await teachersRepo.findById(id);
    if (!existing || existing.organizationId !== organizationId) throw AppError.notFound('Teacher');
    if (input.centerId && input.centerId !== existing.centerId) {
      await assertCenterBelongsToOrg(organizationId, input.centerId);
    }
    if (input.email && input.email !== existing.email) {
      const dup = await teachersRepo.findByEmail(organizationId, input.email);
      if (dup) throw AppError.conflict(`Teacher email "${input.email}" already in use`);
    }
    // Comprobar unicidad de color cuando cambia el color o el centro asociado.
    const targetCenterId = input.centerId ?? existing.centerId;
    const colorChanges = input.color !== undefined && input.color !== existing.color;
    const centerChanges = input.centerId !== undefined && input.centerId !== existing.centerId;
    if (input.color && (colorChanges || centerChanges)) {
      await assertColorAvailable(targetCenterId, input.color, id);
    }
    const { centerId, ...rest } = input;
    const updated = await teachersRepo.update(id, {
      ...rest,
      ...(centerId && { center: { connect: { id: centerId } } }),
    });
    return toDto(updated);
  },

  async delete(organizationId: string, id: string): Promise<void> {
    const existing = await teachersRepo.findById(id);
    if (!existing || existing.organizationId !== organizationId) throw AppError.notFound('Teacher');
    await teachersRepo.delete(id);
  },
};
