import mongoose from 'mongoose';
import { Schema, models, model } from 'mongoose';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'SUPER_ADMIN' | 'DISTRICT_ADMIN' | 'LODGE_ADMIN' | 'LODGE_MEMBER';
  status: 'active' | 'inactive' | 'pending';
  lodges: string[];
  primaryLodge: string;
  administeredLodges: string[];
  lodgeRoles?: string[]; // References to LodgeRole documents
  profileImage?: string;
  created: Date;
  lastLogin?: Date;
  memberSince?: string;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'DISTRICT_ADMIN', 'LODGE_ADMIN'],
      default: 'LODGE_ADMIN',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'active',
    },
    lodges: {
      type: [String],
      default: [],
    },
    primaryLodge: {
      type: String,
      default: '',
    },
    administeredLodges: {
      type: [String],
      default: [],
    },
    lodgeRoles: {
      type: [String],
      default: [],
      ref: 'LodgeRole'
    },
    profileImage: {
      type: String,
    },
    created: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
    },
    memberSince: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Add index for faster queries
UserSchema.index({ email: 1 });
UserSchema.index({ lodges: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ lodgeRoles: 1 });

// Check if the model already exists to prevent recompilation in development
export default models.User || model<IUser>('User', UserSchema); 