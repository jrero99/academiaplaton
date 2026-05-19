import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export const sessionsRepo = {
  listInRange(
    organizationId: string,
    centerId: string,
    startInclusive: Date,
    endExclusive: Date,
    extra: { groupId?: string; teacherId?: string },
  ) {
    return prisma.session.findMany({
      where: {
        organizationId,
        centerId,
        date: { gte: startInclusive, lt: endExclusive },
        ...(extra.groupId && { groupId: extra.groupId }),
        ...(extra.teacherId && { teacherId: extra.teacherId }),
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  },

  // Devuelve sesiones del mismo día y org que solapen con la franja
  // [startTime, endTime) por grupo o profesor — excluyendo opcionalmente
  // el id de la sesión que estamos editando.
  findConflicts(args: {
    organizationId: string;
    date: Date;
    startTime: string;
    endTime: string;
    groupId: string;
    teacherId: string;
    excludeId?: string;
  }) {
    return prisma.session.findMany({
      where: {
        organizationId: args.organizationId,
        date: args.date,
        ...(args.excludeId && { NOT: { id: args.excludeId } }),
        OR: [{ groupId: args.groupId }, { teacherId: args.teacherId }],
        // Solapamiento: existing.startTime < new.endTime AND existing.endTime > new.startTime
        AND: [
          { startTime: { lt: args.endTime } },
          { endTime: { gt: args.startTime } },
        ],
      },
    });
  },

  findById(id: string) {
    return prisma.session.findUnique({ where: { id } });
  },

  create(data: Prisma.SessionCreateInput) {
    return prisma.session.create({ data });
  },

  update(id: string, data: Prisma.SessionUpdateInput) {
    return prisma.session.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.session.delete({ where: { id } });
  },
};
