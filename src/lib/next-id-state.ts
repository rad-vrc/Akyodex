import type { KVNamespace } from '@/types/kv';

const NEXT_ID_HINT_KEY = 'akyo-next-id-hint';
const NEXT_ID_HINT_TTL_SECONDS = 60 * 60 * 24 * 30;
const IN_MEMORY_HINT_MAX_AGE_MS = 2000;

let inMemoryNextIdHint: number | null = null;
let inMemoryNextIdHintSyncedAtMs = 0;

interface NextIdEnvBindings {
  AKYO_KV?: KVNamespace;
}

export function parseAkyoIdNumber(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 1 ? Math.trunc(value) : null;
  }

  if (typeof value !== 'string') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 1 ? null : parsed;
}

export function formatAkyoId(idNum: number): string {
  return Math.max(1, Math.trunc(idNum)).toString().padStart(4, '0');
}

export function pickLatestAkyoId(...ids: Array<number | null | undefined>): number | null {
  let latest: number | null = null;
  for (const id of ids) {
    if (id == null) continue;
    if (latest == null || id > latest) {
      latest = id;
    }
  }
  return latest;
}

async function getKVNamespace(): Promise<KVNamespace | null> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext();
    return ((env as NextIdEnvBindings | undefined)?.AKYO_KV as KVNamespace | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function readNextIdHint(): Promise<number | null> {
  const now = Date.now();
  const hasFreshInMemoryHint =
    inMemoryNextIdHint !== null &&
    now - inMemoryNextIdHintSyncedAtMs <= IN_MEMORY_HINT_MAX_AGE_MS;

  if (hasFreshInMemoryHint) {
    return inMemoryNextIdHint;
  }

  const kv = await getKVNamespace();
  if (!kv) return inMemoryNextIdHint;

  try {
    const rawHint = await kv.get(NEXT_ID_HINT_KEY);
    const parsedHint = parseAkyoIdNumber(rawHint);
    const mergedHint = pickLatestAkyoId(inMemoryNextIdHint, parsedHint);
    if (mergedHint !== null) {
      inMemoryNextIdHint = mergedHint;
      inMemoryNextIdHintSyncedAtMs = now;
    }
    return mergedHint;
  } catch (error) {
    console.warn('[next-id-state] Failed to read hint from KV:', error);
    return inMemoryNextIdHint;
  }
}

export async function persistNextIdHint(nextId: string | number): Promise<void> {
  const candidateHint = parseAkyoIdNumber(nextId);
  if (candidateHint === null) return;

  const mergedLocalHint = pickLatestAkyoId(inMemoryNextIdHint, candidateHint);
  inMemoryNextIdHint = mergedLocalHint;
  inMemoryNextIdHintSyncedAtMs = Date.now();

  const kv = await getKVNamespace();
  if (!kv || mergedLocalHint === null) return;

  try {
    const existingHint = parseAkyoIdNumber(await kv.get(NEXT_ID_HINT_KEY));
    const hintToStore = pickLatestAkyoId(existingHint, mergedLocalHint);
    if (hintToStore === null) return;

    inMemoryNextIdHint = hintToStore;
    inMemoryNextIdHintSyncedAtMs = Date.now();
    await kv.put(NEXT_ID_HINT_KEY, formatAkyoId(hintToStore), {
      expirationTtl: NEXT_ID_HINT_TTL_SECONDS,
    });
  } catch (error) {
    console.warn('[next-id-state] Failed to persist hint to KV:', error);
  }
}
