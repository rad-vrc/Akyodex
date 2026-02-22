const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./lh-report-73.json', 'utf8'));
const audits = data.audits;
['render-blocking-insight', 'lcp-breakdown-insight', 'lcp-discovery-insight'].forEach(key => {
    console.log(`\n=== ${key} ===`);
    console.log(JSON.stringify(audits[key]?.details, null, 2));
});
