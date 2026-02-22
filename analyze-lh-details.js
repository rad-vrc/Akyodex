const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./lh-report-73.json', 'utf8'));
const audits = data.audits;

const lcpElement = audits['largest-contentful-paint-element'];
if (lcpElement && lcpElement.details && lcpElement.details.items) {
    console.log('--- LCP Element ---');
    lcpElement.details.items.forEach(item => {
        console.log(item.node.nodeLabel, ':', item.node.snippet);
    });
}

const tbtDetails = audits['mainthread-work-breakdown'];
if (tbtDetails) {
    console.log('\n--- Main Thread Breakdown ---');
    tbtDetails.details.items.forEach(item => {
        console.log(item.groupLabel, ':', item.duration + 'ms');
    });
}
