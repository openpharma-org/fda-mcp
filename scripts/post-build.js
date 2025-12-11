#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Make the main entry point executable
const mainEntryPoint = join(projectRoot, 'build', 'index.js');

try {
  let content = readFileSync(mainEntryPoint, 'utf8');

  // Add shebang if not present
  if (!content.startsWith('#!/usr/bin/env node')) {
    content = '#!/usr/bin/env node\n' + content;
    writeFileSync(mainEntryPoint, content);
    console.log('✅ Added shebang to build/index.js');
  }

  console.log('✅ Post-build script completed successfully');
} catch (error) {
  console.error('❌ Post-build script failed:', error.message);
  process.exit(1);
}