import {
  ErrorCodes,
  type GroupCreate,
  type GroupDto,
  type GroupFilters,
  type GroupUpdate,
} from '@academiaplaton/shared';
import { AppError } from '../../lib/AppError.js';
import { prisma } from '../../lib/prisma.js';
import { groupsRepo, type GroupWithStudents } from './groups.repo.js';

function toDto(g: GroupWithStudents): GroupDto {
  return {
    id: g.id,
    organizationId: g.organizationId,
    centerId: g.centerId,
    teacherId: g.teacherId,
    name: g.name,
    subject: g.subject ?? undefined,
    description: g.description ?? undefined,
    active: g.active,
    notes: g.notes ?? undefined,
    studentIds: g.students.map((s) => s.studentId),
    studentCount: g.students.length,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

async function assertCenterBelongsToOrg(organizationId: string, centerId: string) {
  const center = await prisma.center.findUnique({ where: { id: centerId } });
  if (!center || center.organizationId !== organizationId) {
    throw AppError.notFound('Center');
  }
}

async function assertTeacherBelongsToOrgAndCenter(
  organizationId: string,
  teacherId: string,
  centerId: string,
) {
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher || teacher.organizationId !== organizationId) {
    throw AppError.notFound('Teacher');
  }
  if (teacher.centerId !== centerId) {
    throw new AppError(400, ErrorCodes.VALIDATION,'Teacher does not belong to the target center');
  }
}

async function assertStudentsBelongToOrgAndCenter(
  organizationId: string,
  centerId: string,
  studentIds: string[],
) {
  if (studentIds.length === 0) return;
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, organizationId: true, centerId: true },
  });
  if (students.length !== studentIds.length) throw AppError.notFound('Student');
  for (const s of students) {
    if (s.organizationId !== organizationId) throw AppError.notFound('Student');
    if (s.centerId !== centerId) {
      throw new AppError(400, ErrorCodes.VALIDATION,`Student ${s.id} does not belong to the target center`);
    }
  }
}

export const groupsService = {
  async list(organizationId: string, filters: GroupFilters) {
    const where = {
      organizationId,
      ...(filters.centerId && { centerId: filters.centerId }),
      ...(filters.teacherId && { teacherId: filters.teacherId }),
      ...(filters.active !== undefined && { active: filters.active }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search } },
          { subject: { contains: filters.search } },
          { description: { contains: filters.search } },
        ],
      }),
    };
    const skip = (filters.page - 1) * filters.pageSize;
    const [rows, total] = await groupsRepo.list(where, skip, filters.pageSize);
    return {
      items: rows.map(toDto),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  },

  async getById(organizationId: string, id: string): Promise<GroupDto> {
    const found = await groupsRepo.findById(id);
    if (!found || found.organizationId !== organizationId) throw AppError.notFound('Group');
    return toDto(found);
  },

  async create(organizationId: string, input: GroupCreate): Promise<GroupDto> {
    await assertCenterBelongsToOrg(organizationId, input.centerId);
    await assertTeacherBelongsToOrgAndCenter(organizationId, input.teacherId, input.centerId);
    await assertStudentsBelongToOrgAndCenter(organizationId, input.centerId, input.studentIds);

    const dup = await groupsRepo.findByName(organizationId, input.centerId, input.name);
    if (dup) throw AppError.conflict(`Group "${input.name}" already exists in this center`);

    const { centerId, teacherId, studentIds, ...rest } = input;
    const created = await groupsRepo.create({
      ...rest,
      organization: { connect: { id: organizationId } },
      center: { connect: { id: centerId } },
      teacher: { connect: { id: teacherId } },
      ...(studentIds.length > 0 && {
        students: {
          create: studentIds.map((studentId) => ({ student: { connect: { id: studentId } } })),
        },
      }),
    });
    return toDto(created);
  },

  async update(organizationId: string, id: string, input: GroupUpdate): Promise<GroupDto> {
    const existing = await groupsRepo.findById(id);
    if (!existing || existing.organizationId !== organizationId) throw AppError.notFound('Group');

    const targetCenterId = input.centerId ?? existing.centerId;
    if (input.centerId && input.centerId !== existing.centerId) {
      await assertCenterBelongsToOrg(organizationId, input.centerId);
    }
    if (input.teacherId && input.teacherId !== existing.teacherId) {
      await assertTeacherBelongsToOrgAndCenter(organizationId, input.teacherId, targetCenterId);
    } else if (input.centerId && input.centerId !== existing.centerId) {
      // Si cambia el centro pero no el profesor, validar que el profe actual sigue siendo del nuevo centro
      await assertTeacherBelongsToOrgAndCenter(organizationId, existing.teacherId, targetCenterId);
    }
    if (input.studentIds !== undefined) {
      await assertStudentsBelongToOrgAndCenter(organizationId, targetCenterId, input.studentIds);
    }
    if (input.name && input.name !== existing.name) {
      const dup = await groupsRepo.findByName(organizationId, targetCenterId, input.name);
      if (dup) throw AppError.conflict(`Group "${input.name}" already exists in this center`);
    }

    const { centerId, teacherId, studentIds, ...rest } = input;
    await groupsRepo.update(id, {
      ...rest,
      ...(centerId && { center: { connect: { id: centerId } } }),
      ...(teacherId && { teacher: { connect: { id: teacherId } } }),
    });
    if (studentIds !== undefined) {
      await groupsRepo.replaceStudents(id, studentIds);
    }
    const fresh = await groupsRepo.findById(id);
    return toDto(fresh!);
  },

  async delete(organizationId: string, id: string): Promise<void> {
    const existing = await groupsRepo.findById(id);
    if (!existing || existing.organizationId !== organizationId) throw AppError.notFound('Group');
    await groupsRepo.delete(id);
  },

  async addStudents(organizationId: string, id: string, studentIds: string[]): Promise<GroupDto> {
    const existing = await groupsRepo.findById(id);
    if (!existing || existing.organizationId !== organizationId) throw AppError.notFound('Group');
    await assertStudentsBelongToOrgAndCenter(organizationId, existing.centerId, studentIds);
    await groupsRepo.addStudents(id, studentIds);
    const fresh = await groupsRepo.findById(id);
    return toDto(fresh!);
  },

  async removeStudent(organizationId: string, id: string, studentId: string): Promise<GroupDto> {
    const existing = await groupsRepo.findById(id);
    if (!existing || existing.organizationId !== organizationId) throw AppError.notFound('Group');
    await groupsRepo.removeStudent(id, studentId);
    const fresh = await groupsRepo.findById(id);
    return toDto(fresh!);
  },
};
