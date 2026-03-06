import assert from 'node:assert/strict';
import test from 'node:test';

import * as csvUtilsModuleNs from './csv-utils';

const csvUtilsModule =
  (csvUtilsModuleNs as { default?: Record<string, unknown> }).default ??
  (csvUtilsModuleNs as Record<string, unknown>);

const parseCsvToAkyoData = csvUtilsModule.parseCsvToAkyoData as
  | ((csvText: string) => Array<{ id: string; author: string; avatarUrl: string }>)
  | undefined;
const parseLoadedAkyoCsvContent = csvUtilsModule.parseLoadedAkyoCsvContent as
  | ((csvText: string) => { header: string[]; dataRecords: string[][] })
  | undefined;
const getDisplaySerialForWorldRecord = csvUtilsModule.getDisplaySerialForWorldRecord as
  | ((records: string[][], header: string[], id: string) => string | null)
  | undefined;

test('parseCsvToAkyoData skips malformed rows instead of returning shifted fields', () => {
  assert.equal(typeof parseCsvToAkyoData, 'function');

  const csv = [
    '"ID","Nickname","AvatarName","Category","Comment","Author","AvatarURL"',
    '"0001","Nick","Avatar","Cat","safe comment","Author","https://example.com"',
    '"0002","Nick2","Avatar2","Cat2","missing quote,"Author2","https://example.com/2"',
  ].join('\n');

  const originalWarn = console.warn;
  console.warn = () => {};

  try {
    const parsed = parseCsvToAkyoData?.(csv) ?? [];
    assert.deepEqual(parsed.map((item) => item.id), ['0001']);
  } finally {
    console.warn = originalWarn;
  }
});

test('getDisplaySerialForWorldRecord preserves the visible legacy serial for blank rows', () => {
  assert.equal(typeof getDisplaySerialForWorldRecord, 'function');

  const header = [
    'ID',
    'Nickname',
    'AvatarName',
    'Category',
    'Comment',
    'Author',
    'AvatarURL',
    'SourceURL',
    'EntryType',
    'DisplaySerial',
  ];
  const records = [
    [
      '0746',
      'First world',
      '',
      'ワールド',
      '',
      'Author',
      'https://vrchat.com/home/world/wrld_first',
      '',
      '',
      '',
    ],
    [
      '0001',
      'Avatar',
      'Avatar',
      'Cat',
      '',
      'Author',
      'https://vrchat.com/home/avatar/avtr_avatar',
      '',
      '',
      '',
    ],
    [
      '0747',
      'Second world',
      '',
      'ワールド',
      '',
      'Author',
      'https://vrchat.com/home/world/wrld_second',
      '',
      '',
      '',
    ],
  ];

  assert.equal(getDisplaySerialForWorldRecord?.(records, header, '0746'), '0001');
  assert.equal(getDisplaySerialForWorldRecord?.(records, header, '0747'), '0002');
});

test('parseLoadedAkyoCsvContent throws before admin workflows can normalize malformed rows', () => {
  assert.equal(typeof parseLoadedAkyoCsvContent, 'function');

  const csv = [
    '"ID","Nickname","AvatarName","Category","Comment","Author","AvatarURL"',
    '"0001","Nick","Avatar","Cat","safe comment","Author","https://example.com"',
    '"0002","Nick2","Avatar2","Cat2","missing quote,"Author2","https://example.com/2"',
  ].join('\n');

  assert.throws(
    () => parseLoadedAkyoCsvContent?.(csv),
    /Malformed CSV detected/
  );
});
