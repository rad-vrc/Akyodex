/**
 * Workaround for OpenNext + Next.js 16 standalone output mismatch.
 *
 * Next.js can generate `.next/server/instrumentation.js` while omitting
 * `.next/standalone/.next/server/instrumentation.js`.
 *
 * OpenNext expects the standalone file to exist when
 * `.next/server/instrumentation.js.nft.json` is present, otherwise build fails.
 */

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = process.cwd();
const sourceDir = path.join(projectRoot, '.next', 'server');
const targetDir = path.join(projectRoot, '.next', 'standalone', '.next', 'server');

const filesToMirror = ['instrumentation.js', 'instrumentation.js.map'];

function mirrorIfMissing(fileName) {
  const sourcePath = path.join(sourceDir, fileName);
  const targetPath = path.join(targetDir, fileName);

  if (!fs.existsSync(sourcePath)) {
    return;
  }

  if (fs.existsSync(targetPath)) {
    return;
  }

  fs.mkdirSync(targetDir, { recursive: true });
  try {
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`[fix-opennext-instrumentation] copied: ${fileName}`);
  } catch (error) {
    console.error(
      `[fix-opennext-instrumentation] failed to copy ${fileName}: ${sourcePath} -> ${targetPath}`
    );
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exit(1);
  }
}

for (const fileName of filesToMirror) {
  mirrorIfMissing(fileName);
}
