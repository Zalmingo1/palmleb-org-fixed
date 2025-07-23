const mongoose = require('mongoose');
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

async function fixDistrictLodgeMembers() {
  try {
    console.log('Fixing District Grand Lodge member count...');

    // Find the District Grand Lodge
    const districtLodge = await Lodge.findOne({ name: 'District Grand Lodge of Syria-Lebanon' });
    
    if (!districtLodge) {
      console.log('District Grand Lodge not found. Creating it...');
      const newDistrictLodge = await Lodge.create({
        name: 'District Grand Lodge of Syria-Lebanon',
        location: 'Beirut, Lebanon',
        foundedYear: '1920',
        description: 'The governing body for Freemasonry in Syria and Lebanon, overseeing all lodges in the region.',
        isActive: true,
        members: 0,
      });
      console.log('Created District Grand Lodge:', newDistrictLodge.name);
    }

    // Find the district admin user
    const districtAdminUser = await User.findOne({ email: 'districtadmin@example.com' });
    const districtAdminMember = await Member.findOne({ email: 'districtadmin@example.com' });

    if (!districtAdminUser) {
      console.log('District admin user not found. Creating...');
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('Qwe123123', 10);
      
      await User.create({
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
      console.log('Created District Admin User');
    }

    if (!districtAdminMember) {
      console.log('District admin member not found. Creating...');
      const bcrypt = require('bcryptjs');
      
      await Member.create({
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
      console.log('Created District Admin Member');
    }

    // Count members for the District Grand Lodge
    const userCount = await User.countDocuments({ 
      lodges: districtLodge._id.toString() 
    });
    
    const memberCount = await Member.countDocuments({ 
      primaryLodge: districtLodge._id 
    });

    console.log('User count for District Grand Lodge:', userCount);
    console.log('Member count for District Grand Lodge:', memberCount);

    // Update the lodge member count
    const totalMembers = Math.max(userCount, memberCount);
    await Lodge.findByIdAndUpdate(districtLodge._id, { 
      members: totalMembers 
    });

    console.log('Updated District Grand Lodge member count to:', totalMembers);

    // Verify the update
    const updatedLodge = await Lodge.findById(districtLodge._id);
    console.log('Final lodge member count:', updatedLodge.members);

    // List all members of the District Grand Lodge
    const users = await User.find({ lodges: districtLodge._id.toString() });
    const members = await Member.find({ primaryLodge: districtLodge._id });

    console.log('\nUsers in District Grand Lodge:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.role}`);
    });

    console.log('\nMembers in District Grand Lodge:');
    members.forEach(member => {
      console.log(`- ${member.firstName} ${member.lastName} (${member.email}) - ${member.role}`);
    });

  } catch (error) {
    console.error('Error fixing district lodge members:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixDistrictLodgeMembers(); 