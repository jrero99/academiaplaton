import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const studentInclude = { guardians: true } satisfies Prisma.StudentInclude;

export const studentsRepo = {
  list(where: Prisma.StudentWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.student.findMany({
        where,
        skip,
        take,
        include: studentInclude,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      prisma.student.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.student.findUnique({ where: { id }, include: studentInclude });
  },

  create(data: Prisma.StudentCreateInput) {
    return prisma.student.create({ data, include: studentInclude });
  },

  update(id: string, data: Prisma.StudentUpdateInput) {
    return prisma.student.update({ where: { id }, data, include: studentInclude });
  },

  delete(id: string) {
    return prisma.student.delete({ where: { id } });
  },
};
