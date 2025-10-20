// Core type definitions for the application

// User types
export interface User {
  id: string;
  _id?: string;
  email: string;
  name: string;
  username?: string;
  avatar?: string;
  role: 'user' | 'admin' | 'moderator';
  verified: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  subscription?: {
    tier: 'free' | 'basic' | 'premium' | 'enterprise';
    status: 'active' | 'canceled' | 'expired';
    expiresAt?: Date | string;
  };
  stats?: {
    worksCreated: number;
    likesReceived: number;
  };
}

export interface UserProfile extends Omit<User, 'subscription'> {
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  badges?: string[];
  expertiseAreas?: string[];
  subscription?: SubscriptionInfo | null;
}

// Work types
export interface Work {
  id: string;
  _id?: string;
  title: string;
  content: string;
  description?: string;
  authorId: string;
  author?: User;
  type: 'card' | 'article' | 'template' | 'tutorial';
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  likes: number;
  views: number;
  comments?: Comment[];
  createdAt: Date | string;
  updatedAt: Date | string;
  publishedAt?: Date | string;
  metadata?: Record<string, any>;
}

// Comment types
export interface Comment {
  id: string;
  _id?: string;
  content: string;
  authorId: string;
  author?: User;
  workId: string;
  parentId?: string;
  replies?: Comment[];
  likes: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Knowledge Graph types
export interface GraphNode {
  id: string;
  label: string;
  type: 'concept' | 'topic' | 'skill' | 'resource';
  x?: number;
  y?: number;
  radius?: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  weight?: number;
  type?: 'relates' | 'requires' | 'leads_to' | 'contains';
}

export interface KnowledgeGraph {
  id: string;
  name: string;
  description?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  ownerId: string;
  visibility: 'public' | 'private' | 'shared';
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Subscription types
export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: 'free' | 'basic' | 'premium' | 'enterprise';
  price: number;
  currency: string;
  features: string[];
  limits: {
    worksPerMonth: number;
    storageGB: number;
    aiGenerations: number;
    collaborators: number;
  };
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  plan?: SubscriptionPlan;
  status: 'active' | 'canceled' | 'expired' | 'pending';
  startDate: Date | string;
  endDate?: Date | string;
  billingCycle: 'monthly' | 'yearly';
  paymentMethod?: string;
  autoRenew: boolean;
}

export interface SubscriptionInfo {
  id?: string;
  plan: string;
  status: 'active' | 'pending' | 'suspended' | 'expired' | 'cancelled';
  tier: 'free' | 'basic' | 'pro' | 'admin';
  startDate: Date | string;
  endDate?: Date | string | null;
  features?: Record<string, { limit: number; used: number }>;
  quotas?: Partial<{
    dailyGenerations: number;
    dailyReuses: number;
    exportLimit: number;
    graphNodes: number;
  }>;
  metadata?: Record<string, any>;
  isActive?: boolean;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'like' | 'comment' | 'mention';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date | string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Form types
export interface FormError {
  field: string;
  message: string;
}

export interface FormState<T = any> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isValid: boolean;
}

// Activity types
export interface Activity {
  id: string;
  name: string;
  description: string;
  type: 'challenge' | 'contest' | 'event' | 'campaign';
  status: 'upcoming' | 'active' | 'completed' | 'canceled';
  startDate: Date | string;
  endDate: Date | string;
  rewards?: Reward[];
  participants: string[];
  rules?: string[];
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Reward {
  id: string;
  type: 'points' | 'badge' | 'prize' | 'discount';
  value: number | string;
  description: string;
  conditions?: string[];
}

// Contribution types
export interface Contribution {
  id: string;
  userId: string;
  type: 'work' | 'comment' | 'review' | 'translation' | 'moderation';
  targetId: string;
  points: number;
  description?: string;
  verified: boolean;
  createdAt: Date | string;
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  user?: User;
  score: number;
  change?: number; // Position change from previous period
  stats?: {
    worksCreated: number;
    likesReceived: number;
    commentsReceated: number;
  };
}

// Card types (for AI generation)
export interface Card {
  id: string;
  title: string;
  content: string;
  type: 'knowledge' | 'inspiration' | 'tutorial' | 'template';
  category?: string;
  tags: string[];
  style?: 'minimal' | 'detailed' | 'visual' | 'interactive';
  metadata?: {
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime?: string;
    prerequisites?: string[];
  };
  generatedBy?: 'ai' | 'user';
  prompt?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Share types
export interface ShareData {
  url: string;
  title?: string;
  text?: string;
  imageUrl?: string;
}

// Settings types
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    digest: 'daily' | 'weekly' | 'never';
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends';
    showEmail: boolean;
    showStats: boolean;
  };
  preferences: {
    autoSave: boolean;
    compactView: boolean;
    showTutorials: boolean;
  };
}

// Error types
export interface AppError extends Error {
  code?: string;
  status?: number;
  details?: any;
}

// Export all types as a namespace for global usage
