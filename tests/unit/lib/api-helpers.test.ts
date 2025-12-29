/**
 * Unit tests for API helpers
 *
 * Tests behavioral contract:
 * - Error response formatting with/without details
 * - Success response formatting
 * - Validation error formatting from Zod errors
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { errorResponse, successResponse, validationError } from "@/lib/api-helpers";
import { z } from "zod";

describe("api-helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00.000Z"));
  });

  describe("errorResponse", () => {
    it("should create error response with message and status", async () => {
      const response = errorResponse("Something went wrong", 500);

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body).toEqual({
        error: "Something went wrong",
        timestamp: "2025-01-15T12:00:00.000Z",
      });
    });

    it("should include details when provided", async () => {
      const details = { field: "email", reason: "invalid format" };
      const response = errorResponse("Validation error", 400, details);

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body).toEqual({
        error: "Validation error",
        details: { field: "email", reason: "invalid format" },
        timestamp: "2025-01-15T12:00:00.000Z",
      });
    });

    it("should omit details when not provided", async () => {
      const response = errorResponse("Not found", 404);

      const body = await response.json();
      expect(body).not.toHaveProperty("details");
      expect(body).toEqual({
        error: "Not found",
        timestamp: "2025-01-15T12:00:00.000Z",
      });
    });

    it("should handle complex details objects", async () => {
      const details = {
        conflicts: ["reservation-123", "reservation-456"],
        campsite: { id: "camp-1", name: "Site A" },
      };

      const response = errorResponse("Conflict detected", 409, details);

      const body = await response.json();
      expect(body.details).toEqual(details);
    });
  });

  describe("successResponse", () => {
    it("should create success response with default 200 status", async () => {
      const data = { id: "123", name: "Test" };
      const response = successResponse(data);

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toEqual({ id: "123", name: "Test" });
    });

    it("should accept custom status code", async () => {
      const data = { id: "new-123" };
      const response = successResponse(data, 201);

      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body).toEqual({ id: "new-123" });
    });

    it("should handle array data", async () => {
      const data = [
        { id: "1", name: "First" },
        { id: "2", name: "Second" },
      ];
      const response = successResponse(data);

      const body = await response.json();
      expect(body).toEqual(data);
    });

    it("should handle primitive values", async () => {
      const response = successResponse({ count: 42 });

      const body = await response.json();
      expect(body).toEqual({ count: 42 });
    });
  });

  describe("validationError", () => {
    it("should format Zod validation errors", async () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      const result = schema.safeParse({ email: "invalid", age: 15 });
      expect(result.success).toBe(false);

      if (!result.success) {
        const response = validationError(result.error);

        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body.error).toBe("Validation failed");
        expect(body.details).toBeDefined();
        expect(body.issues).toBeDefined();
        expect(Array.isArray(body.issues)).toBe(true);
      }
    });

    it("should include field-level error details", async () => {
      const schema = z.object({
        email: z.string().email(),
        name: z.string().min(1),
      });

      const result = schema.safeParse({ email: "bad-email", name: "" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const response = validationError(result.error);
        const body = await response.json();

        expect(body.details.email).toBeDefined();
        expect(body.details.name).toBeDefined();
      }
    });

    it("should format issues with path and message", async () => {
      const schema = z.object({
        user: z.object({
          email: z.string().email(),
        }),
      });

      const result = schema.safeParse({ user: { email: "invalid" } });
      expect(result.success).toBe(false);

      if (!result.success) {
        const response = validationError(result.error);
        const body = await response.json();

        expect(body.issues[0]).toHaveProperty("path");
        expect(body.issues[0]).toHaveProperty("message");
        expect(body.issues[0].path).toBe("user.email");
      }
    });

    it("should handle multiple validation errors", async () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
        name: z.string().min(1),
      });

      const result = schema.safeParse({
        email: "bad",
        age: 10,
        name: "",
      });
      expect(result.success).toBe(false);

      if (!result.success) {
        const response = validationError(result.error);
        const body = await response.json();

        expect(body.issues.length).toBe(3);
        expect(body.details).toHaveProperty("email");
        expect(body.details).toHaveProperty("age");
        expect(body.details).toHaveProperty("name");
      }
    });
  });
});
