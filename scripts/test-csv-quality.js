const fs = require('fs');
const { parse } = require('csv-parse/sync');

console.log('============================================================');
console.log('CSV DATA QUALITY VERIFICATION TEST');
console.log('============================================================\n');

const testFiles = [
  { name: 'Japanese CSV', path: 'data/akyo-data-ja.csv' },
  { name: 'English CSV', path: 'data/akyo-data-en.csv' },
  { name: 'Korean CSV', path: 'data/akyo-data-ko.csv' },
];

let allPassed = true;

testFiles.forEach(({ name, path }) => {
  console.log(`Testing ${name} (${path}):`);
  console.log('------------------------------------------------------------');
  
  const content = fs.readFileSync(path, 'utf-8');
  let records;
  try {
    records = parse(content, {
      skip_empty_lines: true,
      trim: false,
      record_delimiter: ['\r\n', '\n', '\r'],
    });
  } catch (error) {
    console.log(
      `  Parsing errors: 1 FAIL (${error instanceof Error ? error.message : String(error)})`
    );
    allPassed = false;
    console.log('');
    return;
  }

  const header = records[0];
  const dataRecords = records.slice(1);
  
  const expectedColumns = 7;
  const hasCorrectHeaders = header.length === expectedColumns;
  console.log(`  Header columns: ${header.length}/${expectedColumns} ${hasCorrectHeaders ? 'PASS' : 'FAIL'}`);
  
  console.log(`  Total data records: ${dataRecords.length}`);
  
  const mismatches = [];
  dataRecords.forEach((record, idx) => {
    if (record.length !== expectedColumns) {
      mismatches.push({
        line: idx + 2,
        id: record[0],
        expected: expectedColumns,
        got: record.length
      });
    }
  });
  
  const noParsErrors = mismatches.length === 0;
  console.log(`  Parsing errors: ${mismatches.length} ${noParsErrors ? 'PASS' : 'FAIL'}`);
  
  if (!noParsErrors) {
    console.log('    Failed rows:');
    mismatches.forEach(m => {
      console.log(`      - Line ${m.line} (ID: ${m.id}): expected ${m.expected} cols, got ${m.got}`);
    });
    allPassed = false;
  }
  
  const criticalIds = ['0014', '0015', '0016', '0017'];
  const foundIds = criticalIds.filter(id => 
    dataRecords.some(record => record[0] === id)
  );
  
  const allCriticalIdsFound = foundIds.length === criticalIds.length;
  console.log(`  Critical IDs (0014-0017): ${foundIds.length}/${criticalIds.length} ${allCriticalIdsFound ? 'PASS' : 'FAIL'}`);
  
  if (!allCriticalIdsFound) {
    const missingIds = criticalIds.filter(id => !foundIds.includes(id));
    console.log(`    Missing: ${missingIds.join(', ')}`);
    allPassed = false;
  }
  
  console.log('');
});

console.log('============================================================');
if (allPassed) {
  console.log('ALL TESTS PASSED! CSV data is clean and ready.');
} else {
  console.log('SOME TESTS FAILED! Please review the issues above.');
  process.exit(1);
}
console.log('============================================================');
