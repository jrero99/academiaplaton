import { z } from 'zod';

const phoneRegex = /^[+]?[0-9\s-]{7,20}$/;
const slug = z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/, 'Invalid slug');

export const CenterCreateSchema = z.object({
  slug,
  name: z.string().min(1).max(160),
  address: z.string().max(240).optional(),
  phone: z.string().regex(phoneRegex).optional(),
  email: z.string().email().max(160).optional(),
  active: z.boolean().default(true),
});
export type CenterCreate = z.infer<typeof CenterCreateSchema>;

export const CenterUpdateSchema = CenterCreateSchema.partial();
export type CenterUpdate = z.infer<typeof CenterUpdateSchema>;

export const CenterDtoSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  slug,
  name: z.string(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CenterDto = z.infer<typeof CenterDtoSchema>;

export const CenterFiltersSchema = z.object({
  search: z.string().max(120).optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export type CenterFilters = z.infer<typeof CenterFiltersSchema>;
