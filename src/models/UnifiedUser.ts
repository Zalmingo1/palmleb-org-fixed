import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Unified User Schema that combines features from both users and members
const unifiedUserSchema = new mongoose.Schema({
  // Core identification
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  
  // Name fields (support both single name and first/last name)
  name: {
    type: String,
    required: true,
    trim: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  
  // Role and status
  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'LODGE_ADMIN', 'LODGE_MEMBER'],
    default: 'LODGE_MEMBER'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  },
  
  // Contact information
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
  
  // Professional information
  occupation: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    trim: true
  },
  interests: [{
    type: String,
    trim: true
  }],
  
  // Profile and media
  profileImage: {
    type: String
  },
  
  // Lodge associations
  primaryLodge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lodge'
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
    default: 'MEMBER'
  },
  
  // Multiple lodge memberships
  lodges: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lodge'
  }],
  
  // Detailed lodge memberships with positions
  lodgeMemberships: [{
    lodge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lodge',
      required: true
    },
    position: {
      type: String,
      enum: [
        'WORSHIPFUL_MASTER',
        'SENIOR_WARDEN',
        'JUNIOR_WARDEN',
        'TREASURER',
        'SECRETARY',
        'SENIOR_DEACON',
        'JUNIOR_DEACON',
        'SENIOR_STEWARD',
        'JUNIOR_STEWARD',
        'CHAPLAIN',
        'MARSHAL',
        'TYLER',
        'MUSICIAN',
        'MASTER_OF_CEREMONIES',
        'HISTORIAN',
        'LODGE_EDUCATION_OFFICER',
        'ALMONER',
        'MEMBER'
      ],
      required: true
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Administered lodges (for admins)
  administeredLodges: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lodge'
  }],
  
  // Timestamps
  memberSince: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  
  // Legacy fields for compatibility
  created: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for performance
unifiedUserSchema.index({ email: 1 });
unifiedUserSchema.index({ role: 1 });
unifiedUserSchema.index({ primaryLodge: 1 });
unifiedUserSchema.index({ lodges: 1 });
unifiedUserSchema.index({ status: 1 });

// Pre-save middleware to ensure name consistency
unifiedUserSchema.pre('save', function(next) {
  // If firstName and lastName are set but name is not, construct name
  if (this.firstName && this.lastName && !this.name) {
    this.name = `${this.firstName} ${this.lastName}`.trim();
  }
  
  // If name is set but firstName/lastName are not, split name
  if (this.name && (!this.firstName || !this.lastName)) {
    const nameParts = this.name.split(' ');
    this.firstName = nameParts[0] || '';
    this.lastName = nameParts.slice(1).join(' ') || '';
  }
  
  // Ensure lodges array includes primaryLodge
  if (this.primaryLodge && this.lodges && !this.lodges.includes(this.primaryLodge)) {
    this.lodges.push(this.primaryLodge);
  }
  
  next();
});

// Instance methods
unifiedUserSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.passwordHash; // Don't send password hash
  return obj;
};

// Password comparison method
unifiedUserSchema.methods.comparePassword = async function(candidatePassword: string) {
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    throw error;
  }
};

// Hash password method
unifiedUserSchema.methods.hashPassword = async function(password: string) {
  try {
    this.passwordHash = await bcrypt.hash(password, 12);
    return this.passwordHash;
  } catch (error) {
    throw error;
  }
};

// Virtual for full name
unifiedUserSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.name;
});

// Method to check if user has access to a specific lodge
unifiedUserSchema.methods.hasLodgeAccess = function(lodgeId: string) {
  if (!this.lodges || this.lodges.length === 0) return false;
  return this.lodges.some(lodge => lodge.toString() === lodgeId);
};

// Method to check if user is admin of a specific lodge
unifiedUserSchema.methods.isLodgeAdmin = function(lodgeId: string) {
  if (this.role === 'SUPER_ADMIN' || this.role === 'DISTRICT_ADMIN') return true;
  if (this.role !== 'LODGE_ADMIN') return false;
  
  return this.administeredLodges && 
         this.administeredLodges.some(lodge => lodge.toString() === lodgeId);
};

const UnifiedUser = mongoose.models.UnifiedUser || mongoose.model('UnifiedUser', unifiedUserSchema);

export default UnifiedUser; 