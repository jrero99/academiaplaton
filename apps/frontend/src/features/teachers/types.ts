export interface Teacher {
  id: string;
  organizationId: string;
  centerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  active: boolean;
  createdAt: string;
}
