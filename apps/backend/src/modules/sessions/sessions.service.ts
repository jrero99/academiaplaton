import type { Session } from '@prisma/client';
import {
  ErrorCodes,
  type SessionCreate,
  type SessionDto,
  type SessionFilters,
  type SessionUpdate,
} from '@academiaplaton/shared';
import { AppError } from '../../lib/AppError.js';
import { prisma } from '../../lib/prisma.js';
import { sessionsRepo } from './sessions.repo.js';

function toDto(s: Session): SessionDto {
  return {
    id: s.id,
    organizationId: s.organizationId,
    centerId: s.centerId,
    groupId: s.groupId,
    teacherId: s.teacherId,
    date: s.date.toISOString().slice(0, 10),
    startTime: s.startTime,
    endTime: s.endTime,
    notes: s.notes ?? undefined,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function parseDateOnly(iso: string): Date {
  // YYYY-MM-DD a Date UTC a las 00:00 — alineado con cómo Prisma maneja @db.Date
  return new Date(`${iso}T00:00:00.000Z`);
}

async function assertCenterBelongsToOrg(organizationId: string, centerId: string) {
  const center = await prisma.center.findUnique({ where: { id: centerId } });
  if (!center || center.organizationId !== organizationId) {
    throw AppError.notFound('Center');
  }
}

async function loadGroupForOrgAndCenter(
  organizationId: string,
  groupId: string,
  centerId: string,
) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group || group.organizationId !== organizationId) throw AppError.notFound('Group');
  if (group.centerId !== centerId) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION,
      'Group does not belong to the target center',
    );
  }
  return group;
}

async function assertNoConflict(args: {
  organizationId: string;
  date: Date;
  startTime: string;
  endTime: string;
  groupId: string;
  teacherId: string;
  excludeId?: string;
}) {
  const conflicts = await sessionsRepo.findConflicts(args);
  if (conflicts.length === 0) return;
  const c = conflicts[0]!;
  const reason = c.groupId === args.groupId ? 'grupo' : 'profesor';
  throw AppError.conflict(
    `La sesión solapa con otra del mismo ${reason} (${c.startTime}–${c.endTime})`,
  );
}

export const sessionsService = {
  async list(organizationId: string, filters: SessionFilters): Promise<SessionDto[]> {
    await assertCenterBelongsToOrg(organizationId, filters.centerId);
    const weekStart = parseDateOnly(filters.weekStart);
    const weekEnd = addDays(weekStart, 7); // exclusivo
    const rows = await sessionsRepo.listInRange(
      organizationId,
      filters.centerId,
      weekStart,
      weekEnd,
      { groupId: filters.groupId, teacherId: filters.teacherId },
    );
    return rows.map(toDto);
  },

  async getById(organizationId: string, id: string): Promise<SessionDto> {
    const found = await sessionsRepo.findById(id);
    if (!found || found.organizationId !== organizationId) throw AppError.notFound('Session');
    return toDto(found);
  },

  async create(organizationId: string, input: SessionCreate): Promise<SessionDto> {
    await assertCenterBelongsToOrg(organizationId, input.centerId);
    const group = await loadGroupForOrgAndCenter(organizationId, input.groupId, input.centerId);

    const date = parseDateOnly(input.date);
    await assertNoConflict({
      organizationId,
      date,
      startTime: input.startTime,
      endTime: input.endTime,
      groupId: input.groupId,
      teacherId: group.teacherId,
    });

    const created = await sessionsRepo.create({
      date,
      startTime: input.startTime,
      endTime: input.endTime,
      notes: input.notes,
      organization: { connect: { id: organizationId } },
      center: { connect: { id: input.centerId } },
      group: { connect: { id: input.groupId } },
      teacher: { connect: { id: group.teacherId } },
    });
    return toDto(created);
  },

  async update(
    organizationId: string,
    id: string,
    input: SessionUpdate,
  ): Promise<SessionDto> {
    const existing = await sessionsRepo.findById(id);
    if (!existing || existing.organizationId !== organizationId) throw AppError.notFound('Session');

    const targetCenterId = input.centerId ?? existing.centerId;
    if (input.centerId && input.centerId !== existing.centerId) {
      await assertCenterBelongsToOrg(organizationId, input.centerId);
    }

    let teacherId = existing.teacherId;
    let groupId = existing.groupId;
    if (input.groupId && input.groupId !== existing.groupId) {
      const group = await loadGroupForOrgAndCenter(organizationId, input.groupId, targetCenterId);
      groupId = group.id;
      teacherId = group.teacherId;
    } else if (input.centerId && input.centerId !== existing.centerId) {
      // mismo grupo pero cambia el centro: revalidar
      await loadGroupForOrgAndCenter(organizationId, existing.groupId, targetCenterId);
    }

    const date = input.date ? parseDateOnly(input.date) : existing.date;
    const startTime = input.startTime ?? existing.startTime;
    const endTime = input.endTime ?? existing.endTime;
    if (startTime >= endTime) {
      throw new AppError(400, ErrorCodes.VALIDATION, 'endTime debe ser posterior a startTime');
    }

    await assertNoConflict({
      organizationId,
      date,
      startTime,
      endTime,
      groupId,
      teacherId,
      excludeId: id,
    });

    const updated = await sessionsRepo.update(id, {
      date,
      startTime,
      endTime,
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.centerId && { center: { connect: { id: input.centerId } } }),
      ...(input.groupId && {
        group: { connect: { id: input.groupId } },
        teacher: { connect: { id: teacherId } },
      }),
    });
    return toDto(updated);
  },

  async delete(organizationId: string, id: string): Promise<void> {
    const existing = await sessionsRepo.findById(id);
    if (!existing || existing.organizationId !== organizationId) throw AppError.notFound('Session');
    await sessionsRepo.delete(id);
  },
};
