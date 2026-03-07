import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractVRChatWorldIdFromUrl, getAkyoSourceUrl, resolveEntryType } from "@/lib/akyo-entry";
import type { AkyoData } from "@/types/akyo";

export interface WorldImageBackfillTarget {
  id: string;
  wrld: string;
  sourceUrl: string;
  displayName: string;
}

export function normalizeAkyoJsonPayload(payload: unknown): AkyoData[] {
  if (Array.isArray(payload)) {
    return payload as AkyoData[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as { data: unknown[] }).data)
  ) {
    return (payload as { data: AkyoData[] }).data;
  }

  return [];
}

export function buildWorldImageBackfillTargets(
  entries: AkyoData[],
): WorldImageBackfillTarget[] {
  const seenIds = new Set<string>();
  const targets: WorldImageBackfillTarget[] = [];

  for (const entry of entries) {
    const sourceUrl = getAkyoSourceUrl(entry);
    const wrld = extractVRChatWorldIdFromUrl(sourceUrl);
    if (!wrld && resolveEntryType(entry) !== "world") {
      continue;
    }

    if (!wrld || seenIds.has(entry.id)) {
      continue;
    }

    seenIds.add(entry.id);
    targets.push({
      id: entry.id,
      wrld,
      sourceUrl,
      displayName: entry.nickname || entry.avatarName || entry.id,
    });
  }

  return targets;
}

async function main() {
  const args = new Map<string, string>();
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i];
    const value = process.argv[i + 1];
    if (key?.startsWith("--") && value) {
      args.set(key, value);
    }
  }

  const inputPath =
    args.get("--input") ?? path.resolve("data", "akyo-data-ja.json");
  const outputPath =
    args.get("--output") ??
    path.resolve("tmp", "world-image-backfill-targets.json");

  const raw = await fs.readFile(inputPath, "utf8");
  const payload = JSON.parse(raw) as unknown;
  const targets = buildWorldImageBackfillTargets(
    normalizeAkyoJsonPayload(payload),
  );

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(`${outputPath}`, `${JSON.stringify(targets, null, 2)}\n`, "utf8");

  console.log(
    `[world-image-backfill] wrote ${targets.length} target(s) to ${outputPath}`,
  );
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  main().catch((error) => {
    console.error("[world-image-backfill] Error:", error);
    process.exit(1);
  });
}
