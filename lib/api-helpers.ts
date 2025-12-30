/**
 * API Helper Utilities
 *
 * Standardized response helpers for Next.js API routes.
 * Provides consistent error and success response formatting.
 */

import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/**
 * Create a standardized error response
 *
 * @param message - Error message
 * @param status - HTTP status code
 * @param headersOrDetails - Optional headers object or additional error details
 * @returns NextResponse with error payload
 */
export function errorResponse(
  message: string,
  status: number,
  headersOrDetails?: Record<string, string> | unknown
) {
  // Determine if the third parameter is headers or details
  // Headers are plain objects with all string values AND have rate-limit-like keys
  const isHeaders = headersOrDetails &&
    typeof headersOrDetails === 'object' &&
    !Array.isArray(headersOrDetails) &&
    Object.keys(headersOrDetails as Record<string, unknown>).some(k => k.startsWith('X-RateLimit-')) &&
    Object.values(headersOrDetails as Record<string, unknown>).every(v => typeof v === 'string');

  const headers = isHeaders ? headersOrDetails as Record<string, string> : undefined;
  const details = !isHeaders ? headersOrDetails : undefined;

  return NextResponse.json(
    {
      error: message,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
    },
    { status, ...(headers ? { headers } : {}) }
  );
}

/**
 * Create a standardized success response
 *
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with data payload
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Create a standardized validation error response from Zod errors
 *
 * @param zodError - Zod validation error
 * @returns NextResponse with validation error details
 */
export function validationError(zodError: ZodError, headers?: Record<string, string>) {
  return NextResponse.json(
    {
      error: "Validation failed",
      details: zodError.flatten().fieldErrors,
      issues: zodError.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    },
    { status: 400, ...(headers ? { headers } : {}) }
  );
}
