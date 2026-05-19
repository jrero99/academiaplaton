import type { Group, GroupStudent, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export type GroupWithStudents = Group & { students: GroupStudent[] };

const groupInclude = { students: true } satisfies Prisma.GroupInclude;

export const groupsRepo = {
  list(where: Prisma.GroupWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.group.findMany({
        where,
        skip,
        take,
        include: groupInclude,
        orderBy: [{ name: 'asc' }],
      }),
      prisma.group.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.group.findUnique({ where: { id }, include: groupInclude });
  },

  findByName(organizationId: string, centerId: string, name: string) {
    return prisma.group.findUnique({
      where: { organizationId_centerId_name: { organizationId, centerId, name } },
    });
  },

  create(data: Prisma.GroupCreateInput) {
    return prisma.group.create({ data, include: groupInclude });
  },

  update(id: string, data: Prisma.GroupUpdateInput) {
    return prisma.group.update({ where: { id }, data, include: groupInclude });
  },

  delete(id: string) {
    return prisma.group.delete({ where: { id } });
  },

  replaceStudents(groupId: string, studentIds: string[]) {
    return prisma.$transaction([
      prisma.groupStudent.deleteMany({ where: { groupId } }),
      ...(studentIds.length > 0
        ? [
            prisma.groupStudent.createMany({
              data: studentIds.map((studentId) => ({ groupId, studentId })),
            }),
          ]
        : []),
    ]);
  },

  addStudents(groupId: string, studentIds: string[]) {
    return prisma.groupStudent.createMany({
      data: studentIds.map((studentId) => ({ groupId, studentId })),
      skipDuplicates: true,
    });
  },

  removeStudent(groupId: string, studentId: string) {
    return prisma.groupStudent.deleteMany({ where: { groupId, studentId } });
  },
};
