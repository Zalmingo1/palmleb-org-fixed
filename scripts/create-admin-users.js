// JavaScript version of create-admin-users.ts
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Define UserRole enum to match Prisma schema
const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  DISTRICT_ADMIN: 'DISTRICT_ADMIN',
  LODGE_ADMIN: 'LODGE_ADMIN',
  LODGE_MEMBER: 'LODGE_MEMBER'
};

// Hash password function
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

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
  const districtAdminEmail = 'districtadmin@palmleb.org';
  const existingDistrictAdmin = await prisma.user.findUnique({
    where: { email: districtAdminEmail },
  });

  if (!existingDistrictAdmin) {
    const districtAdmin = await prisma.user.create({
      data: {
        email: districtAdminEmail,
        password: await hashPassword('DistrictAdmin123!'),
        name: 'District Admin',
        role: UserRole.DISTRICT_ADMIN,
      },
    });
    console.log(`Created District Admin user: ${districtAdmin.email}`);
  } else {
    console.log(`District Admin user already exists: ${districtAdminEmail}`);
  }

  // Create Lodge Admin
  const lodgeAdminEmail = 'lodgeadmin@palmleb.org';
  const existingLodgeAdmin = await prisma.user.findUnique({
    where: { email: lodgeAdminEmail },
  });

  if (!existingLodgeAdmin) {
    const lodgeAdmin = await prisma.user.create({
      data: {
        email: lodgeAdminEmail,
        password: await hashPassword('LodgeAdmin123!'),
        name: 'Lodge Admin',
        role: UserRole.LODGE_ADMIN,
      },
    });
    console.log(`Created Lodge Admin user: ${lodgeAdmin.email}`);
  } else {
    console.log(`Lodge Admin user already exists: ${lodgeAdminEmail}`);
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

  console.log('\n=== Admin Users Creation Completed ===');
  console.log('\nAccess Credentials:');
  console.log('=====================================');
  console.log('Super Admin:');
  console.log('  Email: superadmin@palmleb.org');
  console.log('  Password: SuperAdmin123!');
  console.log('\nDistrict Admin:');
  console.log('  Email: districtadmin@palmleb.org');
  console.log('  Password: DistrictAdmin123!');
  console.log('\nLodge Admin:');
  console.log('  Email: lodgeadmin@palmleb.org');
  console.log('  Password: LodgeAdmin123!');
  console.log('\nRegular User:');
  console.log('  Email: user@palmleb.org');
  console.log('  Password: User123!');
  console.log('\n=====================================');
}

main()
  .catch((e) => {
    console.error('Error creating admin users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 