const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Create Super Admin
  const superAdminPassword = await bcrypt.hash('SuperAdmin123!', 10);
  await prisma.user.upsert({
    where: { email: 'superadmin@palmleb.org' },
    update: {},
    create: {
      email: 'superadmin@palmleb.org',
      password: superAdminPassword,
      role: UserRole.SUPER_ADMIN,
      name: 'Super Admin',
    },
  });

  // Create District Admin
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@palmleb.org' },
    update: {},
    create: {
      email: 'admin@palmleb.org',
      password: adminPassword,
      role: UserRole.DISTRICT_ADMIN,
      name: 'District Admin',
    },
  });

  // Create Regular User
  const userPassword = await bcrypt.hash('User123!', 10);
  await prisma.user.upsert({
    where: { email: 'user@palmleb.org' },
    update: {},
    create: {
      email: 'user@palmleb.org',
      password: userPassword,
      role: UserRole.LODGE_MEMBER,
      name: 'Regular User',
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 