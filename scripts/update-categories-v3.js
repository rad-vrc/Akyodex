const path = require('path');
const { updateCsv } = require('./update-categories-common');
const definitions = require('./category-definitions-ja');

const DATA_DIR = path.join(process.cwd(), 'data');
const CSV_PATH = path.join(DATA_DIR, 'akyo-data-ja.csv');

function main() {
  updateCsv(CSV_PATH, definitions);
}

main();
