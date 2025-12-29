/**
 * Unit tests for HTML escape utility
 *
 * Tests behavioral contract:
 * - Escapes dangerous HTML characters to prevent XSS
 * - Handles null/undefined input gracefully
 * - Converts non-string inputs to strings
 */

import { describe, it, expect } from 'vitest';
import { escapeHtml } from '@/lib/htmlEscape';

describe('htmlEscape', () => {
  describe('escapeHtml', () => {
    it('should escape ampersand', () => {
      expect(escapeHtml('Fish & Chips')).toBe('Fish &amp; Chips');
    });

    it('should escape less than', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    });

    it('should escape greater than', () => {
      expect(escapeHtml('5 > 3')).toBe('5 &gt; 3');
    });

    it('should escape double quotes', () => {
      expect(escapeHtml('Say "Hello"')).toBe('Say &quot;Hello&quot;');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("It's working")).toBe('It&#39;s working');
    });

    it('should escape multiple special characters', () => {
      const malicious = '<script>alert("XSS & injection")</script>';
      const expected = '&lt;script&gt;alert(&quot;XSS &amp; injection&quot;)&lt;/script&gt;';
      expect(escapeHtml(malicious)).toBe(expected);
    });

    it('should return empty string for null input', () => {
      expect(escapeHtml(null)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(escapeHtml(undefined)).toBe('');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should not modify safe text', () => {
      const safe = 'This is safe text with numbers 123 and spaces';
      expect(escapeHtml(safe)).toBe(safe);
    });

    it('should handle text with only safe special characters', () => {
      const text = 'Hello! How are you? (Great) [Awesome] {Cool}';
      expect(escapeHtml(text)).toBe(text);
    });
  });
});
