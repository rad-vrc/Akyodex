/**
 * API Route: Get Next Available Akyo ID
 * GET /api/admin/next-id
 * Returns: { nextId: string }
 *
 * Finds the maximum ID in the CSV and returns the next available 4-digit ID.
 */

import { validateSession, jsonError } from '@/lib/api-helpers';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface R2TextObject {
  text: () => Promise<string>;
}

interface R2BucketBinding {
  get: (key: string) => Promise<R2TextObject | null>;
}

interface NextIdEnv {
  AKYO_BUCKET?: R2BucketBinding;
}

export const runtime = 'edge';

export async function GET() {
  // Validate admin session
  const session = await validateSession();
  if (!session) {
    return jsonError('Unauthorized', 401);
  }

  try {
    let csvContent: string;

    // Try R2 bucket first (production)
    let env: NextIdEnv | undefined;
    try {
      const ctx = getCloudflareContext();
      env = ctx?.env as NextIdEnv | undefined;
    } catch {
      env = undefined;
    }

    const bucket = env?.AKYO_BUCKET;

    if (bucket) {
      // Production: Use R2 bucket
      const csvPath = process.env.GITHUB_CSV_PATH_JA || 'data/akyo-data.csv';
      const csvObject = await bucket.get(csvPath);

      if (!csvObject) {
        // If CSV doesn't exist, start from 0001
        return Response.json({ nextId: '0001' });
      }

      csvContent = await csvObject.text();
    } else {
      // Development: Fetch from GitHub or R2 public URL
      const r2BaseUrl = process.env.NEXT_PUBLIC_R2_BASE || 'https://images.akyodex.com';
      const csvUrl = `${r2BaseUrl}/akyo-data/akyo-data.csv`;

      try {
        const response = await fetch(csvUrl, {
          next: { revalidate: 60 }, // Cache for 1 minute
        });

        if (!response.ok) {
          // Fallback to GitHub
          const githubUrl = 'https://raw.githubusercontent.com/rad-vrc/Akyodex/main/data/akyo-data.csv';
          const githubResponse = await fetch(githubUrl, {
            next: { revalidate: 60 },
          });

          if (!githubResponse.ok) {
            return Response.json({ nextId: '0001' });
          }

          csvContent = await githubResponse.text();
        } else {
          csvContent = await response.text();
        }
      } catch (error) {
        console.error('[next-id] Failed to fetch CSV:', error);
        return Response.json({ nextId: '0001' });
      }
    }
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

    return Response.json({ nextId });

  } catch (error) {
    console.error('[next-id] Error:', error);
    return jsonError('Failed to fetch next ID', 500, { nextId: '0001' });
  }
}
