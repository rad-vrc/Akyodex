const fs = require('fs');
try {
    const data = JSON.parse(fs.readFileSync('pagespeed.json'));
    if (data.error) {
        console.error('API Error:', data.error.message);
        process.exit(1);
    }
    const lr = data.lighthouseResult;
    if (!lr) {
        console.log('No lighthouseResult found.');
        process.exit(1);
    }
    const perfScore = lr.categories?.performance?.score;
    console.log('Performance Score:', perfScore ? Math.round(perfScore * 100) : 'N/A');

    console.log('\n--- Metrics ---');
    Object.values(lr.audits).filter(a => a.score !== null && a.score < 0.9 && a.details && a.details.type !== 'opportunity').forEach(a => {
        console.log(`${a.id}: ${a.displayValue || a.title} (Score: ${a.score})`);
    });

    console.log('\n--- Opportunities ---');
    Object.values(lr.audits).filter(a => a.details && a.details.type === 'opportunity' && a.score !== 1)
        .sort((a, b) => (b.details.overallSavingsMs || 0) - (a.details.overallSavingsMs || 0))
        .forEach(a => console.log(`${a.id}: ${a.title} - Savings: ${a.details.overallSavingsMs || 0} ms`));

} catch (e) {
    console.error(e);
}
