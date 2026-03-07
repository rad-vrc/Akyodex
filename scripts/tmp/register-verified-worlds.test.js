const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const SCRIPT_PATH = path.resolve(__dirname, 'register-verified-worlds.js');

const HEADER = [
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

function toCsv(rows) {
  return `${[HEADER, ...rows]
    .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')}\n`;
}

function findWorldByWrld(items, wrld) {
  return items.find((item) => String(item.sourceUrl || item.avatarUrl || '').includes(wrld));
}

function runScriptWithFixtures(fixturesByBasename) {
  const fs = require('node:fs');
  const originalReadFileSync = fs.readFileSync;
  const originalWriteFileSync = fs.writeFileSync;
  const originalConsoleLog = console.log;
  const writes = new Map();

  fs.readFileSync = (filePath, encoding) => {
    const basename = path.basename(String(filePath));
    if (Object.prototype.hasOwnProperty.call(fixturesByBasename, basename)) {
      return fixturesByBasename[basename];
    }
    return originalReadFileSync(filePath, encoding);
  };

  fs.writeFileSync = (filePath, content) => {
    writes.set(path.basename(String(filePath)), String(content));
  };

  console.log = () => {};

  delete require.cache[SCRIPT_PATH];
  try {
    const scriptModule = require(SCRIPT_PATH);
    scriptModule.main();
  } finally {
    fs.readFileSync = originalReadFileSync;
    fs.writeFileSync = originalWriteFileSync;
    console.log = originalConsoleLog;
    delete require.cache[SCRIPT_PATH];
  }

  return writes;
}

test('register-verified-worlds keeps added world IDs and serials aligned across locales', () => {
  const jaCsv = toCsv([
    [
      '0750',
      'Existing JA World',
      '',
      'ワールド',
      '',
      'Author JA',
      'https://vrchat.com/home/world/wrld_existing_ja',
      'https://vrchat.com/home/world/wrld_existing_ja',
      'world',
      '0005',
    ],
  ]);
  const enCsv = toCsv([
    [
      '0749',
      'Existing EN World',
      '',
      'World',
      '',
      'Author EN',
      'https://vrchat.com/home/world/wrld_existing_en',
      'https://vrchat.com/home/world/wrld_existing_en',
      'world',
      '0004',
    ],
  ]);
  const koCsv = toCsv([
    [
      '0749',
      'Existing KO World',
      '',
      '월드',
      '',
      'Author KO',
      'https://vrchat.com/home/world/wrld_existing_ko',
      'https://vrchat.com/home/world/wrld_existing_ko',
      'world',
      '0004',
    ],
  ]);

  const writes = runScriptWithFixtures({
    'akyo-data-ja.csv': jaCsv,
    'akyo-data-en.csv': enCsv,
    'akyo-data-ko.csv': koCsv,
  });

  const jaItems = JSON.parse(writes.get('akyo-data-ja.json'));
  const enItems = JSON.parse(writes.get('akyo-data-en.json'));
  const koItems = JSON.parse(writes.get('akyo-data-ko.json'));
  const targetWrld = 'wrld_b0748170-ed80-4544-8c0f-d5c9f8a1d764';

  const jaWorld = findWorldByWrld(jaItems, targetWrld);
  const enWorld = findWorldByWrld(enItems, targetWrld);
  const koWorld = findWorldByWrld(koItems, targetWrld);

  assert.ok(jaWorld, 'JA output should include the verified world');
  assert.ok(enWorld, 'EN output should include the verified world');
  assert.ok(koWorld, 'KO output should include the verified world');

  assert.equal(enWorld.id, jaWorld.id);
  assert.equal(koWorld.id, jaWorld.id);
  assert.equal(enWorld.displaySerial, jaWorld.displaySerial);
  assert.equal(koWorld.displaySerial, jaWorld.displaySerial);
});
