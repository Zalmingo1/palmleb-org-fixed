#!/usr/bin/env node

const fs = require('fs');
const crypto = require('crypto');

console.log('🔧 Setting up production environment...\n');

// Generate secure secrets
const jwtSecret = crypto.randomBytes(64).toString('hex');
const nextAuthSecret = crypto.randomBytes(32).toString('hex');

const productionEnv = `# Production Environment Configuration
# Generated on ${new Date().toISOString()}

# JWT Configuration (Generated secure secrets)
JWT_SECRET=${jwtSecret}
NEXTAUTH_SECRET=${nextAuthSecret}

# Database Configuration
MONGODB_URI=mongodb://your-production-db-host:27017/palmlebanon

# Next.js Configuration
NEXTAUTH_URL=https://your-domain.com
NODE_ENV=production

# Email Configuration (if using email features)
SMTP_HOST=smtp.your-email-provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password

# Optional: Analytics and Monitoring
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
`;

// Write to .env.production
fs.writeFileSync('.env.production', productionEnv);

console.log('✅ Production environment file created: .env.production');
console.log('🔐 Secure JWT secrets generated');
console.log('\n📋 Next steps:');
console.log('1. Update MONGODB_URI with your production database URL');
console.log('2. Update NEXTAUTH_URL with your production domain');
console.log('3. Configure email settings if needed');
console.log('4. Set up your production database');
console.log('\n⚠️  IMPORTANT: Keep your .env.production file secure and never commit it to version control!'); 