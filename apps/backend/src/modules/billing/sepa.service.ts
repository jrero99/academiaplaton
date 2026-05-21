import type { Prisma, SepaMandate } from '@prisma/client';
import type {
  SepaMandateCreate,
  SepaMandateDto,
  SepaMandateFilters,
  SepaMandateUpdate,
} from '@academiaplaton/shared';
import { AppError } from '../../lib/AppError.js';
import { prisma } from '../../lib/prisma.js';
import { sepaRepo } from './sepa.repo.js';

type SepaMandateWithStudents = SepaMandate & { students: { id: string }[] };

function toDto(m: SepaMandateWithStudents): SepaMandateDto {
  return {
    id: m.id,
    organizationId: m.organizationId,
    reference: m.reference,
    holderName: m.holderName,
    holderTaxId: m.holderTaxId,
    holderAddress: m.holderAddress ?? undefined,
    holderEmail: m.holderEmail ?? undefined,
    holderPhone: m.holderPhone ?? undefined,
    iban: m.iban,
    bic: m.bic ?? undefined,
    mandateType: m.mandateType,
    debitType: m.debitType,
    status: m.status,
    signedAt: m.signedAt.toISOString().slice(0, 10),
    revokedAt: m.revokedAt?.toISOString() ?? undefined,
    notes: m.notes ?? undefined,
    studentIds: m.students.map((s) => s.id),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

async function assertStudentBelongsToOrg(organizationId: string, studentId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.organizationId !== organizationId) {
    throw AppError.notFound('Student');
  }
}

export const sepaService = {
  async list(organizationId: string, filters: SepaMandateFilters) {
    const where: Prisma.SepaMandateWhereInput = {
      organizationId,
      ...(filters.status && { status: filters.status }),
      ...(filters.search && {
        OR: [
          { reference: { contains: filters.search } },
          { holderName: { contains: filters.search } },
          { holderTaxId: { contains: filters.search } },
          { iban: { contains: filters.search } },
        ],
      }),
    };
    const skip = (filters.page - 1) * filters.pageSize;
    const [rows, total] = await sepaRepo.list(where, skip, filters.pageSize);
    return {
      items: rows.map(toDto),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  },

  async getById(organizationId: string, id: string): Promise<SepaMandateDto> {
    const found = await sepaRepo.findById(id);
    if (!found || found.organizationId !== organizationId) throw AppError.notFound('SepaMandate');
    return toDto(found);
  },

  async create(organizationId: string, input: SepaMandateCreate): Promise<SepaMandateDto> {
    const dup = await sepaRepo.findByReference(organizationId, input.reference);
    if (dup) throw AppError.conflict(`Mandate reference "${input.reference}" already in use`);
    const created = await sepaRepo.create({
      ...input,
      signedAt: new Date(input.signedAt),
      organization: { connect: { id: organizationId } },
    });
    return toDto(created);
  },

  async update(
    organizationId: string,
    id: string,
    input: SepaMandateUpdate,
  ): Promise<SepaMandateDto> {
    const existing = await sepaRepo.findById(id);
    if (!existing || existing.organizationId !== organizationId) {
      throw AppError.notFound('SepaMandate');
    }
    if (input.reference && input.reference !== existing.reference) {
      const dup = await sepaRepo.findByReference(organizationId, input.reference);
      if (dup) throw AppError.conflict(`Mandate reference "${input.reference}" already in use`);
    }
    const data: Prisma.SepaMandateUpdateInput = {
      ...input,
      ...(input.signedAt && { signedAt: new Date(input.signedAt) }),
      // Revocar: cuando el status pasa a "revoked", marcamos revokedAt.
      // Si vuelve a activo desde revoked, limpiamos revokedAt.
      ...(input.status === 'revoked' && existing.status !== 'revoked' && {
        revokedAt: new Date(),
      }),
      ...(input.status && input.status !== 'revoked' && existing.status === 'revoked' && {
        revokedAt: null,
      }),
    };
    const updated = await sepaRepo.update(id, data);
    return toDto(updated);
  },

  async delete(organizationId: string, id: string): Promise<void> {
    const existing = await sepaRepo.findById(id);
    if (!existing || existing.organizationId !== organizationId) {
      throw AppError.notFound('SepaMandate');
    }
    if (existing.students.length > 0) {
      throw AppError.conflict(
        `Mandate has ${existing.students.length} student(s) assigned; unassign them before deleting`,
      );
    }
    await sepaRepo.delete(id);
  },

  async assignStudent(
    organizationId: string,
    mandateId: string,
    studentId: string,
  ): Promise<SepaMandateDto> {
    const mandate = await sepaRepo.findById(mandateId);
    if (!mandate || mandate.organizationId !== organizationId) {
      throw AppError.notFound('SepaMandate');
    }
    if (mandate.status !== 'active') {
      throw AppError.conflict(`Mandate is ${mandate.status}; only active mandates can be assigned`);
    }
    await assertStudentBelongsToOrg(organizationId, studentId);
    await sepaRepo.assignStudent(mandateId, studentId);
    const refreshed = await sepaRepo.findById(mandateId);
    return toDto(refreshed!);
  },

  async unassignStudent(
    organizationId: string,
    mandateId: string,
    studentId: string,
  ): Promise<SepaMandateDto> {
    const mandate = await sepaRepo.findById(mandateId);
    if (!mandate || mandate.organizationId !== organizationId) {
      throw AppError.notFound('SepaMandate');
    }
    await assertStudentBelongsToOrg(organizationId, studentId);
    await sepaRepo.unassignStudent(studentId);
    const refreshed = await sepaRepo.findById(mandateId);
    return toDto(refreshed!);
  },
};
