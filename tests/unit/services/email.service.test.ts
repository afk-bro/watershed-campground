/**
 * Unit tests for email service
 *
 * Tests behavioral contract:
 * - Email client initialization and configuration
 * - isResendConfigured() checking
 * - getResendClient() error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getResendClient,
  isResendConfigured,
  __resetResendClient,
} from "@/lib/services/email.service";

// Mock Resend
vi.mock("resend", () => {
  return {
    Resend: class MockResend {
      constructor(public apiKey: string) {}
    },
  };
});

describe("email.service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    process.env = { ...originalEnv };
    // Reset singleton
    __resetResendClient();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("isResendConfigured", () => {
    it("should return true when RESEND_API_KEY is set", () => {
      process.env.RESEND_API_KEY = "re_test_123";
      expect(isResendConfigured()).toBe(true);
    });

    it("should return false when RESEND_API_KEY is not set", () => {
      delete process.env.RESEND_API_KEY;
      expect(isResendConfigured()).toBe(false);
    });

    it("should return false when RESEND_API_KEY is empty string", () => {
      process.env.RESEND_API_KEY = "";
      expect(isResendConfigured()).toBe(false);
    });
  });

  describe("getResendClient", () => {
    it("should throw error when RESEND_API_KEY is not configured", () => {
      delete process.env.RESEND_API_KEY;

      expect(() => getResendClient()).toThrow(
        "RESEND_API_KEY is not configured"
      );
    });

    it("should return client when RESEND_API_KEY is configured", () => {
      process.env.RESEND_API_KEY = "re_test_123";

      const client = getResendClient();

      expect(client).toBeDefined();
      expect(client).toHaveProperty("apiKey");
    });

    it("should initialize client with correct API key", () => {
      process.env.RESEND_API_KEY = "re_test_456";

      const client = getResendClient();

      expect((client as any).apiKey).toBe("re_test_456");
    });
  });
});
