const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const SCRIPT_PATH = path.resolve(__dirname, 'world-serial-migration.js');

function toCsv(rows) {
  const header = ['ID', 'Nickname', 'AvatarName', 'Category', 'Comment', 'Author', 'AvatarURL'];
  return `${[header, ...rows]
    .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')}\n`;
}

test('world-serial-migration does not execute on require()', () => {
  const fs = require('node:fs');
  const originalReadFileSync = fs.readFileSync;
  const originalWriteFileSync = fs.writeFileSync;
  const originalConsoleLog = console.log;
  const writes = [];

  fs.readFileSync = (filePath, encoding) => {
    const basename = path.basename(String(filePath));
    if (
      basename === 'akyo-data-ja.csv' ||
      basename === 'akyo-data-en.csv' ||
      basename === 'akyo-data-ko.csv'
    ) {
      return toCsv([
        ['0001', 'Avatar', 'Avatar', 'Cat', '', 'Author', 'https://vrchat.com/home/avatar/avtr_x'],
      ]);
    }
    return originalReadFileSync(filePath, encoding);
  };

  fs.writeFileSync = (...args) => {
    writes.push(args);
  };

  console.log = () => {};

  delete require.cache[SCRIPT_PATH];
  try {
    require(SCRIPT_PATH);
  } finally {
    fs.readFileSync = originalReadFileSync;
    fs.writeFileSync = originalWriteFileSync;
    console.log = originalConsoleLog;
    delete require.cache[SCRIPT_PATH];
  }

  assert.equal(writes.length, 0);
});
