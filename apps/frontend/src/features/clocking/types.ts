export interface ClockEntry {
  id: string;
  organizationId: string;
  teacherId: string;
  clockIn: string;
  clockOut: string | null;
}
