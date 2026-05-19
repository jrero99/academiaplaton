export interface Teacher {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  active: boolean;
  createdAt: string;
}
