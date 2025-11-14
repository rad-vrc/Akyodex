/**
 * HTML Utilities
 *
 * Functions for HTML entity decoding and sanitization.
 */

import sanitizeHtml from 'sanitize-html';

/**
 * Decode HTML entities in a string
 *
 * Handles common entities like &amp;, &lt;, &gt;, &quot;, &#39;, etc.
 * This is useful for text retrieved from VRChat API which may contain encoded entities.
 *
 * @param text - Text with HTML entities
 * @returns Decoded text
 */
export function decodeHTMLEntities(text: string): string {
  if (!text) return text;

  // Map of common HTML entities
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
  };

  // Replace named entities
  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }

  // Replace numeric entities (e.g., &#8217;)
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });

  // Replace hex entities (e.g., &#x2019;)
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  return decoded;
}

/**
 * Strip HTML tags from a string while preserving text content.
 *
 * Uses sanitize-html with no allowlist to ensure complete tag removal.
 */
export function stripHTMLTags(html: string): string {
  if (!html) return html;
  return sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

