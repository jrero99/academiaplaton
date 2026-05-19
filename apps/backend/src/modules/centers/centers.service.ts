import type { Center } from '@prisma/client';
import type {
  CenterCreate,
  CenterDto,
  CenterFilters,
  CenterUpdate,
} from '@academiaplaton/shared';
import { AppError } from '../../lib/AppError.js';
import { centersRepo } from './centers.repo.js';

function toDto(c: Center): CenterDto {
  return {
    id: c.id,
    organizationId: c.organizationId,
    slug: c.slug,
    name: c.name,
    address: c.address ?? undefined,
    phone: c.phone ?? undefined,
    email: c.email ?? undefined,
    active: c.active,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export const centersService = {
  async list(organizationId: string, filters: CenterFilters) {
    const where = {
      organizationId,
      ...(filters.active !== undefined && { active: filters.active }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search } },
          { slug: { contains: filters.search } },
        ],
      }),
    };
    const skip = (filters.page - 1) * filters.pageSize;
    const [rows, total] = await centersRepo.list(where, skip, filters.pageSize);
    return {
      items: rows.map(toDto),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  },

  async getById(organizationId: string, id: string): Promise<CenterDto> {
    const found = await centersRepo.findById(id);
    if (!found || found.organizationId !== organizationId) throw AppError.notFound('Center');
    return toDto(found);
  },

  async create(organizationId: string, input: CenterCreate): Promise<CenterDto> {
    const dup = await centersRepo.findBySlug(organizationId, input.slug);
    if (dup) throw AppError.conflict(`Center slug "${input.slug}" already in use`);
    const created = await centersRepo.create({
      ...input,
      organization: { connect: { id: organizationId } },
    });
    return toDto(created);
  },

  async update(organizationId: string, id: string, input: CenterUpdate): Promise<CenterDto> {
    const existing = await centersRepo.findById(id);
    if (!existing || existing.organizationId !== organizationId) throw AppError.notFound('Center');
    if (input.slug && input.slug !== existing.slug) {
      const dup = await centersRepo.findBySlug(organizationId, input.slug);
      if (dup) throw AppError.conflict(`Center slug "${input.slug}" already in use`);
    }
    const updated = await centersRepo.update(id, input);
    return toDto(updated);
  },

  async delete(organizationId: string, id: string): Promise<void> {
    const existing = await centersRepo.findById(id);
    if (!existing || existing.organizationId !== organizationId) throw AppError.notFound('Center');
    const [students, teachers] = await Promise.all([
      centersRepo.countStudents(id),
      centersRepo.countTeachers(id),
    ]);
    if (students > 0 || teachers > 0) {
      throw AppError.conflict(
        `Center has ${students} student(s) and ${teachers} teacher(s); reassign them before deleting`,
      );
    }
    await centersRepo.delete(id);
  },
};
