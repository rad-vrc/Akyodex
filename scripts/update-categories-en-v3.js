const path = require('path');
console.log("Script started!");
const { updateCsv } = require('./update-categories-common');
const definitions = require('./category-definitions-en');

const DATA_DIR = path.join(process.cwd(), 'data');
const CSV_PATH = path.join(DATA_DIR, 'akyo-data-en.csv');

function main() {
  updateCsv(CSV_PATH, definitions);
}

main();
