const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/palmlebanon';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

// Define role categories and types
const ROLE_TYPES = {
  // Elected Officers
  WORSHIPFUL_MASTER: 'Worshipful Master',
  SENIOR_WARDEN: 'Senior Warden',
  JUNIOR_WARDEN: 'Junior Warden',
  TREASURER: 'Treasurer',
  SECRETARY: 'Secretary',
  
  // Appointed Officers
  SENIOR_DEACON: 'Senior Deacon',
  JUNIOR_DEACON: 'Junior Deacon',
  SENIOR_STEWARD: 'Senior Steward',
  JUNIOR_STEWARD: 'Junior Steward',
  CHAPLAIN: 'Chaplain',
  MARSHAL: 'Marshal',
  TYLER: 'Tyler',
  MUSICIAN: 'Musician',
  
  // Other Positions
  MASTER_OF_CEREMONIES: 'Master of Ceremonies',
  HISTORIAN: 'Historian',
  LODGE_EDUCATION_OFFICER: 'Lodge Education Officer',
  ALMONER: 'Almoner',
  
  // Regular Members
  MEMBER: 'Member',
  
  // Administration
  DISTRICT_ADMIN: 'District Admin',
  SUPER_ADMIN: 'Super Admin'
};

// Define schemas
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  passwordHash: String,
  role: String,
  status: String,
  lodges: [String],
  primaryLodge: String,
  administeredLodges: [String],
  lodgeRoles: [String], // References to LodgeRole documents
  profileImage: String,
  created: Date,
  lastLogin: Date,
  memberSince: String,
}, { timestamps: true });

const lodgeSchema = new mongoose.Schema({
  name: String,
  location: String,
  foundedYear: String,
  description: String,
  isActive: Boolean,
  members: Number,
}, { timestamps: true });

const lodgeRoleSchema = new mongoose.Schema({
  userId: String,
  lodgeId: String,
  role: String,
  startDate: Date,
  endDate: Date,
  isActive: Boolean,
  notes: String,
}, { timestamps: true });

// Create models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Lodge = mongoose.models.Lodge || mongoose.model('Lodge', lodgeSchema);
const LodgeRole = mongoose.models.LodgeRole || mongoose.model('LodgeRole', lodgeRoleSchema);

// Seed data
async function seedDatabase() {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Lodge.deleteMany({});
    await LodgeRole.deleteMany({});

    console.log('Cleared existing data');

    // Create lodges
    const lodges = await Lodge.create([
      {
        name: 'Phoenix Lodge',
        location: 'Beirut, Lebanon',
        foundedYear: '1920',
        description: 'One of the oldest lodges in Lebanon, focusing on traditional masonic values.',
        isActive: true,
        members: 0,
      },
      {
        name: 'Cedar Lodge',
        location: 'Tripoli, Lebanon',
        foundedYear: '1945',
        description: 'A lodge dedicated to community service and charitable activities.',
        isActive: true,
        members: 0,
      },
      {
        name: 'Harmony Lodge',
        location: 'Tyre, Lebanon',
        foundedYear: '1975',
        description: 'Focusing on brotherhood and philosophical studies.',
        isActive: true,
        members: 0,
      },
      {
        name: 'Mount Lebanon Lodge',
        location: 'Baalbek, Lebanon',
        foundedYear: '1950',
        description: 'Historical lodge with strong ties to local heritage.',
        isActive: false,
        members: 0,
      },
    ]);

    console.log('Created lodges:', lodges.map(lodge => lodge.name));

    // Hash password
    const passwordHash = await bcrypt.hash('password123', 10);

    // Create users
    const users = await User.create([
      {
        name: 'Super Admin',
        email: 'superadmin@example.com',
        passwordHash,
        role: 'SUPER_ADMIN',
        status: 'active',
        lodges: lodges.map(lodge => lodge._id.toString()),
        primaryLodge: lodges[0]._id.toString(),
        administeredLodges: lodges.map(lodge => lodge._id.toString()),
        lodgeRoles: [], // Will be populated after creating lodge roles
        memberSince: '2010',
        created: new Date(),
      },
      {
        name: 'Lodge Admin',
        email: 'lodgeadmin@example.com',
        passwordHash,
        role: 'LODGE_ADMIN',
        status: 'active',
        lodges: [lodges[0]._id.toString()],
        primaryLodge: lodges[0]._id.toString(),
        administeredLodges: [lodges[0]._id.toString()],
        lodgeRoles: [], // Will be populated after creating lodge roles
        memberSince: '2015',
        created: new Date(),
      },
      {
        name: 'Lodge Secretary',
        email: 'secretary@example.com',
        passwordHash,
        role: 'LODGE_MEMBER',
        status: 'active',
        lodges: [lodges[0]._id.toString()],
        primaryLodge: lodges[0]._id.toString(),
        administeredLodges: [],
        lodgeRoles: [], // Will be populated after creating lodge roles
        memberSince: '2018',
        created: new Date(),
      },
      {
        name: 'Regular Member',
        email: 'member@example.com',
        passwordHash,
        role: 'LODGE_MEMBER',
        status: 'active',
        lodges: [lodges[0]._id.toString()],
        primaryLodge: lodges[0]._id.toString(),
        administeredLodges: [],
        lodgeRoles: [], // Will be populated after creating lodge roles
        memberSince: '2020',
        created: new Date(),
      },
    ]);

    console.log('Created users:', users.map(user => `${user.name} (${user.email})`));

    // Create lodge roles
    const lodgeRoles = [];
    
    // Super Admin roles
    lodgeRoles.push(await LodgeRole.create({
      userId: users[0]._id.toString(),
      lodgeId: lodges[0]._id.toString(),
      role: ROLE_TYPES.SUPER_ADMIN,
      startDate: new Date('2010-01-01'),
      isActive: true,
      notes: 'District Administrator'
    }));
    
    // Lodge Admin roles
    lodgeRoles.push(await LodgeRole.create({
      userId: users[1]._id.toString(),
      lodgeId: lodges[0]._id.toString(),
      role: ROLE_TYPES.WORSHIPFUL_MASTER,
      startDate: new Date('2015-01-01'),
      isActive: true,
      notes: 'Current Worshipful Master'
    }));
    
    // Secretary roles
    lodgeRoles.push(await LodgeRole.create({
      userId: users[2]._id.toString(),
      lodgeId: lodges[0]._id.toString(),
      role: ROLE_TYPES.SECRETARY,
      startDate: new Date('2018-01-01'),
      isActive: true,
      notes: 'Current Secretary'
    }));
    
    // Regular member roles
    lodgeRoles.push(await LodgeRole.create({
      userId: users[3]._id.toString(),
      lodgeId: lodges[0]._id.toString(),
      role: ROLE_TYPES.JUNIOR_STEWARD,
      startDate: new Date('2020-01-01'),
      isActive: true,
      notes: 'Current Junior Steward'
    }));
    
    // Add additional roles for demonstration
    const additionalRoles = [
      { userId: users[1]._id.toString(), lodgeId: lodges[1]._id.toString(), role: ROLE_TYPES.SENIOR_WARDEN },
      { userId: users[2]._id.toString(), lodgeId: lodges[1]._id.toString(), role: ROLE_TYPES.JUNIOR_WARDEN },
      { userId: users[3]._id.toString(), lodgeId: lodges[1]._id.toString(), role: ROLE_TYPES.TYLER },
      { userId: users[0]._id.toString(), lodgeId: lodges[1]._id.toString(), role: ROLE_TYPES.DISTRICT_ADMIN },
    ];
    
    for (const roleData of additionalRoles) {
      const role = await LodgeRole.create({
        ...roleData,
        startDate: new Date('2022-01-01'),
        isActive: true,
      });
      lodgeRoles.push(role);
    }
    
    console.log('Created lodge roles:', lodgeRoles.length);
    
    // Update users with lodge role references
    for (const user of users) {
      const userRoles = lodgeRoles.filter(role => role.userId === user._id.toString());
      await User.findByIdAndUpdate(user._id, { 
        lodgeRoles: userRoles.map(role => role._id.toString()) 
      });
    }
    
    console.log('Updated users with lodge role references');

    // Update lodge member counts
    for (const lodge of lodges) {
      const memberCount = await User.countDocuments({ lodges: lodge._id.toString() });
      await Lodge.findByIdAndUpdate(lodge._id, { members: memberCount });
    }

    console.log('Updated lodge member counts');

    console.log('Database seeded successfully!');
    console.log('\nLogin credentials:');
    console.log('Super Admin: superadmin@example.com / password123');
    console.log('Lodge Admin: lodgeadmin@example.com / password123');
    console.log('Lodge Secretary: secretary@example.com / password123');
    console.log('Regular Member: member@example.com / password123');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the seed function
seedDatabase(); 