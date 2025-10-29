declare module 'sanitize-html' {
  export interface SanitizeOptions {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
  }

  export type SanitizeHtml = (dirty: string, options?: SanitizeOptions) => string;

  const sanitizeHtml: SanitizeHtml;
  export default sanitizeHtml;
}
