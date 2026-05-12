import type { Lead } from '@prisma/client';
import type { LeadCreate, LeadDto, LeadFilters, LeadUpdate } from '@academiaplaton/shared';
import { AppError } from '../../lib/AppError.js';
import { leadsRepo } from './leads.repo.js';

function toDto(lead: Lead): LeadDto {
  return {
    id: lead.id,
    organizationId: lead.organizationId,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email ?? undefined,
    phone: lead.phone ?? undefined,
    source: lead.source,
    status: lead.status,
    notes: lead.notes ?? undefined,
    interestedCourse: lead.interestedCourse ?? undefined,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export const leadsService = {
  async list(filters: LeadFilters): Promise<{ items: LeadDto[]; total: number; page: number; pageSize: number }> {
    const where = {
      ...(filters.status && { status: filters.status }),
      ...(filters.source && { source: filters.source }),
      ...(filters.search && {
        OR: [
          { firstName: { contains: filters.search } },
          { lastName: { contains: filters.search } },
          { email: { contains: filters.search } },
        ],
      }),
    };
    const skip = (filters.page - 1) * filters.pageSize;
    const [rows, total] = await leadsRepo.list(where, skip, filters.pageSize);
    return {
      items: rows.map(toDto),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  },

  async getById(id: string): Promise<LeadDto> {
    const lead = await leadsRepo.findById(id);
    if (!lead) throw AppError.notFound('Lead');
    return toDto(lead);
  },

  async create(input: LeadCreate): Promise<LeadDto> {
    const created = await leadsRepo.create(input);
    return toDto(created);
  },

  async update(id: string, input: LeadUpdate): Promise<LeadDto> {
    const exists = await leadsRepo.findById(id);
    if (!exists) throw AppError.notFound('Lead');
    const updated = await leadsRepo.update(id, input);
    return toDto(updated);
  },

  async delete(id: string): Promise<void> {
    const exists = await leadsRepo.findById(id);
    if (!exists) throw AppError.notFound('Lead');
    await leadsRepo.delete(id);
  },
};
