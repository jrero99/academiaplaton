import { z } from 'zod';

export const LeadStatus = z.enum([
  'new',
  'contacted',
  'visit_scheduled',
  'trial_class',
  'converted',
  'lost',
]);
export type LeadStatus = z.infer<typeof LeadStatus>;

export const LeadSource = z.enum([
  'web',
  'referral',
  'instagram',
  'phone',
  'walk_in',
  'other',
]);
export type LeadSource = z.infer<typeof LeadSource>;

const phoneRegex = /^[+]?[0-9\s-]{7,20}$/;

export const LeadCreateSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(120),
  email: z.string().email().max(160).optional(),
  phone: z.string().regex(phoneRegex).optional(),
  source: LeadSource,
  status: LeadStatus.default('new'),
  notes: z.string().max(2000).optional(),
  interestedCourse: z.string().max(120).optional(),
});
export type LeadCreate = z.infer<typeof LeadCreateSchema>;

export const LeadUpdateSchema = LeadCreateSchema.partial();
export type LeadUpdate = z.infer<typeof LeadUpdateSchema>;

export const LeadDtoSchema = LeadCreateSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type LeadDto = z.infer<typeof LeadDtoSchema>;

export const LeadFiltersSchema = z.object({
  status: LeadStatus.optional(),
  source: LeadSource.optional(),
  search: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type LeadFilters = z.infer<typeof LeadFiltersSchema>;
