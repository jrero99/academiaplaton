import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const mandateInclude = {
  students: { select: { id: true } },
} satisfies Prisma.SepaMandateInclude;

export const sepaRepo = {
  list(where: Prisma.SepaMandateWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.sepaMandate.findMany({
        where,
        skip,
        take,
        include: mandateInclude,
        orderBy: [{ createdAt: 'desc' }],
      }),
      prisma.sepaMandate.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.sepaMandate.findUnique({ where: { id }, include: mandateInclude });
  },

  findByReference(organizationId: string, reference: string) {
    return prisma.sepaMandate.findUnique({
      where: { organizationId_reference: { organizationId, reference } },
    });
  },

  create(data: Prisma.SepaMandateCreateInput) {
    return prisma.sepaMandate.create({ data, include: mandateInclude });
  },

  update(id: string, data: Prisma.SepaMandateUpdateInput) {
    return prisma.sepaMandate.update({ where: { id }, data, include: mandateInclude });
  },

  delete(id: string) {
    return prisma.sepaMandate.delete({ where: { id } });
  },

  assignStudent(mandateId: string, studentId: string) {
    return prisma.student.update({
      where: { id: studentId },
      data: { sepaMandateId: mandateId, paymentMethod: 'sepa' },
    });
  },

  unassignStudent(studentId: string) {
    return prisma.student.update({
      where: { id: studentId },
      data: { sepaMandateId: null },
    });
  },
};
