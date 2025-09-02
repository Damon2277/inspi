/**
 * 复用和致敬系统类型定义
 */

// 复用权限类型
export type ReusePermission = 'allowed' | 'denied' | 'quota_exceeded' | 'self_work';

// 复用状态
export type ReuseStatus = 'pending' | 'completed' | 'failed';

// 归属信息接口
export interface Attribution {
  id: string;
  originalWorkId: string;
  originalWorkTitle: string;
  originalAuthorId: string;
  originalAuthorName: string;
  reuseDate: string;
  reuseType: 'full' | 'partial';
}

// 复用记录接口
export interface ReuseRecord {
  id: string;
  originalWorkId: string;
  newWorkId: string;
  userId: string;
  reuseDate: string;
  status: ReuseStatus;
  attribution: Attribution;
  reuseType: 'full' | 'partial';
  reuseCount: number; // 该用户复用此作品的次数
}

// 复用请求接口
export interface ReuseRequest {
  workId: string;
  reuseType: 'full' | 'partial';
  targetTitle?: string; // 新作品标题
}

// 复用响应接口
export interface ReuseResponse {
  success: boolean;
  message: string;
  data?: {
    newWorkId: string;
    attribution: Attribution;
    reuseRecord: ReuseRecord;
  };
  error?: string;
}

// 复用权限检查结果
export interface ReusePermissionCheck {
  permission: ReusePermission;
  reason?: string;
  quotaUsed?: number;
  quotaLimit?: number;
  canReuse: boolean;
}

// 复用统计信息
export interface ReuseStats {
  totalReuses: number;
  uniqueReusers: number;
  reusesByMonth: Array<{
    month: string;
    count: number;
  }>;
  topReusers: Array<{
    userId: string;
    userName: string;
    reuseCount: number;
  }>;
}

// 归属显示配置
export interface AttributionDisplayConfig {
  showAuthor: boolean;
  showWorkTitle: boolean;
  showReuseDate: boolean;
  format: 'full' | 'compact' | 'minimal';
  linkToOriginal: boolean;
}

// 复用按钮配置
export interface ReuseButtonConfig {
  showConfirmDialog: boolean;
  requireTitle: boolean;
  allowPartialReuse: boolean;
  customText?: string;
}

// 复用限制配置
export interface ReuseLimits {
  dailyLimit: number;
  monthlyLimit: number;
  totalLimit: number;
  cooldownPeriod: number; // 同一作品复用冷却时间(小时)
}

// 用户复用配额信息
export interface UserReuseQuota {
  userId: string;
  dailyUsed: number;
  monthlyUsed: number;
  totalUsed: number;
  lastReuseDate: string;
  limits: ReuseLimits;
}

// 作品复用信息
export interface WorkReuseInfo {
  workId: string;
  totalReuses: number;
  canBeReused: boolean;
  reusePermission: ReusePermission;
  attribution: Attribution[];
  reuseStats: ReuseStats;
}

// 复用事件类型
export type ReuseEventType = 
  | 'reuse_requested'
  | 'reuse_completed'
  | 'reuse_failed'
  | 'attribution_generated'
  | 'quota_exceeded';

// 复用事件接口
export interface ReuseEvent {
  id: string;
  type: ReuseEventType;
  userId: string;
  workId: string;
  timestamp: string;
  data: Record<string, any>;
}

// 复用服务配置
export interface ReuseServiceConfig {
  enableReuse: boolean;
  requireAttribution: boolean;
  allowSelfReuse: boolean;
  defaultLimits: ReuseLimits;
  attributionFormat: string;
}

// 导出所有类型的联合类型，便于类型检查
export type ReuseSystemTypes = 
  | Attribution
  | ReuseRecord
  | ReuseRequest
  | ReuseResponse
  | ReusePermissionCheck
  | ReuseStats
  | UserReuseQuota
  | WorkReuseInfo
  | ReuseEvent;