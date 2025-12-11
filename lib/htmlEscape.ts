/**
 * Escapes HTML special characters to prevent XSS attacks in email templates
 * @param text - The text to escape
 * @returns The escaped text safe for use in HTML
 */

const htmlEscapeMap: { [key: string]: string } = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text: string | undefined | null): string {
  if (text == null) {
    return "";
  }
  
  return String(text).replace(/[&<>"']/g, (char) => htmlEscapeMap[char] || char);
}
