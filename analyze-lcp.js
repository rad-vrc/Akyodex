const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./lh-report-73.json', 'utf8'));
const audits = data.audits;
try {
    const lcpElem = audits['largest-contentful-paint-element'];
    if (lcpElem && lcpElem.details && lcpElem.details.items) {
        console.log('--- LCP Element ---');
        console.log(JSON.stringify(lcpElem.details.items[0], null, 2));
    } else {
        console.log('No LCP element found');
    }
} catch (e) {
    console.log(e.message);
}
