const jwt = require('jsonwebtoken');
require('dotenv').config();

console.error('Environment variables loaded');
console.error('All env variables:', Object.keys(process.env));

// Function to generate a token
function generateToken(userId, role) {
  const secret = process.env.JWT_SECRET;
  
  console.error('JWT_SECRET:', secret ? 'exists (length: ' + secret.length + ')' : 'undefined');
  
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  console.error('Generating token with secret:', secret);
  
  return jwt.sign(
    {
      sub: userId,
      role,
    },
    secret,
    { expiresIn: '1d' }
  );
}

// Function to verify a token
function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  
  console.error('JWT_SECRET for verification:', secret ? 'exists (length: ' + secret.length + ')' : 'undefined');
  
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  console.error('Verifying token with secret:', secret);
  
  try {
    const decoded = jwt.verify(token, secret);
    console.error('Token verified successfully:', decoded);
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Test the token generation and verification
const userId = 'test-user-id';
const role = 'DISTRICT_ADMIN';

console.error('JWT_SECRET from env:', process.env.JWT_SECRET);

// Generate a token
const token = generateToken(userId, role);
console.error('Generated token:', token);

// Verify the token
const decoded = verifyToken(token);
console.error('Verification result:', decoded ? 'Success' : 'Failed');

// Try to verify with a different secret
const wrongSecret = 'wrong-secret';
try {
  const wrongDecoded = jwt.verify(token, wrongSecret);
  console.error('Wrong secret verification result (should fail):', wrongDecoded);
} catch (error) {
  console.error('Wrong secret verification failed as expected:', error.message);
}

console.error('Test completed'); 