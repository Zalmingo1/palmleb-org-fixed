import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const memberSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'LODGE_ADMIN', 'LODGE_MEMBER'],
    default: 'LODGE_MEMBER'
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  zipCode: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true
  },
  occupation: {
    type: String,
    trim: true
  },
  interests: [{
    type: String,
    trim: true
  }],
  bio: {
    type: String,
    trim: true
  },
  profileImage: {
    type: String
  },
  primaryLodge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lodge',
    required: true
  },
  primaryLodgePosition: {
    type: String,
    enum: [
      // Elected Officers
      'WORSHIPFUL_MASTER',
      'SENIOR_WARDEN',
      'JUNIOR_WARDEN',
      'TREASURER',
      'SECRETARY',
      
      // Appointed Officers
      'SENIOR_DEACON',
      'JUNIOR_DEACON',
      'SENIOR_STEWARD',
      'JUNIOR_STEWARD',
      'CHAPLAIN',
      'MARSHAL',
      'TYLER',
      'MUSICIAN',
      
      // Other Positions
      'MASTER_OF_CEREMONIES',
      'HISTORIAN',
      'LODGE_EDUCATION_OFFICER',
      'ALMONER',
      'MEMBER'
    ],
    required: true
  },
  // Simple array of lodge IDs for compatibility with events API
  lodges: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lodge'
  }],
  lodgeMemberships: [{
    lodge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lodge',
      required: true
    },
    position: {
      type: String,
      enum: [
        // Elected Officers
        'WORSHIPFUL_MASTER',
        'SENIOR_WARDEN',
        'JUNIOR_WARDEN',
        'TREASURER',
        'SECRETARY',
        
        // Appointed Officers
        'SENIOR_DEACON',
        'JUNIOR_DEACON',
        'SENIOR_STEWARD',
        'JUNIOR_STEWARD',
        'CHAPLAIN',
        'MARSHAL',
        'TYLER',
        'MUSICIAN',
        
        // Other Positions
        'MASTER_OF_CEREMONIES',
        'HISTORIAN',
        'LODGE_EDUCATION_OFFICER',
        'ALMONER',
        'MEMBER'
      ],
      required: true
    }
  }],
  memberSince: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Create indexes
memberSchema.index({ email: 1 });
memberSchema.index({ primaryLodge: 1 });
memberSchema.index({ 'lodgeMemberships.lodge': 1 });
memberSchema.index({ lodges: 1 });

// Hash password before saving
memberSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Add any instance methods here
memberSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password; // Don't send password
  return obj;
};

// Add method to compare password
memberSchema.methods.comparePassword = async function(candidatePassword: string) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

const Member = mongoose.models.Member || mongoose.model('Member', memberSchema);

export default Member; 