import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../src/lib/auth/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating admin users...');

  // Create Super Admin
  const superAdminEmail = 'superadmin@palmleb.org';
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  if (!existingSuperAdmin) {
    const superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        password: await hashPassword('SuperAdmin123!'),
        name: 'Super Admin',
        role: UserRole.SUPER_ADMIN,
      },
    });
    console.log(`Created Super Admin user: ${superAdmin.email}`);
  } else {
    console.log(`Super Admin user already exists: ${superAdminEmail}`);
  }

  // Create District Admin
  const districtAdminEmail = 'admin@palmleb.org';
  const existingDistrictAdmin = await prisma.user.findUnique({
    where: { email: districtAdminEmail },
  });

  if (!existingDistrictAdmin) {
    const districtAdmin = await prisma.user.create({
      data: {
        email: districtAdminEmail,
        password: await hashPassword('Admin123!'),
        name: 'District Admin',
        role: UserRole.DISTRICT_ADMIN,
      },
    });
    console.log(`Created District Admin user: ${districtAdmin.email}`);
  } else {
    console.log(`District Admin user already exists: ${districtAdminEmail}`);
  }

  // Create Regular User
  const regularUserEmail = 'user@palmleb.org';
  const existingRegularUser = await prisma.user.findUnique({
    where: { email: regularUserEmail },
  });

  if (!existingRegularUser) {
    const regularUser = await prisma.user.create({
      data: {
        email: regularUserEmail,
        password: await hashPassword('User123!'),
        name: 'Regular User',
        role: UserRole.LODGE_MEMBER,
      },
    });
    console.log(`Created Regular User: ${regularUser.email}`);
  } else {
    console.log(`Regular User already exists: ${regularUserEmail}`);
  }

  console.log('Admin users creation completed.');
}

main()
  .catch((e) => {
    console.error('Error creating admin users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 