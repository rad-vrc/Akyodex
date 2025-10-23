/**
 * API Route: Check for duplicate nicknames or avatar names
 * POST /api/check-duplicate
 * Body: { field: 'nickname' | 'avatarName', value: string, excludeId?: string }
 * Returns: { duplicates: string[], message: string, isDuplicate: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAkyoData } from '@/lib/akyo-data-server';
import { validateOrigin } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    // CSRF Protection: Validate Origin/Referer
    if (!validateOrigin(request)) {
      return NextResponse.json(
        { error: '不正なリクエスト元です' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { field, value, excludeId } = body;

    // Validate input
    if (!field || !value || typeof value !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request. field and value are required.' },
        { status: 400 }
      );
    }

    if (field !== 'nickname' && field !== 'avatarName') {
      return NextResponse.json(
        { error: 'Invalid field. Must be "nickname" or "avatarName".' },
        { status: 400 }
      );
    }

    // Get all avatar data
    const akyoData = await getAkyoData('ja');

    // Normalize function (case-insensitive, trimmed, Unicode NFC normalized)
    const normalize = (str: string | boolean | undefined): string => {
      if (!str || typeof str !== 'string') return '';
      return str.trim().normalize('NFC').toLowerCase();
    };

    // Find duplicates
    const targetValue = normalize(value);
    const duplicateIds: string[] = [];

    akyoData.forEach((akyo) => {
      // Skip if this is the excluded ID (for edit operations)
      if (excludeId && akyo.id === excludeId) {
        return;
      }

      // Check the specified field
      const fieldValue = normalize(akyo[field as keyof typeof akyo]);
      if (fieldValue && fieldValue === targetValue) {
        duplicateIds.push(akyo.id);
      }
    });

    // Format response
    const isDuplicate = duplicateIds.length > 0;
    const formattedIds = duplicateIds.map((id) => {
      const numeric = parseInt(id, 10);
      if (!isNaN(numeric)) {
        return `#${String(numeric).padStart(4, '0')}`;
      }
      return `#${id}`;
    });

    let message = '';
    if (isDuplicate) {
      const fieldName = field === 'nickname' ? '通称' : 'アバター名';
      message = `重複している${fieldName}が見つかりました: ${formattedIds.join('、')}`;
    } else {
      const fieldName = field === 'nickname' ? '通称' : 'アバター名';
      message = `重複している${fieldName}はありません`;
    }

    return NextResponse.json({
      duplicates: formattedIds,
      message,
      isDuplicate,
    });
  } catch (error) {
    console.error('Duplicate check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
