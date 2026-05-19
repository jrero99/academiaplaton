import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export const teachersRepo = {
  list(where: Prisma.TeacherWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.teacher.findMany({
        where,
        skip,
        take,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      prisma.teacher.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.teacher.findUnique({ where: { id } });
  },

  findByEmail(organizationId: string, email: string) {
    return prisma.teacher.findUnique({
      where: { organizationId_email: { organizationId, email } },
    });
  },

  create(data: Prisma.TeacherCreateInput) {
    return prisma.teacher.create({ data });
  },

  update(id: string, data: Prisma.TeacherUpdateInput) {
    return prisma.teacher.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.teacher.delete({ where: { id } });
  },
};
