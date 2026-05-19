import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export const centersRepo = {
  list(where: Prisma.CenterWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.center.findMany({
        where,
        skip,
        take,
        orderBy: [{ name: 'asc' }],
      }),
      prisma.center.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.center.findUnique({ where: { id } });
  },

  findBySlug(organizationId: string, slug: string) {
    return prisma.center.findUnique({
      where: { organizationId_slug: { organizationId, slug } },
    });
  },

  create(data: Prisma.CenterCreateInput) {
    return prisma.center.create({ data });
  },

  update(id: string, data: Prisma.CenterUpdateInput) {
    return prisma.center.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.center.delete({ where: { id } });
  },

  countStudents(centerId: string) {
    return prisma.student.count({ where: { centerId } });
  },

  countTeachers(centerId: string) {
    return prisma.teacher.count({ where: { centerId } });
  },
};
