const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Hash the password
  const hashedPassword = await bcrypt.hash('User123!', 10);

  // Create a lodge
  const lodge = await prisma.lodge.upsert({
    where: { id: 'lodge_1' },
    update: {},
    create: {
      id: 'lodge_1',
      name: 'Palm Lodge',
      number: '123',
      location: 'Beirut, Lebanon',
      description: 'A historic lodge in the heart of Beirut'
    },
  });

  console.log('Created lodge:', lodge);

  // Create a user
  const user = await prisma.user.upsert({
    where: { email: 'user@palmleb.org' },
    update: {},
    create: {
      email: 'user@palmleb.org',
      password: hashedPassword,
      name: 'Test User',
      role: 'LODGE_MEMBER',
      lodgeId: lodge.id
    },
  });

  console.log('Created user:', user);

  // Create an admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@palmleb.org' },
    update: {},
    create: {
      email: 'admin@palmleb.org',
      password: hashedPassword,
      name: 'Admin User',
      role: 'LODGE_MEMBER',
      lodgeId: lodge.id
    },
  });

  console.log('Created admin:', admin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 