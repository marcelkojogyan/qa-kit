import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup runs once before all tests.
 * Use this for:
 * - Creating output directories
 * - Warming up services
 * - Setting up global state
 */
async function globalSetup() {
  // Ensure artifact directories exist
  const artifactDirs = [
    path.resolve(__dirname, '../artifacts'),
    path.resolve(__dirname, '../artifacts/test-results'),
    path.resolve(__dirname, '../artifacts/playwright-report'),
    path.resolve(__dirname, '../artifacts/screenshots'),
    path.resolve(__dirname, '../artifacts/traces'),
    path.resolve(__dirname, '../artifacts/.auth'),
    path.resolve(__dirname, '../storage-state'),
  ];

  for (const dir of artifactDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Log configuration
  console.log('\n🎭 Playwright Global Setup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Base URL: ${process.env.APP_BASE_URL || 'http://localhost:3000'}`);
  console.log(`CI Mode: ${process.env.CI ? 'Yes' : 'No'}`);
  console.log(`Headed: ${process.env.HEADED === 'true' ? 'Yes' : 'No'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

export default globalSetup;
