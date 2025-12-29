/**
 * Unit Tests for Admin API Wrapper
 *
 * Tests the withAdminAuth higher-order function without testing mock behavior.
 * Focuses on auth flow, parameter extraction, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { withAdminAuth, type AdminContext } from '@/lib/admin/api-wrapper';

// Mock dependencies
vi.mock('@/lib/admin-auth', () => ({
  requireAdminWithOrg: vi.fn()
}));

vi.mock('@/lib/api-helpers', () => ({
  errorResponse: vi.fn((message: string, status: number) =>
    NextResponse.json({ error: message }, { status })
  )
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

// Import mocked modules
import { requireAdminWithOrg } from '@/lib/admin-auth';

describe('api-wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = {
    id: 'user-123',
    email: 'admin@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2025-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {}
  };

  describe('withAdminAuth', () => {
    describe('successful authentication', () => {
      beforeEach(() => {
        vi.mocked(requireAdminWithOrg).mockResolvedValue({
          authorized: true,
          user: mockUser as any,
          organizationId: 'org-123',
          response: null
        });
      });

      it('should call handler with context when authorized', async () => {
        const handler = vi.fn().mockResolvedValue(
          NextResponse.json({ data: 'success' })
        );

        const wrappedHandler = withAdminAuth(handler);
        const request = new Request('https://example.com/api/admin/test');

        await wrappedHandler(request);

        expect(handler).toHaveBeenCalledWith({
          request,
          user: mockUser,
          organizationId: 'org-123',
          params: {}
        });
      });

      it('should extract route params correctly', async () => {
        const handler = vi.fn().mockResolvedValue(
          NextResponse.json({ data: 'success' })
        );

        const wrappedHandler = withAdminAuth(handler);
        const request = new Request('https://example.com/api/admin/test/123');
        const routeParams = { params: Promise.resolve({ id: '123' }) };

        await wrappedHandler(request, routeParams);

        expect(handler).toHaveBeenCalledWith({
          request,
          user: mockUser,
          organizationId: 'org-123',
          params: { id: '123' }
        });
      });

      it('should extract multiple route params', async () => {
        const handler = vi.fn().mockResolvedValue(
          NextResponse.json({ data: 'success' })
        );

        const wrappedHandler = withAdminAuth(handler);
        const request = new Request('https://example.com/api/admin/test/123/456');
        const routeParams = {
          params: Promise.resolve({
            id: '123',
            subId: '456'
          })
        };

        await wrappedHandler(request, routeParams);

        expect(handler).toHaveBeenCalledWith({
          request,
          user: mockUser,
          organizationId: 'org-123',
          params: { id: '123', subId: '456' }
        });
      });

      it('should return handler response', async () => {
        const expectedResponse = NextResponse.json({ data: 'test' });
        const handler = vi.fn().mockResolvedValue(expectedResponse);

        const wrappedHandler = withAdminAuth(handler);
        const request = new Request('https://example.com/api/admin/test');

        const result = await wrappedHandler(request);

        expect(result).toBe(expectedResponse);
      });

      it('should handle handlers that return different response types', async () => {
        const handler = vi.fn().mockResolvedValue(
          NextResponse.json({ success: true }, { status: 201 })
        );

        const wrappedHandler = withAdminAuth(handler);
        const request = new Request('https://example.com/api/admin/test');

        const result = await wrappedHandler(request);

        expect(result.status).toBe(201);
      });
    });

    describe('authentication failures', () => {
      it('should return auth response when not authorized', async () => {
        const authResponse = NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );

        vi.mocked(requireAdminWithOrg).mockResolvedValue({
          authorized: false,
          user: null,
          organizationId: null,
          response: authResponse
        });

        const handler = vi.fn();
        const wrappedHandler = withAdminAuth(handler);
        const request = new Request('https://example.com/api/admin/test');

        const result = await wrappedHandler(request);

        expect(result).toBe(authResponse);
        expect(handler).not.toHaveBeenCalled();
      });

      it('should not call handler when unauthorized', async () => {
        vi.mocked(requireAdminWithOrg).mockResolvedValue({
          authorized: false,
          user: null,
          organizationId: null,
          response: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        });

        const handler = vi.fn();
        const wrappedHandler = withAdminAuth(handler);
        const request = new Request('https://example.com/api/admin/test');

        await wrappedHandler(request);

        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        vi.mocked(requireAdminWithOrg).mockResolvedValue({
          authorized: true,
          user: mockUser as any,
          organizationId: 'org-123',
          response: null
        });
      });

      it('should catch handler errors and return error response', async () => {
        const handler = vi.fn().mockRejectedValue(new Error('Handler error'));

        const wrappedHandler = withAdminAuth(handler);
        const request = new Request('https://example.com/api/admin/test');

        const result = await wrappedHandler(request);

        expect(result.status).toBe(500);
        const body = await result.json();
        expect(body.error).toBe('Internal server error');
      });

      it('should catch synchronous handler errors', async () => {
        const handler = vi.fn().mockImplementation(() => {
          throw new Error('Sync error');
        });

        const wrappedHandler = withAdminAuth(handler);
        const request = new Request('https://example.com/api/admin/test');

        const result = await wrappedHandler(request);

        expect(result.status).toBe(500);
      });

      it('should handle auth errors', async () => {
        vi.mocked(requireAdminWithOrg).mockRejectedValue(
          new Error('Auth error')
        );

        const handler = vi.fn();
        const wrappedHandler = withAdminAuth(handler);
        const request = new Request('https://example.com/api/admin/test');

        const result = await wrappedHandler(request);

        expect(result.status).toBe(500);
        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      beforeEach(() => {
        vi.mocked(requireAdminWithOrg).mockResolvedValue({
          authorized: true,
          user: mockUser as any,
          organizationId: 'org-123',
          response: null
        });
      });

      it('should handle empty params', async () => {
        const handler = vi.fn().mockResolvedValue(
          NextResponse.json({ data: 'success' })
        );

        const wrappedHandler = withAdminAuth(handler);
        const request = new Request('https://example.com/api/admin/test');

        await wrappedHandler(request);

        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            params: {}
          })
        );
      });

      it('should handle request with query parameters', async () => {
        const handler = vi.fn((context: AdminContext) => {
          const url = new URL(context.request.url);
          const searchParam = url.searchParams.get('filter');
          return NextResponse.json({ filter: searchParam });
        });

        const wrappedHandler = withAdminAuth(handler);
        const request = new Request('https://example.com/api/admin/test?filter=active');

        const result = await wrappedHandler(request);
        const body = await result.json();

        expect(body.filter).toBe('active');
      });

      it('should preserve request headers', async () => {
        const handler = vi.fn((context: AdminContext) => {
          const contentType = context.request.headers.get('content-type');
          return NextResponse.json({ contentType });
        });

        const wrappedHandler = withAdminAuth(handler);
        const request = new Request('https://example.com/api/admin/test', {
          headers: { 'content-type': 'application/json' }
        });

        const result = await wrappedHandler(request);
        const body = await result.json();

        expect(body.contentType).toBe('application/json');
      });

      it('should handle POST requests with body', async () => {
        const handler = vi.fn(async (context: AdminContext) => {
          const body = await context.request.json();
          return NextResponse.json({ received: body });
        });

        const wrappedHandler = withAdminAuth(handler);
        const request = new Request('https://example.com/api/admin/test', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ test: 'data' })
        });

        const result = await wrappedHandler(request);
        const body = await result.json();

        expect(body.received).toEqual({ test: 'data' });
      });
    });
  });
});
