import mongoose from 'mongoose';
import { Schema, model, models } from 'mongoose';

// Define the role categories
export const ROLE_CATEGORIES = {
  ELECTED_OFFICERS: 'Elected Officers',
  APPOINTED_OFFICERS: 'Appointed Officers',
  OTHER_POSITIONS: 'Other Positions'
};

// Define the role types
export const ROLE_TYPES = {
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
  ALMONER: 'Almoner'
};

// Define the mapping of roles to categories
export const ROLE_TO_CATEGORY = {
  [ROLE_TYPES.WORSHIPFUL_MASTER]: ROLE_CATEGORIES.ELECTED_OFFICERS,
  [ROLE_TYPES.SENIOR_WARDEN]: ROLE_CATEGORIES.ELECTED_OFFICERS,
  [ROLE_TYPES.JUNIOR_WARDEN]: ROLE_CATEGORIES.ELECTED_OFFICERS,
  [ROLE_TYPES.TREASURER]: ROLE_CATEGORIES.ELECTED_OFFICERS,
  [ROLE_TYPES.SECRETARY]: ROLE_CATEGORIES.ELECTED_OFFICERS,
  
  [ROLE_TYPES.SENIOR_DEACON]: ROLE_CATEGORIES.APPOINTED_OFFICERS,
  [ROLE_TYPES.JUNIOR_DEACON]: ROLE_CATEGORIES.APPOINTED_OFFICERS,
  [ROLE_TYPES.SENIOR_STEWARD]: ROLE_CATEGORIES.APPOINTED_OFFICERS,
  [ROLE_TYPES.JUNIOR_STEWARD]: ROLE_CATEGORIES.APPOINTED_OFFICERS,
  [ROLE_TYPES.CHAPLAIN]: ROLE_CATEGORIES.APPOINTED_OFFICERS,
  [ROLE_TYPES.MARSHAL]: ROLE_CATEGORIES.APPOINTED_OFFICERS,
  [ROLE_TYPES.TYLER]: ROLE_CATEGORIES.APPOINTED_OFFICERS,
  [ROLE_TYPES.MUSICIAN]: ROLE_CATEGORIES.APPOINTED_OFFICERS,
  
  [ROLE_TYPES.MASTER_OF_CEREMONIES]: ROLE_CATEGORIES.OTHER_POSITIONS,
  [ROLE_TYPES.HISTORIAN]: ROLE_CATEGORIES.OTHER_POSITIONS,
  [ROLE_TYPES.LODGE_EDUCATION_OFFICER]: ROLE_CATEGORIES.OTHER_POSITIONS,
  [ROLE_TYPES.ALMONER]: ROLE_CATEGORIES.OTHER_POSITIONS
};

// Define the LodgeRole schema
export interface ILodgeRole {
  _id: string;
  userId: string;
  lodgeId: string;
  role: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  notes?: string;
}

const LodgeRoleSchema = new Schema<ILodgeRole>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      ref: 'User'
    },
    lodgeId: {
      type: String,
      required: [true, 'Lodge ID is required'],
      ref: 'Lodge'
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: Object.values(ROLE_TYPES),
      default: ROLE_TYPES.MEMBER
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
    },
    notes: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Add indexes for faster queries
LodgeRoleSchema.index({ userId: 1, lodgeId: 1, role: 1 });
LodgeRoleSchema.index({ lodgeId: 1, role: 1 });
LodgeRoleSchema.index({ userId: 1, isActive: 1 });

// Check if the model already exists to prevent recompilation in development
export default models.LodgeRole || model<ILodgeRole>('LodgeRole', LodgeRoleSchema); 