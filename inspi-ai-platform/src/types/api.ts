// API-specific type definitions

import { User, Work, Comment, KnowledgeGraph, Notification, Activity, Contribution } from './index';

// Request types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  username?: string;
  acceptTerms: boolean;
}

export interface UpdateProfileRequest {
  name?: string;
  username?: string;
  avatar?: string;
  bio?: string;
}

export interface CreateWorkRequest {
  title: string;
  content: string;
  description?: string;
  type: 'card' | 'article' | 'template' | 'tutorial';
  tags?: string[];
  status?: 'draft' | 'published';
  metadata?: Record<string, any>;
}

export interface UpdateWorkRequest extends Partial<CreateWorkRequest> {
  id: string;
}

export interface CreateCommentRequest {
  content: string;
  workId: string;
  parentId?: string;
}

export interface CreateGraphRequest {
  name: string;
  description?: string;
  visibility?: 'public' | 'private' | 'shared';
  nodes?: any[];
  edges?: any[];
}

// Response types
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface WorkResponse {
  work: Work;
  related?: Work[];
  author: User;
  stats: {
    likes: number;
    views: number;
    comments: number;
    shares: number;
  };
}

export interface CommentResponse {
  comment: Comment;
  author: User;
  replies?: CommentResponse[];
}

export interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
  hasMore: boolean;
}

export interface GraphResponse {
  graph: KnowledgeGraph;
  owner: User;
  collaborators?: User[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    depth: number;
  };
}

export interface ActivityResponse {
  activity: Activity;
  participants: User[];
  leaderboard?: Array<{
    rank: number;
    user: User;
    score: number;
  }>;
}

export interface StatsResponse {
  users: {
    total: number;
    active: number;
    new: number;
  };
  works: {
    total: number;
    published: number;
    drafts: number;
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  period?: string;
}

export interface SearchResponse<T> {
  results: T[];
  total: number;
  page: number;
  limit: number;
  query: string;
  filters?: Record<string, any>;
}

// Error response
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
  status: number;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedData<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Filter types
export interface WorkFilters {
  type?: Work['type'];
  status?: Work['status'];
  authorId?: string;
  tags?: string[];
  dateFrom?: Date | string;
  dateTo?: Date | string;
}

export interface UserFilters {
  role?: User['role'];
  verified?: boolean;
  subscriptionTier?: string;
  createdFrom?: Date | string;
  createdTo?: Date | string;
}

// Sort options
export type SortField = 'createdAt' | 'updatedAt' | 'likes' | 'views' | 'title' | 'name';
export type SortOrder = 'asc' | 'desc';

export interface SortOptions {
  field: SortField;
  order: SortOrder;
}

// Batch operations
export interface BatchOperation<T> {
  operation: 'create' | 'update' | 'delete';
  data: T[];
}

export interface BatchResponse<T> {
  successful: T[];
  failed: Array<{
    item: T;
    error: string;
  }>;
  total: number;
  successCount: number;
  failureCount: number;
}

// WebSocket event types
export interface WebSocketEvent {
  type: 'notification' | 'update' | 'delete' | 'presence';
  payload: any;
  timestamp: string;
}

export interface PresenceUpdate {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen?: Date | string;
}

// File upload types
export interface FileUploadRequest {
  file: File;
  type: 'image' | 'document' | 'video';
  purpose: 'avatar' | 'work' | 'attachment';
}

export interface FileUploadResponse {
  url: string;
  key: string;
  size: number;
  mimeType: string;
  metadata?: Record<string, any>;
}

// Export types
export interface ExportRequest {
  format: 'json' | 'csv' | 'pdf';
  type: 'works' | 'users' | 'statistics';
  filters?: Record<string, any>;
  dateRange?: {
    from: Date | string;
    to: Date | string;
  };
}

export interface ExportResponse {
  downloadUrl: string;
  expiresAt: Date | string;
  size: number;
  recordCount: number;
}
