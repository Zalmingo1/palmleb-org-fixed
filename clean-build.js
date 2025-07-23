const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Define the paths
const nextDir = path.join(__dirname, '.next');

// Helper to log with timestamps
const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);

// Check if .next directory exists
if (fs.existsSync(nextDir)) {
  log(`Found .next directory at ${nextDir}`);
  try {
    log('Removing .next directory...');
    fs.rmSync(nextDir, { recursive: true, force: true });
    log('Successfully removed .next directory');
  } catch (error) {
    log(`Error removing .next directory: ${error.message}`);
  }
} else {
  log('.next directory does not exist, no cleanup needed');
}

// Run build
try {
  log('Running Next.js build...');
  execSync('npx next build', { stdio: 'inherit' });
  log('Build completed successfully');
} catch (error) {
  log(`Build failed: ${error.message}`);
  process.exit(1);
}

log('Clean and build completed. You can now run "npm run dev"'); 