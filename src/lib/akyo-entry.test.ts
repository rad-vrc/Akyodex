import assert from 'node:assert/strict';
import test from 'node:test';

import * as akyoEntryModuleNs from './akyo-entry';

const akyoEntryModule =
  (akyoEntryModuleNs as { default?: Record<string, unknown> }).default ??
  (akyoEntryModuleNs as Record<string, unknown>);

const resolveDisplaySerialForSourceUrlChange =
  akyoEntryModule.resolveDisplaySerialForSourceUrlChange as
    | ((args: {
        currentDisplaySerial: string;
        detectedEntryType: 'avatar' | 'world' | null;
        id: string;
        originalDisplaySerial?: string;
        originalEntryType?: 'avatar' | 'world';
      }) => string)
    | undefined;

test('resolveDisplaySerialForSourceUrlChange resets stale world serials for avatar URLs', () => {
  assert.equal(typeof resolveDisplaySerialForSourceUrlChange, 'function');

  assert.equal(
    resolveDisplaySerialForSourceUrlChange?.({
      currentDisplaySerial: '0042',
      detectedEntryType: 'avatar',
      id: '0746',
    }),
    '0746'
  );
});

test('resolveDisplaySerialForSourceUrlChange preserves serials for world or unknown URLs', () => {
  assert.equal(typeof resolveDisplaySerialForSourceUrlChange, 'function');

  assert.equal(
    resolveDisplaySerialForSourceUrlChange?.({
      currentDisplaySerial: '0042',
      detectedEntryType: 'world',
      id: '0746',
    }),
    '0042'
  );
  assert.equal(
    resolveDisplaySerialForSourceUrlChange?.({
      currentDisplaySerial: '0042',
      detectedEntryType: null,
      id: '0746',
    }),
    '0042'
  );
});

test('resolveDisplaySerialForSourceUrlChange restores the original world serial after toggling back from avatar', () => {
  assert.equal(typeof resolveDisplaySerialForSourceUrlChange, 'function');

  assert.equal(
    resolveDisplaySerialForSourceUrlChange?.({
      currentDisplaySerial: '0746',
      detectedEntryType: 'world',
      id: '0746',
      originalDisplaySerial: '0042',
      originalEntryType: 'world',
    }),
    '0042'
  );
});
