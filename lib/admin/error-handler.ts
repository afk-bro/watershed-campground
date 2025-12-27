/**
 * Admin Error Handler
 *
 * Centralized error handling for the admin panel with:
 * - Standardized error logging
 * - User-friendly error messages
 * - Type-safe error handling
 */

import { useCallback } from "react";
import { useToast } from "@/components/ui/Toast";

/**
 * Custom error class for admin panel errors
 */
export class AdminError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AdminError";
  }
}

/**
 * Handle unknown errors and convert them to AdminError
 *
 * @param error - The error to handle
 * @param context - Context string for logging (e.g., component/function name)
 * @returns AdminError instance
 */
export function handleAdminError(
  error: unknown,
  context: string
): AdminError {
  // Log with context for debugging
  console.error(`[${context}]`, error);

  // Already an AdminError, return as-is
  if (error instanceof AdminError) {
    return error;
  }

  // Standard Error object
  if (error instanceof Error) {
    // Check if it's an AbortError (from cancelled fetch)
    if (error.name === "AbortError") {
      return new AdminError(
        error.message,
        "ABORT_ERROR",
        "Request was cancelled",
        error
      );
    }

    return new AdminError(
      error.message,
      "ERROR",
      error.message || "An unexpected error occurred. Please try again.",
      error
    );
  }

  // Unknown error type
  return new AdminError(
    String(error),
    "UNKNOWN_ERROR",
    "An unexpected error occurred. Please try again.",
    error
  );
}

/**
 * React hook for handling errors with toast notifications
 *
 * @returns handleError function that logs error and shows toast
 *
 * @example
 * ```tsx
 * const { handleError } = useErrorHandler();
 *
 * try {
 *   await someAsyncOperation();
 * } catch (error) {
 *   handleError(error, 'ComponentName.someOperation');
 * }
 * ```
 */
export function useErrorHandler() {
  const { showToast } = useToast();

  const handleError = useCallback(
    (error: unknown, context: string): AdminError => {
      const adminError = handleAdminError(error, context);
      showToast(adminError.userMessage, "error");
      return adminError;
    },
    [showToast]
  );

  return { handleError };
}
