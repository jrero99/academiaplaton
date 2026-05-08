import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    lead: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { leadsService } from './leads.service.js';
import { AppError } from '../../lib/AppError.js';
import { prisma } from '../../lib/prisma.js';

describe('leadsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getById', () => {
    it('should throw NOT_FOUND when lead does not exist', async () => {
      vi.mocked(prisma.lead.findUnique).mockResolvedValue(null);

      await expect(leadsService.getById('missing-id')).rejects.toBeInstanceOf(AppError);
    });
  });
});
