/**
 * Email Service
 *
 * Centralized email client initialization using Resend.
 * Handles lazy initialization and configuration validation.
 */

import { Resend } from "resend";

// Singleton Resend client with lazy initialization
let resendClient: Resend | null = null;

/**
 * Get or initialize Resend client
 *
 * Lazy initialization prevents build-time errors when RESEND_API_KEY is not available.
 *
 * @throws Error if RESEND_API_KEY is not configured
 */
export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

/**
 * Check if Resend is configured
 *
 * @returns true if RESEND_API_KEY is available
 */
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Reset the Resend client (for testing purposes only)
 *
 * @internal
 */
export function __resetResendClient(): void {
  resendClient = null;
}
