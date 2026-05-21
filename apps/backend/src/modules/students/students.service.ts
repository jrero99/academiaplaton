import { Prisma, type Guardian, type Student } from '@prisma/client';
import type {
  StudentCreate,
  StudentDto,
  StudentFilters,
  StudentUpdate,
} from '@academiaplaton/shared';
import { AppError } from '../../lib/AppError.js';
import { prisma } from '../../lib/prisma.js';
import { studentsRepo } from './students.repo.js';

type StudentWithGuardians = Student & { guardians: Guardian[] };

function toDto(s: StudentWithGuardians): StudentDto {
  return {
    id: s.id,
    organizationId: s.organizationId,
    centerId: s.centerId,
    firstName: s.firstName,
    lastName: s.lastName,
    birthDate: s.birthDate.toISOString().slice(0, 10),
    email: s.email ?? undefined,
    phone: s.phone ?? undefined,
    address: s.address ?? undefined,
    notes: s.notes ?? undefined,
    monthlyFee: s.monthlyFee ? Number(s.monthlyFee) : undefined,
    taxId: s.taxId ?? undefined,
    billingName: s.billingName ?? undefined,
    billingTaxId: s.billingTaxId ?? undefined,
    billingAddress: s.billingAddress ?? undefined,
    billingEmail: s.billingEmail ?? undefined,
    paymentMethod: s.paymentMethod,
    sepaMandateId: s.sepaMandateId ?? undefined,
    fromLeadId: s.fromLeadId ?? undefined,
    guardians: s.guardians.map((g) => ({
      firstName: g.firstName,
      lastName: g.lastName,
      relationship: g.relationship,
      phone: g.phone,
      email: g.email ?? undefined,
    })),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

async function assertCenterBelongsToOrg(organizationId: string, centerId: string) {
  const center = await prisma.center.findUnique({ where: { id: centerId } });
  if (!center || center.organizationId !== organizationId) {
    throw AppError.notFound('Center');
  }
}

async function assertMandateBelongsToOrg(organizationId: string, mandateId: string) {
  const mandate = await prisma.sepaMandate.findUnique({ where: { id: mandateId } });
  if (!mandate || mandate.organizationId !== organizationId) {
    throw AppError.notFound('SepaMandate');
  }
}

export const studentsService = {
  async list(organizationId: string, filters: StudentFilters) {
    const where = {
      organizationId,
      ...(filters.centerId && { centerId: filters.centerId }),
      ...(filters.search && {
        OR: [
          { firstName: { contains: filters.search } },
          { lastName: { contains: filters.search } },
          { email: { contains: filters.search } },
        ],
      }),
    };
    const skip = (filters.page - 1) * filters.pageSize;
    const [rows, total] = await studentsRepo.list(where, skip, filters.pageSize);
    return {
      items: rows.map(toDto),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  },

  async getById(organizationId: string, id: string): Promise<StudentDto> {
    const found = await studentsRepo.findById(id);
    if (!found || found.organizationId !== organizationId) throw AppError.notFound('Student');
    return toDto(found);
  },

  async create(organizationId: string, input: StudentCreate): Promise<StudentDto> {
    await assertCenterBelongsToOrg(organizationId, input.centerId);
    if (input.sepaMandateId) {
      await assertMandateBelongsToOrg(organizationId, input.sepaMandateId);
    }
    const {
      guardians,
      fromLeadId,
      centerId,
      sepaMandateId,
      monthlyFee,
      groupId: _groupId,
      ...rest
    } = input;
    const created = await studentsRepo.create({
      ...rest,
      birthDate: new Date(input.birthDate),
      ...(monthlyFee !== undefined && { monthlyFee: new Prisma.Decimal(monthlyFee) }),
      organization: { connect: { id: organizationId } },
      center: { connect: { id: centerId } },
      ...(fromLeadId && { fromLead: { connect: { id: fromLeadId } } }),
      ...(sepaMandateId && { sepaMandate: { connect: { id: sepaMandateId } } }),
      guardians: { create: guardians },
    });
    return toDto(created);
  },

  async update(organizationId: string, id: string, input: StudentUpdate): Promise<StudentDto> {
    const exists = await studentsRepo.findById(id);
    if (!exists || exists.organizationId !== organizationId) throw AppError.notFound('Student');
    if (input.centerId && input.centerId !== exists.centerId) {
      await assertCenterBelongsToOrg(organizationId, input.centerId);
    }
    if (input.sepaMandateId && input.sepaMandateId !== exists.sepaMandateId) {
      await assertMandateBelongsToOrg(organizationId, input.sepaMandateId);
    }
    const {
      guardians,
      fromLeadId: _fromLeadId,
      centerId,
      sepaMandateId,
      monthlyFee,
      groupId: _groupId,
      ...rest
    } = input;
    const updated = await studentsRepo.update(id, {
      ...rest,
      ...(input.birthDate && { birthDate: new Date(input.birthDate) }),
      ...(monthlyFee !== undefined && { monthlyFee: new Prisma.Decimal(monthlyFee) }),
      ...(centerId && { center: { connect: { id: centerId } } }),
      ...('sepaMandateId' in input && {
        sepaMandate: sepaMandateId ? { connect: { id: sepaMandateId } } : { disconnect: true },
      }),
      ...(guardians && {
        guardians: { deleteMany: {}, create: guardians },
      }),
    });
    return toDto(updated);
  },

  async delete(organizationId: string, id: string): Promise<void> {
    const exists = await studentsRepo.findById(id);
    if (!exists || exists.organizationId !== organizationId) throw AppError.notFound('Student');
    await studentsRepo.delete(id);
  },
};
