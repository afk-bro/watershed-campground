/**
 * Unit tests for database helper utilities
 *
 * Tests behavioral contract:
 * - Org-scoped query builders always include organization_id filter
 * - Resource verification checks both ID and organization ownership
 * - Insert/update/delete operations enforce organization scoping
 * - Multi-tenant security is never bypassed
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  withOrg,
  verifyOrgResource,
  insertWithOrg,
  updateWithOrg,
  deleteWithOrg,
} from '@/lib/db-helpers';

// Create chainable mock query builder
const createMockQueryBuilder = () => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return builder;
};

// Mock supabaseAdmin
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import { supabaseAdmin } from '@/lib/supabase-admin';

describe('db-helpers', () => {
  const TEST_ORG_ID = 'org_123';
  const TEST_TABLE = 'reservations';
  const TEST_ID = 'res_456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withOrg', () => {
    it('should create query builder with organization filter', () => {
      const mockBuilder = createMockQueryBuilder();
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      withOrg(TEST_TABLE, TEST_ORG_ID);

      expect(supabaseAdmin.from).toHaveBeenCalledWith(TEST_TABLE);
      expect(mockBuilder.select).toHaveBeenCalledWith('*');
      expect(mockBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_ORG_ID);
    });

    it('should work with different table names', () => {
      const mockBuilder = createMockQueryBuilder();
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      withOrg('campsites', TEST_ORG_ID);

      expect(supabaseAdmin.from).toHaveBeenCalledWith('campsites');
      expect(mockBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_ORG_ID);
    });

    it('should work with different organization IDs', () => {
      const mockBuilder = createMockQueryBuilder();
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      withOrg(TEST_TABLE, 'org_different');

      expect(mockBuilder.eq).toHaveBeenCalledWith('organization_id', 'org_different');
    });

    it('should return chainable query builder', () => {
      const mockBuilder = createMockQueryBuilder();
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      const result = withOrg(TEST_TABLE, TEST_ORG_ID);

      // Verify we can chain more methods
      expect(result).toBe(mockBuilder);
    });
  });

  describe('verifyOrgResource', () => {
    it('should return resource when found in organization', async () => {
      const mockResource = { id: TEST_ID, name: 'Test Resource', organization_id: TEST_ORG_ID };
      const mockBuilder = createMockQueryBuilder();
      mockBuilder.single.mockResolvedValue({ data: mockResource, error: null });
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      const result = await verifyOrgResource(TEST_TABLE, TEST_ID, TEST_ORG_ID);

      expect(supabaseAdmin.from).toHaveBeenCalledWith(TEST_TABLE);
      expect(mockBuilder.select).toHaveBeenCalledWith('*');
      expect(mockBuilder.eq).toHaveBeenCalledWith('id', TEST_ID);
      expect(mockBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_ORG_ID);
      expect(mockBuilder.single).toHaveBeenCalled();
      expect(result).toEqual(mockResource);
    });

    it('should return null when resource not found', async () => {
      const mockBuilder = createMockQueryBuilder();
      mockBuilder.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      const result = await verifyOrgResource(TEST_TABLE, TEST_ID, TEST_ORG_ID);

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      const mockBuilder = createMockQueryBuilder();
      mockBuilder.single.mockResolvedValue({ data: null, error: { message: 'DB error' } });
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      const result = await verifyOrgResource(TEST_TABLE, TEST_ID, TEST_ORG_ID);

      expect(result).toBeNull();
    });

    it('should verify both ID and organization ownership', async () => {
      const mockBuilder = createMockQueryBuilder();
      mockBuilder.single.mockResolvedValue({ data: { id: TEST_ID }, error: null });
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      await verifyOrgResource(TEST_TABLE, TEST_ID, TEST_ORG_ID);

      // Verify both filters are applied
      expect(mockBuilder.eq).toHaveBeenCalledWith('id', TEST_ID);
      expect(mockBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_ORG_ID);
    });

    it('should work with typed resources', async () => {
      interface Campsite {
        id: string;
        name: string;
        type: string;
      }

      const mockCampsite: Campsite = { id: TEST_ID, name: 'Site A', type: 'RV' };
      const mockBuilder = createMockQueryBuilder();
      mockBuilder.single.mockResolvedValue({ data: mockCampsite, error: null });
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      const result = await verifyOrgResource<Campsite>('campsites', TEST_ID, TEST_ORG_ID);

      expect(result).toEqual(mockCampsite);
      expect(result?.type).toBe('RV');
    });
  });

  describe('insertWithOrg', () => {
    it('should insert record with organization_id', () => {
      const mockBuilder = createMockQueryBuilder();
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      const data = { name: 'New Campsite', type: 'tent' };
      insertWithOrg(TEST_TABLE, data, TEST_ORG_ID);

      expect(supabaseAdmin.from).toHaveBeenCalledWith(TEST_TABLE);
      expect(mockBuilder.insert).toHaveBeenCalledWith({
        ...data,
        organization_id: TEST_ORG_ID,
      });
      expect(mockBuilder.select).toHaveBeenCalled();
    });

    it('should not override organization_id if provided in data', () => {
      const mockBuilder = createMockQueryBuilder();
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      const data = { name: 'Test', organization_id: 'wrong_org' };
      insertWithOrg(TEST_TABLE, data, TEST_ORG_ID);

      // Should override with correct org ID
      expect(mockBuilder.insert).toHaveBeenCalledWith({
        name: 'Test',
        organization_id: TEST_ORG_ID,
      });
    });

    it('should handle empty data object', () => {
      const mockBuilder = createMockQueryBuilder();
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      insertWithOrg(TEST_TABLE, {}, TEST_ORG_ID);

      expect(mockBuilder.insert).toHaveBeenCalledWith({
        organization_id: TEST_ORG_ID,
      });
    });

    it('should return chainable query builder with select', () => {
      const mockBuilder = createMockQueryBuilder();
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      const result = insertWithOrg(TEST_TABLE, { name: 'Test' }, TEST_ORG_ID);

      expect(result).toBe(mockBuilder);
      expect(mockBuilder.select).toHaveBeenCalled();
    });
  });

  describe('updateWithOrg', () => {
    it('should update record with organization filter', () => {
      const mockBuilder = createMockQueryBuilder();
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      const data = { status: 'confirmed' };
      updateWithOrg(TEST_TABLE, TEST_ID, data, TEST_ORG_ID);

      expect(supabaseAdmin.from).toHaveBeenCalledWith(TEST_TABLE);
      expect(mockBuilder.update).toHaveBeenCalledWith(data);
      expect(mockBuilder.eq).toHaveBeenCalledWith('id', TEST_ID);
      expect(mockBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_ORG_ID);
      expect(mockBuilder.select).toHaveBeenCalled();
    });

    it('should enforce both ID and organization filters', () => {
      const mockBuilder = createMockQueryBuilder();
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      updateWithOrg(TEST_TABLE, TEST_ID, { name: 'Updated' }, TEST_ORG_ID);

      // Verify both filters are applied to prevent cross-org updates
      expect(mockBuilder.eq).toHaveBeenCalledWith('id', TEST_ID);
      expect(mockBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_ORG_ID);
    });

    it('should work with different update data', () => {
      const mockBuilder = createMockQueryBuilder();
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      const updateData = {
        name: 'New Name',
        status: 'active',
        updated_at: '2025-01-15',
      };
      updateWithOrg(TEST_TABLE, TEST_ID, updateData, TEST_ORG_ID);

      expect(mockBuilder.update).toHaveBeenCalledWith(updateData);
    });

    it('should return chainable query builder with select', () => {
      const mockBuilder = createMockQueryBuilder();
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      const result = updateWithOrg(TEST_TABLE, TEST_ID, { name: 'Test' }, TEST_ORG_ID);

      expect(result).toBe(mockBuilder);
      expect(mockBuilder.select).toHaveBeenCalled();
    });
  });

  describe('deleteWithOrg', () => {
    it('should delete record with organization filter', () => {
      const mockBuilder = createMockQueryBuilder();
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      deleteWithOrg(TEST_TABLE, TEST_ID, TEST_ORG_ID);

      expect(supabaseAdmin.from).toHaveBeenCalledWith(TEST_TABLE);
      expect(mockBuilder.delete).toHaveBeenCalled();
      expect(mockBuilder.eq).toHaveBeenCalledWith('id', TEST_ID);
      expect(mockBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_ORG_ID);
    });

    it('should enforce both ID and organization filters', () => {
      const mockBuilder = createMockQueryBuilder();
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      deleteWithOrg(TEST_TABLE, TEST_ID, TEST_ORG_ID);

      // Verify both filters prevent cross-org deletes
      expect(mockBuilder.eq).toHaveBeenCalledWith('id', TEST_ID);
      expect(mockBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_ORG_ID);
    });

    it('should work with different tables and IDs', () => {
      const mockBuilder = createMockQueryBuilder();
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      deleteWithOrg('blackout_dates', 'blackout_789', 'org_different');

      expect(supabaseAdmin.from).toHaveBeenCalledWith('blackout_dates');
      expect(mockBuilder.eq).toHaveBeenCalledWith('id', 'blackout_789');
      expect(mockBuilder.eq).toHaveBeenCalledWith('organization_id', 'org_different');
    });

    it('should return query builder', () => {
      const mockBuilder = createMockQueryBuilder();
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

      const result = deleteWithOrg(TEST_TABLE, TEST_ID, TEST_ORG_ID);

      expect(result).toBe(mockBuilder);
    });
  });
});
