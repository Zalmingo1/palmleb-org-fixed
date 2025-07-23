#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting production build...\n');

// Check if production environment file exists
if (!fs.existsSync('.env.production')) {
  console.error('❌ .env.production file not found!');
  console.log('Run: node scripts/setup-production.js first');
  process.exit(1);
}

// Check for critical environment variables
const envContent = fs.readFileSync('.env.production', 'utf8');
const requiredVars = ['JWT_SECRET', 'NEXTAUTH_SECRET', 'MONGODB_URI', 'NEXTAUTH_URL'];

const missingVars = requiredVars.filter(varName => {
  const regex = new RegExp(`^${varName}=`, 'm');
  return !regex.test(envContent);
});

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.log('\nPlease update your .env.production file');
  process.exit(1);
}

// Check for development values
const devPatterns = [
  /JWT_SECRET=your-super-secret-jwt-key-change-this-in-production/,
  /NEXTAUTH_SECRET=your-nextauth-secret-key-change-this-in-production/,
  /MONGODB_URI=mongodb:\/\/localhost/,
  /NEXTAUTH_URL=http:\/\/localhost/
];

const devValuesFound = devPatterns.some(pattern => pattern.test(envContent));

if (devValuesFound) {
  console.warn('⚠️  Warning: Found development values in .env.production');
  console.warn('Please update with production values before deploying');
}

try {
  console.log('📦 Building application...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('\n✅ Production build completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Test the build: npm start');
  console.log('2. Deploy to your hosting platform');
  console.log('3. Set up your production database');
  console.log('4. Configure your domain and SSL');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
} 