import mongoose, { Document, Schema, Types } from 'mongoose';

import type { QuotaLimits, SubscriptionStatus, UserTier } from '@/shared/types/subscription';

type SubscriptionPlanKey = UserTier | 'super';

export interface UserSubscriptionFeature {
  limit: number;
  used: number;
}

export type UserSubscriptionFeatures = Record<string, UserSubscriptionFeature | undefined>;

export interface UserSubscriptionInfo {
  id?: string;
  plan: string;
  status: SubscriptionStatus;
  tier: UserTier;
  startDate: Date;
  endDate?: Date | null;
  features?: UserSubscriptionFeatures;
  quotas?: Partial<QuotaLimits>;
  metadata?: Record<string, any>;
}

export interface UserUsageInfo {
  dailyGenerations: number;
  dailyReuses: number;
  lastResetDate: Date;
}

export interface UserSettings {
  emailNotifications: boolean;
  publicProfile: boolean;
}

export interface UserAttributes {
  email: string;
  name?: string;
  avatar?: string | null;
  password?: string | null;
  googleId?: string | null;
  emailVerified: boolean;
  emailVerifiedAt?: Date | null;
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
  subscription?: UserSubscriptionInfo | null;
  subscriptionTier: UserTier;
  subscriptionStatus: SubscriptionStatus;
  usage: UserUsageInfo;
  preferences?: Record<string, any>;
  settings: UserSettings;
  roles: string[];
  permissions: string[];
  isBlocked: boolean;
  lastLoginAt?: Date | null;
  contributionScore: number;
  metadata?: Record<string, any>;
}

export interface UserDocument extends Document<Types.ObjectId, any, UserAttributes>, UserAttributes {
  _id: Types.ObjectId;
  resetDailyUsage(): void;
  canGenerate(): boolean;
  canReuse(): boolean;
}

const USER_TIER_VALUES: UserTier[] = ['free', 'basic', 'pro', 'admin'];
const SUBSCRIPTION_STATUS_VALUES: SubscriptionStatus[] = ['active', 'pending', 'suspended', 'expired', 'cancelled'];

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
    trim: true,
  },
  avatar: {
    type: String,
    default: null,
  },
  password: {
    type: String,
    default: null,
    select: false,
  },
  googleId: {
    type: String,
    default: null,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerifiedAt: {
    type: Date,
    default: null,
  },
  emailVerificationToken: {
    type: String,
    default: null,
  },
  emailVerificationExpires: {
    type: Date,
    default: null,
  },
  subscription: {
    type: {
      id: { type: String, default: null },
      plan: { type: String, default: 'free' },
      status: { type: String, enum: SUBSCRIPTION_STATUS_VALUES, default: 'active' },
      tier: { type: String, enum: USER_TIER_VALUES, default: 'free' },
      startDate: { type: Date, default: Date.now },
      endDate: { type: Date, default: null },
      features: { type: Schema.Types.Mixed, default: {} },
      quotas: { type: Schema.Types.Mixed, default: {} },
      metadata: { type: Schema.Types.Mixed, default: {} },
    },
    default: () => ({
      plan: 'free',
      status: 'active',
      tier: 'free',
      startDate: new Date(),
      features: {},
      quotas: {},
      metadata: {},
    }),
  },
  subscriptionTier: {
    type: String,
    enum: USER_TIER_VALUES,
    default: 'free',
    index: true,
  },
  subscriptionStatus: {
    type: String,
    enum: SUBSCRIPTION_STATUS_VALUES,
    default: 'active',
    index: true,
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
  preferences: {
    type: Schema.Types.Mixed,
    default: {},
  },
  settings: {
    emailNotifications: { type: Boolean, default: true },
    publicProfile: { type: Boolean, default: true },
  },
  roles: {
    type: [String],
    default: ['user'],
  },
  permissions: {
    type: [String],
    default: [],
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  lastLoginAt: {
    type: Date,
    default: null,
  },
  contributionScore: {
    type: Number,
    default: 0,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

UserSchema.index({ email: 1 });
UserSchema.index({ googleId: 1 });
UserSchema.index({ contributionScore: -1 });
UserSchema.index({ roles: 1 });

const GENERATION_LIMITS: Record<SubscriptionPlanKey, number> = {
  free: 5,
  basic: 10,
  pro: 20,
  admin: 50,
  super: 100,
};

const REUSE_LIMITS: Record<SubscriptionPlanKey, number> = {
  free: 2,
  basic: 5,
  pro: 10,
  admin: 15,
  super: 30,
};

function resolvePlanKey(user: UserDocument): SubscriptionPlanKey {
  return (user.subscriptionTier || user.subscription?.plan || 'free') as SubscriptionPlanKey;
}

UserSchema.methods.resetDailyUsage = function (this: UserDocument) {
  const now = new Date();
  const lastReset = new Date(this.usage.lastResetDate);

  if (now.toDateString() !== lastReset.toDateString()) {
    this.usage.dailyGenerations = 0;
    this.usage.dailyReuses = 0;
    this.usage.lastResetDate = now;
  }
};

UserSchema.methods.canGenerate = function (this: UserDocument) {
  this.resetDailyUsage();
  const plan = resolvePlanKey(this);
  const limit = GENERATION_LIMITS[plan] ?? GENERATION_LIMITS.free;
  return this.usage.dailyGenerations < limit;
};

UserSchema.methods.canReuse = function (this: UserDocument) {
  this.resetDailyUsage();
  const plan = resolvePlanKey(this);
  const limit = REUSE_LIMITS[plan] ?? REUSE_LIMITS.free;
  return this.usage.dailyReuses < limit;
};

const UserModel = (mongoose.models.User as mongoose.Model<UserDocument> | undefined) ||
  mongoose.model<UserDocument>('User', UserSchema);

export default UserModel;
