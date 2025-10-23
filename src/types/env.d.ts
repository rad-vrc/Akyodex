/**
 * 環境変数の型定義
 */

declare namespace NodeJS {
  interface ProcessEnv {
    // Public環境変数
    NEXT_PUBLIC_SITE_URL: string;
    NEXT_PUBLIC_R2_BASE: string;
    
    // Server-side環境変数
    ADMIN_PASSWORD_OWNER?: string;
    ADMIN_PASSWORD_ADMIN?: string;
    GITHUB_TOKEN?: string;
    GITHUB_REPO?: string;
    CLOUDFLARE_ACCOUNT_ID?: string;
    CLOUDFLARE_API_TOKEN?: string;
  }
}
