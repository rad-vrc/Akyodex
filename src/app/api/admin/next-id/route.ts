/**
 * API Route: Get Next Available Akyo ID
 * GET /api/admin/next-id
 * Returns: { nextId: string }
 *
 * Finds the maximum ID in the CSV and returns the next available 4-digit ID.
 */

import { validateSession } from '@/lib/api-helpers';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse } from 'next/server';

interface R2TextObject {
  text: () => Promise<string>;
}

interface R2BucketBinding {
  get: (key: string) => Promise<R2TextObject | null>;
}

interface NextIdEnv {
  AKYO_BUCKET?: R2BucketBinding;
}

export const runtime = 'nodejs';

export async function GET() {
  // Validate admin session
  const session = await validateSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get Cloudflare context for R2 access
  let env: NextIdEnv | undefined;
    try {
  const ctx = getCloudflareContext();
  env = ctx?.env as NextIdEnv | undefined;
    } catch {
      env = undefined;
    }

    const bucket = env?.AKYO_BUCKET;

    if (!bucket) {
      return NextResponse.json(
        { error: 'R2 bucket not configured' },
        { status: 500 }
      );
    }

    // Fetch Japanese CSV
    const csvPath = process.env.GITHUB_CSV_PATH_JA || 'data/akyo-data.csv';
    const csvObject = await bucket.get(csvPath);

    if (!csvObject) {
      // If CSV doesn't exist, start from 0001
      return NextResponse.json({ nextId: '0001' });
    }

    const csvContent = await csvObject.text();
    const lines = csvContent.split('\n').filter(line => line.trim());

    // Skip header
    const dataLines = lines.slice(1);

    // Find maximum ID
    let maxId = 0;
    for (const line of dataLines) {
      // Extract ID from first column (handle quoted fields)
      const match = line.match(/^"?(\d+)"?/);
      if (match) {
        const id = parseInt(match[1], 10);
        if (!isNaN(id) && id > maxId) {
          maxId = id;
        }
      }
    }

    // Return next ID with 4-digit padding
    const nextId = (maxId + 1).toString().padStart(4, '0');

    return NextResponse.json({ nextId });

  } catch (error) {
    console.error('[next-id] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch next ID', nextId: '0001' },
      { status: 500 }
    );
  }
}
