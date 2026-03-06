import assert from 'node:assert/strict';
import test from 'node:test';

import * as vrchatWorldInfoModuleNs from './vrchat-world-info';

const vrchatWorldInfoModule =
  (vrchatWorldInfoModuleNs as { default?: Record<string, unknown> }).default ??
  (vrchatWorldInfoModuleNs as Record<string, unknown>);

const extractMetaContent = vrchatWorldInfoModule.extractMetaContent as
  | ((html: string, names: string[]) => string)
  | undefined;
const parseVRChatWorldInfoHtml = vrchatWorldInfoModule.parseVRChatWorldInfoHtml as
  | ((html: string, wrld: string) => {
      worldName: string;
      creatorName: string;
      description: string;
      fullTitle: string;
      wrld: string;
    } | null)
  | undefined;

test('extractMetaContent keeps apostrophes inside double-quoted meta content', () => {
  assert.equal(typeof extractMetaContent, 'function');

  const html = [
    '<meta property="og:title" content="Builder\'s Haven by Alice - VRChat">',
    '<meta name="description" content="Alice\'s chill world">',
  ].join('');

  assert.equal(
    extractMetaContent?.(html, ['og:title']),
    "Builder's Haven by Alice - VRChat"
  );
  assert.equal(extractMetaContent?.(html, ['description']), "Alice's chill world");
});

test('parseVRChatWorldInfoHtml falls back to title and h1 when og:title is unavailable', () => {
  assert.equal(typeof parseVRChatWorldInfoHtml, 'function');

  const fromTitle = parseVRChatWorldInfoHtml?.(
    '<title>Builder\'s Haven by Alice - VRChat</title>',
    'wrld_title'
  );
  assert.deepEqual(fromTitle, {
    worldName: "Builder's Haven",
    creatorName: 'Alice',
    description: '',
    fullTitle: "Builder's Haven by Alice",
    wrld: 'wrld_title',
  });

  const fromH1 = parseVRChatWorldInfoHtml?.(
    '<h1>Builder\'s Haven by Alice</h1>',
    'wrld_h1',
  );
  assert.deepEqual(fromH1, {
    worldName: "Builder's Haven",
    creatorName: 'Alice',
    description: '',
    fullTitle: "Builder's Haven by Alice",
    wrld: 'wrld_h1',
  });
});
