import mongoose, { Schema, Document } from 'mongoose';
import { User as UserType } from '@/types';

export interface UserDocument extends Omit<UserType, '_id'>, Document {}

const UserSchema = new Schema<UserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  avatar: {
    type: String,
    default: null,
  },
  password: {
    type: String,
    default: null, // null for OAuth users
  },
  googleId: {
    type: String,
    default: null,
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'pro', 'super'],
      default: 'free',
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
  },
  usage: {
    dailyGenerations: {
      type: Number,
      default: 0,
    },
    dailyReuses: {
      type: Number,
      default: 0,
    },
    lastResetDate: {
      type: Date,
      default: Date.now,
    },
  },
  contributionScore: {
    type: Number,
    default: 0,
  },

}, {
  timestamps: true,
});

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ googleId: 1 });
UserSchema.index({ contributionScore: -1 });

// Methods
UserSchema.methods.resetDailyUsage = function() {
  const now = new Date();
  const lastReset = new Date(this.usage.lastResetDate);
  
  // Reset if it's a new day
  if (now.toDateString() !== lastReset.toDateString()) {
    this.usage.dailyGenerations = 0;
    this.usage.dailyReuses = 0;
    this.usage.lastResetDate = now;
  }
};

UserSchema.methods.canGenerate = function() {
  this.resetDailyUsage();
  
  const limits: Record<string, number> = {
    free: 5,
    pro: 20,
    super: 100,
  };
  
  return this.usage.dailyGenerations < limits[this.subscription.plan as string];
};

UserSchema.methods.canReuse = function() {
  this.resetDailyUsage();
  
  const limits: Record<string, number> = {
    free: 2,
    pro: 10,
    super: 30,
  };
  
  return this.usage.dailyReuses < limits[this.subscription.plan as string];
};

export default mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);