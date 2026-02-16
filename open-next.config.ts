import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';

const cloudflareConfig = defineCloudflareConfig({
  // Persist ISR/data cache entries in R2 instead of in-memory/dummy storage.
  incrementalCache: r2IncrementalCache,
  // Enable cache interception to reduce origin hits on cached responses.
  enableCacheInterception: true,
});

const openNextConfig = {
  ...cloudflareConfig,
  // Prevent recursive build calls: OpenNext should run Next.js build directly.
  buildCommand: 'npm run next:build',
};

export default openNextConfig;
