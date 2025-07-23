const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Define admin user details
  const adminUser = {
    name: 'Super Admin',
    email: 'admin@palmleb.org',
    password: 'Admin@123', // This will be hashed before storing
    role: 'DISTRICT_ADMIN'
  };

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminUser.email }
    });

    if (existingUser) {
      console.log(`User with email ${adminUser.email} already exists.`);
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminUser.password, 10);

    // Create the admin user
    const newUser = await prisma.user.create({
      data: {
        name: adminUser.name,
        email: adminUser.email,
        password: hashedPassword,
        role: adminUser.role
      }
    });

    console.log(`Admin user created successfully:`);
    console.log(`Email: ${adminUser.email}`);
    console.log(`Password: ${adminUser.password}`);
    console.log(`Role: ${adminUser.role}`);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 