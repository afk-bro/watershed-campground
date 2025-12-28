/**
 * Vitest setup file for React hook testing
 *
 * Configures test environment and provides utilities for testing hooks
 */

import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test case
afterEach(() => {
  cleanup();
});
