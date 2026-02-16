import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import doQueue from '@opennextjs/cloudflare/overrides/queue/do-queue';
import doShardedTagCache from '@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache';

const cloudflareConfig = defineCloudflareConfig({
  // Persist ISR/data cache entries in R2 instead of in-memory/dummy storage.
  incrementalCache: r2IncrementalCache,
  // Use Durable Objects for tag revalidation coordination across isolates.
  tagCache: doShardedTagCache({
    baseShardSize: 4,
    regionalCache: true,
    regionalCacheTtlSec: 5,
  }),
  // Durable Object-backed queue avoids dummy queue failures during revalidation.
  queue: doQueue,
  // Enable cache interception to reduce origin hits on cached responses.
  enableCacheInterception: true,
});

const openNextConfig = {
  ...cloudflareConfig,
  // Prevent recursive build calls: OpenNext should run Next.js build directly.
  buildCommand: 'npm run next:build',
};

export default openNextConfig;
