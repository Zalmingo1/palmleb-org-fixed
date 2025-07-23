import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  lodgeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lodge',
    required: false // Made optional for district-wide events
  },
  districtId: {
    type: String,
    required: false // For district-wide events
  },
  isDistrictWide: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
eventSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Event = mongoose.models.Event || mongoose.model('Event', eventSchema); 