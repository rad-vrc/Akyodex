const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const SCRIPT_PATH = path.resolve(__dirname, 'generate-ko-data.js');

function toCsv(records) {
  return `${records
    .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')}\n`;
}

test('generate-ko-data accepts legacy JA CSVs without optional world columns', () => {
  const fs = require('node:fs');
  const originalExistsSync = fs.existsSync;
  const originalReadFileSync = fs.readFileSync;
  const originalWriteFileSync = fs.writeFileSync;
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalProcessExit = process.exit;
  const writes = new Map();

  const jaCsv = toCsv([
    ['ID', 'Nickname', 'AvatarName', 'Category', 'Comment', 'Author', 'AvatarURL'],
    ['0001', 'オリジンAkyo', 'Akyo origin', 'チョコミント類', 'すべてのはじまり', 'ugai', 'https://vrchat.com/home/avatar/avtr_example'],
  ]);

  fs.existsSync = (filePath) => !String(filePath).endsWith('akyo-data-ko.csv');
  fs.readFileSync = (filePath, encoding) => {
    const basename = path.basename(String(filePath));
    if (basename === 'akyo-data-ja.csv') {
      return jaCsv;
    }
    return originalReadFileSync(filePath, encoding);
  };
  fs.writeFileSync = (filePath, content) => {
    writes.set(path.basename(String(filePath)), String(content));
  };

  console.log = () => {};
  console.warn = () => {};
  process.exit = (code) => {
    throw new Error(`process.exit:${code}`);
  };

  delete require.cache[SCRIPT_PATH];
  try {
    assert.doesNotThrow(() => require(SCRIPT_PATH));
  } finally {
    fs.existsSync = originalExistsSync;
    fs.readFileSync = originalReadFileSync;
    fs.writeFileSync = originalWriteFileSync;
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    process.exit = originalProcessExit;
    delete require.cache[SCRIPT_PATH];
  }

  assert.ok(writes.has('akyo-data-ko.csv'));
  assert.ok(writes.has('akyo-data-ko.json'));
});
