import assert from 'node:assert/strict';
import test from 'node:test';

import * as vrchatWorldImageModuleNs from './vrchat-world-image';

const vrchatWorldImageModule =
  (vrchatWorldImageModuleNs as { default?: Record<string, unknown> }).default ??
  (vrchatWorldImageModuleNs as Record<string, unknown>);

const getSizedVRChatWorldImageUrl = vrchatWorldImageModule.getSizedVRChatWorldImageUrl as
  | ((imageUrl: string, width: number) => string)
  | undefined;
const normalizeVRChatImageWidth = vrchatWorldImageModule.normalizeVRChatImageWidth as
  | ((value: string | null | undefined) => number)
  | undefined;
const getVRChatWorldImageRequestParams = vrchatWorldImageModule.getVRChatWorldImageRequestParams as
  | ((requestUrl: string) => { wrld: string | null; width: number })
  | undefined;
const resolveVRChatWorldImageUrlFromHtml =
  vrchatWorldImageModule.resolveVRChatWorldImageUrlFromHtml as
  | ((html: string, width: number) => string)
  | undefined;

test('normalizeVRChatImageWidth clamps world image widths like the avatar proxy', () => {
  assert.equal(typeof normalizeVRChatImageWidth, 'function');

  assert.equal(normalizeVRChatImageWidth?.('96'), 96);
  assert.equal(normalizeVRChatImageWidth?.('99999'), 4096);
  assert.equal(normalizeVRChatImageWidth?.('nope'), 512);
});

test('getSizedVRChatWorldImageUrl rewrites VRChat API image URLs to the requested width', () => {
  assert.equal(typeof getSizedVRChatWorldImageUrl, 'function');

  assert.equal(
    getSizedVRChatWorldImageUrl?.('https://api.vrchat.cloud/api/1/image/file_abc123/1/1200', 96),
    'https://api.vrchat.cloud/api/1/image/file_abc123/1/96'
  );
  assert.equal(
    getSizedVRChatWorldImageUrl?.(
      'https://files.vrchat.cloud/thumbnails/file_abc123/file_abc123.123.thumbnail-1200.png',
      256
    ),
    'https://api.vrchat.cloud/api/1/image/file_abc123/123/256'
  );
});

test('getSizedVRChatWorldImageUrl preserves file version from VRChat image URLs', () => {
  assert.equal(typeof getSizedVRChatWorldImageUrl, 'function');

  // api.vrchat.cloud image URL with version > 1 preserves that version
  assert.equal(
    getSizedVRChatWorldImageUrl?.('https://api.vrchat.cloud/api/1/image/file_abc123/3/512', 256),
    'https://api.vrchat.cloud/api/1/image/file_abc123/3/256'
  );

  // api.vrchat.cloud file URL preserves version
  assert.equal(
    getSizedVRChatWorldImageUrl?.(
      'https://api.vrchat.cloud/api/1/file/file_abc123/5/file',
      128
    ),
    'https://api.vrchat.cloud/api/1/image/file_abc123/5/128'
  );

  // files.vrchat.cloud thumbnail URL extracts version from filename
  assert.equal(
    getSizedVRChatWorldImageUrl?.(
      'https://files.vrchat.cloud/thumbnails/file_xyz/file_xyz.7.thumbnail-512.png',
      96
    ),
    'https://api.vrchat.cloud/api/1/image/file_xyz/7/96'
  );
});

test('getVRChatWorldImageRequestParams reads wrld and width from the route URL', () => {
  assert.equal(typeof getVRChatWorldImageRequestParams, 'function');

  assert.deepEqual(
    getVRChatWorldImageRequestParams?.(
      'https://example.com/api/vrc-world-image?wrld=wrld_abc&w=96'
    ),
    { wrld: 'wrld_abc', width: 96 }
  );
});

test('resolveVRChatWorldImageUrlFromHtml rewrites og:image through the width-aware helper', () => {
  assert.equal(typeof resolveVRChatWorldImageUrlFromHtml, 'function');

  const html =
    '<meta property="og:image" content="https://api.vrchat.cloud/api/1/image/file_abc123/1/1200">';

  assert.equal(
    resolveVRChatWorldImageUrlFromHtml?.(html, 96),
    'https://api.vrchat.cloud/api/1/image/file_abc123/1/96'
  );
});

test('resolveVRChatWorldImageUrlFromHtml keeps apostrophes inside double-quoted og:image', () => {
  assert.equal(typeof resolveVRChatWorldImageUrlFromHtml, 'function');

  const html =
    '<meta property="og:image" content="https://vrchat.com/og?title=Builder\'s+World">';

  assert.equal(
    resolveVRChatWorldImageUrlFromHtml?.(html, 96),
    "https://vrchat.com/og?title=Builder's+World"
  );
});
