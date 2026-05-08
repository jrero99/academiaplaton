import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export const leadsRepo = {
  list(where: Prisma.LeadWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.lead.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.lead.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.lead.findUnique({ where: { id } });
  },

  create(data: Prisma.LeadCreateInput) {
    return prisma.lead.create({ data });
  },

  update(id: string, data: Prisma.LeadUpdateInput) {
    return prisma.lead.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.lead.delete({ where: { id } });
  },
};
