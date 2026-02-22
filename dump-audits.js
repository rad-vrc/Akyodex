const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./lh-report-73.json', 'utf8'));
const audits = data.audits;
let out = '';
for (const key in audits) {
    const a = audits[key];
    out += `${key} | ${a.title} | ${a.displayValue || ''} | ${a.score}\n`;
}
fs.writeFileSync('all-audits.txt', out);
