import mongoose from 'mongoose';

const lodgeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  number: {
    type: String,
    required: false,
    trim: true,
    default: 'N/A' // Set a default value that won't cause validation issues
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  coordinates: {
    lat: {
      type: Number,
      default: 33.8938 // Default to Beirut coordinates
  },
    lng: {
      type: Number,
      default: 35.5018
    }
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  foundedYear: {
    type: String,
    trim: true,
    default: ''
  },
  logoImage: {
    type: String
  },
  backgroundImage: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  officers: [{
    position: {
      type: String,
      enum: ['WORSHIPFUL_MASTER', 'SENIOR_WARDEN', 'JUNIOR_WARDEN', 'TREASURER', 'SECRETARY', 'SENIOR_DEACON', 'JUNIOR_DEACON', 'STEWARD', 'TYLER', 'MARSHAL', 'ORGANIST', 'CHAPLAIN', 'SENIOR_STEWARD', 'JUNIOR_STEWARD', 'TILER'],
      required: true
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member'
    }
  }],
  events: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    date: {
      type: Date,
      required: true
    },
    description: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true
    }
  }]
}, {
  timestamps: true,
  versionKey: false, // Disable version key
  collection: 'lodges' // Explicitly set the collection name
});

// Create indexes
lodgeSchema.index({ name: 1 });
lodgeSchema.index({ location: 1 });

// Use the original model name but with explicit collection
const Lodge = mongoose.models.Lodge || mongoose.model('Lodge', lodgeSchema);

export default Lodge; 