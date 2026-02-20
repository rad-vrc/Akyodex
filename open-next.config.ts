import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import kvNextTagCache from '@opennextjs/cloudflare/overrides/tag-cache/kv-next-tag-cache';

const cloudflareConfig = defineCloudflareConfig({
  // Persist ISR/data cache entries in R2 instead of in-memory/dummy storage.
  incrementalCache: r2IncrementalCache,
  // Use KV-backed next-mode tag cache in Pages (DO-based tag cache needs Workers/DO wiring).
  tagCache: kvNextTagCache,
  // Direct queue avoids dummy queue FatalError while keeping Pages-compatible config.
  queue: 'direct',
  // Enable cache interception to reduce origin hits on cached responses.
  enableCacheInterception: true,
});

const openNextConfig = {
  ...cloudflareConfig,
  // Prevent recursive build calls: OpenNext should run Next.js build directly.
  buildCommand: 'npm run next:build:opennext',
};

export default openNextConfig;
