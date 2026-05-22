import type { TeacherColorId } from '@academiaplaton/shared';

export interface Teacher {
  id: string;
  organizationId: string;
  centerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  color?: TeacherColorId;
  active: boolean;
  createdAt: string;
}
