import { ObjectId } from 'mongoose';

// User Types
export interface User {
  _id: ObjectId;
  email: string;
  name: string;
  avatar?: string;
  password?: string; // For email/password authentication
  googleId?: string;
  subscription: {
    plan: 'free' | 'pro' | 'super';
    expiresAt?: Date;
    autoRenew: boolean;
  };
  usage: {
    dailyGenerations: number;
    dailyReuses: number;
    lastResetDate: Date;
  };
  contributionScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  contributionScore: number;
}

// Teaching Card Types
export interface TeachingCard {
  id: string;
  type: 'visualization' | 'analogy' | 'thinking' | 'interaction';
  title: string;
  content: string;
  editable: boolean;
}

// Work Types
export interface Work {
  _id: ObjectId;
  title: string;
  knowledgePoint: string;
  subject: string;
  gradeLevel: string;
  author: ObjectId;
  cards: TeachingCard[];
  tags: string[];
  reuseCount: number;
  originalWork?: ObjectId;
  attribution: Attribution[];
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface Attribution {
  originalAuthor: ObjectId;
  originalWorkId: ObjectId;
  originalWorkTitle: string;
}

export interface WorkSummary {
  id: string;
  title: string;
  author: AuthorInfo;
  knowledgePoint: string;
  subject: string;
  reuseCount: number;
  createdAt: Date;
  thumbnail?: string;
}

export interface AuthorInfo {
  id: string;
  name: string;
  avatar?: string;
}

// Knowledge Graph Types
export interface KnowledgeGraph {
  _id: ObjectId;
  userId: ObjectId;
  type: 'preset' | 'custom';
  subject?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout: 'force' | 'hierarchical' | 'circular';
  createdAt: Date;
  updatedAt: Date;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'subject' | 'topic' | 'work';
  position: { x: number; y: number };
  data: {
    workCount?: number;
    reuseCount?: number;
    color?: string;
  };
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'contains' | 'relates' | 'extends';
  weight?: number;
}

// API Types
export interface LoginRequest {
  email: string;
  password?: string;
  googleToken?: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
  subscription: SubscriptionInfo;
}

export interface SubscriptionInfo {
  plan: 'free' | 'pro' | 'super';
  expiresAt?: Date;
  autoRenew: boolean;
  usage: {
    dailyGenerations: number;
    dailyReuses: number;
    remainingGenerations: number;
    remainingReuses: number;
  };
}

export interface GenerateRequest {
  knowledgePoint: string;
  subject?: string;
  gradeLevel?: string;
}

export interface GenerateResponse {
  cards: TeachingCard[];
  sessionId: string;
}

// Contribution Types
export interface ContributionLog {
  _id: ObjectId;
  userId: ObjectId;
  type: 'creation' | 'reuse';
  points: number;
  workId: ObjectId;
  relatedUserId?: ObjectId;
  createdAt: Date;
}

// Error Types
export interface APIError {
  code: string;
  message: string;
  details?: any;
}

// Pagination Types
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FilterOptions {
  subjects: string[];
  gradeLevels: string[];
  sortOptions: string[];
}