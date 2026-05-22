import { z } from 'zod';

export const PlatformModule = z.enum(['crm', 'billing', 'scheduling', 'communications']);
export type PlatformModule = z.infer<typeof PlatformModule>;

// UserRole y UserMembership se han movido a users.ts (roles múltiples).
// Se re-exportan desde index.ts a través de users.ts.

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Hex color must be #RRGGBB');
const slug = z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/, 'Invalid slug');

export const OrganizationBrandingSchema = z.object({
  logoUrl: z.string().url().max(500).optional(),
  primaryColor: hexColor.optional(),
  accentColor: hexColor.optional(),
});
export type OrganizationBranding = z.infer<typeof OrganizationBrandingSchema>;

export const OrganizationCreateSchema = z.object({
  slug,
  name: z.string().min(1).max(160),
  branding: OrganizationBrandingSchema.optional(),
  enabledModules: z.array(PlatformModule).min(1).default(['crm']),
});
export type OrganizationCreate = z.infer<typeof OrganizationCreateSchema>;

export const OrganizationUpdateSchema = OrganizationCreateSchema.partial();
export type OrganizationUpdate = z.infer<typeof OrganizationUpdateSchema>;

export const OrganizationDtoSchema = z.object({
  id: z.string().uuid(),
  slug,
  name: z.string(),
  branding: OrganizationBrandingSchema,
  enabledModules: z.array(PlatformModule),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type OrganizationDto = z.infer<typeof OrganizationDtoSchema>;

// UserMembership ha sido movido a users.ts con soporte de roles múltiples.
