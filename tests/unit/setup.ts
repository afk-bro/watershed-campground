/**
 * Vitest setup file for React hook testing
 *
 * Configures test environment and provides utilities for testing hooks
 */

import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock server-only package (used by Next.js server components)
vi.mock('server-only', () => ({}));

// Cleanup after each test case
afterEach(() => {
  cleanup();
});
