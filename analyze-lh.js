const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./lh-report-73.json', 'utf8'));
const audits = data.audits;

const out = [];
out.push(`Score: ${data.categories.performance.score * 100}`);
out.push(`FCP: ${audits['first-contentful-paint'].displayValue}`);
out.push(`LCP: ${audits['largest-contentful-paint'].displayValue}`);
out.push(`TBT: ${audits['total-blocking-time'].displayValue}`);
out.push(`Speed Index: ${audits['speed-index'].displayValue}`);
out.push('');
out.push('--- Top Opportunities ---');
Object.values(audits)
    .filter(a => a.details && a.details.type === 'opportunity' && a.details.overallSavingsMs > 0)
    .sort((a, b) => b.details.overallSavingsMs - a.details.overallSavingsMs)
    .forEach(a => out.push(`${a.title} (-${Math.round(a.details.overallSavingsMs)}ms)`));

out.push('');
out.push('--- Top Diagnostics ---');
Object.values(audits)
    .filter(a => ['mainthread-work-breakdown', 'bootup-time', 'dom-size', 'unminified-javascript', 'unused-javascript', 'uses-long-cache-ttl', 'lcp-lazy-loaded'].includes(a.id))
    .forEach(a => out.push(`${a.id}: ${a.displayValue} (score: ${Math.round(a.score * 100)})`));

fs.writeFileSync('lh-summary.txt', out.join('\n'));
