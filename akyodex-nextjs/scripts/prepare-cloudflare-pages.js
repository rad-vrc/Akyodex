#!/usr/bin/env node

/**
 * Prepare OpenNext build output for Cloudflare Pages deployment
 * 
 * Cloudflare Pages expects:
 * - _worker.js at the root of the output directory
 * - All other files as static assets
 */

const fs = require('fs');
const path = require('path');

const openNextDir = path.join(__dirname, '../.open-next');
const workerSrc = path.join(openNextDir, 'worker.js');
const workerDest = path.join(openNextDir, '_worker.js');

console.log('📦 Preparing OpenNext output for Cloudflare Pages...');

// Copy worker.js to _worker.js
if (fs.existsSync(workerSrc)) {
  fs.copyFileSync(workerSrc, workerDest);
  console.log('✅ Created _worker.js');
} else {
  console.error('❌ worker.js not found!');
  process.exit(1);
}

console.log('✨ Ready for Cloudflare Pages deployment!');
