const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/palm-leb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

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
  lodgeRoles: [String],
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

const memberSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  role: String,
  phone: String,
  address: String,
  city: String,
  state: String,
  zipCode: String,
  country: String,
  occupation: String,
  interests: [String],
  bio: String,
  profileImage: String,
  primaryLodge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lodge'
  },
  primaryLodgePosition: String,
  lodgeMemberships: [{
    lodge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lodge'
    },
    position: String
  }],
  memberSince: Date,
  status: String
}, { timestamps: true });

// Create models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Lodge = mongoose.models.Lodge || mongoose.model('Lodge', lodgeSchema);
const Member = mongoose.models.Member || mongoose.model('Member', memberSchema);

async function createDistrictLodge() {
  try {
    console.log('Creating District Grand Lodge of Syria-Lebanon...');

    // Create the District Grand Lodge
    const districtLodge = await Lodge.create({
      name: 'District Grand Lodge of Syria-Lebanon',
      location: 'Beirut, Lebanon',
      foundedYear: '1920',
      description: 'The governing body for Freemasonry in Syria and Lebanon, overseeing all lodges in the region.',
      isActive: true,
      members: 0,
    });

    console.log('Created District Grand Lodge:', districtLodge.name);

    // Hash password for the district admin
    const passwordHash = await bcrypt.hash('Qwe123123', 10);

    // Create district admin user
    const districtAdmin = await User.create({
      name: 'District Grand Master',
      email: 'districtadmin@example.com',
      passwordHash,
      role: 'DISTRICT_ADMIN',
      status: 'active',
      lodges: [districtLodge._id.toString()],
      primaryLodge: districtLodge._id.toString(),
      administeredLodges: [districtLodge._id.toString()],
      lodgeRoles: [],
      memberSince: '2010',
      created: new Date(),
    });

    console.log('Created District Admin User:', districtAdmin.name);

    // Also create a Member record for the district admin
    const districtAdminMember = await Member.create({
      firstName: 'District',
      lastName: 'Grand Master',
      email: 'districtadmin@example.com',
      password: await bcrypt.hash('Qwe123123', 10),
      role: 'DISTRICT_ADMIN',
      phone: '+961-1-123456',
      address: 'Grand Lodge Building',
      city: 'Beirut',
      state: 'Beirut',
      country: 'Lebanon',
      occupation: 'District Grand Master',
      bio: 'District Grand Master of the District Grand Lodge of Syria-Lebanon',
      primaryLodge: districtLodge._id,
      primaryLodgePosition: 'WORSHIPFUL_MASTER',
      memberSince: new Date('2010-01-01'),
      status: 'active'
    });

    console.log('Created District Admin Member:', districtAdminMember.firstName + ' ' + districtAdminMember.lastName);

    // Update lodge member count
    await Lodge.findByIdAndUpdate(districtLodge._id, { members: 1 });

    console.log('Successfully created District Grand Lodge of Syria-Lebanon with district admin');
    console.log('District Admin Login:');
    console.log('Email: districtadmin@example.com');
    console.log('Password: Qwe123123');

  } catch (error) {
    console.error('Error creating district lodge:', error);
  } finally {
    mongoose.connection.close();
  }
}

createDistrictLodge(); 