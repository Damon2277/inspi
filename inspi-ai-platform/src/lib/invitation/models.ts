/**
 * 邀请系统数据库模型定义
 */

import { InviteCode, InviteRegistration, RewardRecord, InviteStats, RewardType, RewardSourceType } from './types';

// 邀请码数据库模型
export interface InviteCodeModel {
  id: string
  code: string
  inviter_id: string
  created_at: Date
  expires_at: Date
  is_active: boolean
  usage_count: number
  max_usage: number
}

// 邀请注册数据库模型
export interface InviteRegistrationModel {
  id: string
  invite_code_id: string
  inviter_id: string
  invitee_id: string
  registered_at: Date
  is_activated: boolean
  activated_at?: Date
  rewards_claimed: boolean
}

// 奖励记录数据库模型
export interface RewardRecordModel {
  id: string
  user_id: string
  reward_type: RewardType
  amount?: number
  badge_id?: string
  title_id?: string
  description: string
  granted_at: Date
  expires_at?: Date
  source_type: RewardSourceType
  source_id: string
}

// 邀请统计数据库模型
export interface InviteStatsModel {
  id: string
  user_id: string
  total_invites: number
  successful_registrations: number
  active_invitees: number
  total_rewards_earned: number
  last_updated: Date
}

// 分享统计数据库模型
export interface ShareStatsModel {
  id: string
  invite_code_id: string
  platform: string
  share_count: number
  click_count: number
  conversion_count: number
  created_at: Date
  updated_at: Date
}

// 邀请事件日志数据库模型
export interface InviteEventLogModel {
  id: string
  event_type: string
  inviter_id: string
  invitee_id?: string
  invite_code_id: string
  timestamp: Date
  ip_address?: string
  user_agent?: string
  metadata?: string // JSON string
}

// 防作弊记录数据库模型
export interface FraudDetectionLogModel {
  id: string
  user_id: string
  event_type: string
  risk_score: number
  reasons: string // JSON array
  action_taken: string
  ip_address: string
  device_fingerprint?: string
  detected_at: Date
}

// 奖励配置数据库模型
export interface RewardConfigModel {
  id: string
  event_type: string
  reward_type: RewardType
  amount?: number
  badge_id?: string
  title_id?: string
  description: string
  conditions?: string // JSON string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

// 数据库表创建SQL
export const CREATE_TABLES_SQL = {
  invite_codes: `
    CREATE TABLE IF NOT EXISTS invite_codes (
      id VARCHAR(36) PRIMARY KEY,
      code VARCHAR(20) UNIQUE NOT NULL,
      inviter_id VARCHAR(36) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE,
      usage_count INT DEFAULT 0,
      max_usage INT DEFAULT 100,
      INDEX idx_inviter_id (inviter_id),
      INDEX idx_code (code),
      INDEX idx_active (is_active),
      INDEX idx_expires (expires_at)
    );
  `,

  invite_registrations: `
    CREATE TABLE IF NOT EXISTS invite_registrations (
      id VARCHAR(36) PRIMARY KEY,
      invite_code_id VARCHAR(36) NOT NULL,
      inviter_id VARCHAR(36) NOT NULL,
      invitee_id VARCHAR(36) NOT NULL,
      registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_activated BOOLEAN DEFAULT FALSE,
      activated_at TIMESTAMP NULL,
      rewards_claimed BOOLEAN DEFAULT FALSE,
      INDEX idx_invite_code_id (invite_code_id),
      INDEX idx_inviter_id (inviter_id),
      INDEX idx_invitee_id (invitee_id),
      INDEX idx_registered_at (registered_at),
      UNIQUE KEY unique_invitee (invitee_id)
    );
  `,

  reward_records: `
    CREATE TABLE IF NOT EXISTS reward_records (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      reward_type ENUM('ai_credits', 'badge', 'title', 'premium_access', 'template_unlock') NOT NULL,
      amount INT NULL,
      badge_id VARCHAR(36) NULL,
      title_id VARCHAR(36) NULL,
      description TEXT NOT NULL,
      granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NULL,
      source_type ENUM('invite_registration', 'invite_activation', 'milestone', 'activity') NOT NULL,
      source_id VARCHAR(36) NOT NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_reward_type (reward_type),
      INDEX idx_source_type (source_type),
      INDEX idx_granted_at (granted_at)
    );
  `,

  invite_stats: `
    CREATE TABLE IF NOT EXISTS invite_stats (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      total_invites INT DEFAULT 0,
      successful_registrations INT DEFAULT 0,
      active_invitees INT DEFAULT 0,
      total_rewards_earned INT DEFAULT 0,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_stats (user_id),
      INDEX idx_total_invites (total_invites),
      INDEX idx_successful_registrations (successful_registrations)
    );
  `,

  share_stats: `
    CREATE TABLE IF NOT EXISTS share_stats (
      id VARCHAR(36) PRIMARY KEY,
      invite_code_id VARCHAR(36) NOT NULL,
      platform ENUM('wechat', 'qq', 'dingtalk', 'wework', 'email', 'link') NOT NULL,
      share_count INT DEFAULT 0,
      click_count INT DEFAULT 0,
      conversion_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_invite_code_id (invite_code_id),
      INDEX idx_platform (platform),
      UNIQUE KEY unique_code_platform (invite_code_id, platform)
    );
  `,

  invite_event_logs: `
    CREATE TABLE IF NOT EXISTS invite_event_logs (
      id VARCHAR(36) PRIMARY KEY,
      event_type ENUM('code_generated', 'code_shared', 'link_clicked', 'user_registered', 'user_activated', 'reward_granted') NOT NULL,
      inviter_id VARCHAR(36) NOT NULL,
      invitee_id VARCHAR(36) NULL,
      invite_code_id VARCHAR(36) NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ip_address VARCHAR(45) NULL,
      user_agent TEXT NULL,
      metadata JSON NULL,
      INDEX idx_event_type (event_type),
      INDEX idx_inviter_id (inviter_id),
      INDEX idx_invite_code_id (invite_code_id),
      INDEX idx_timestamp (timestamp)
    );
  `,

  fraud_detection_logs: `
    CREATE TABLE IF NOT EXISTS fraud_detection_logs (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      event_type VARCHAR(50) NOT NULL,
      risk_score DECIMAL(3,2) NOT NULL,
      reasons JSON NOT NULL,
      action_taken ENUM('allow', 'warn', 'block', 'review') NOT NULL,
      ip_address VARCHAR(45) NOT NULL,
      device_fingerprint VARCHAR(255) NULL,
      detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_risk_score (risk_score),
      INDEX idx_action_taken (action_taken),
      INDEX idx_detected_at (detected_at)
    );
  `,

  reward_configs: `
    CREATE TABLE IF NOT EXISTS reward_configs (
      id VARCHAR(36) PRIMARY KEY,
      event_type VARCHAR(50) NOT NULL,
      reward_type ENUM('ai_credits', 'badge', 'title', 'premium_access', 'template_unlock') NOT NULL,
      amount INT NULL,
      badge_id VARCHAR(36) NULL,
      title_id VARCHAR(36) NULL,
      description TEXT NOT NULL,
      conditions JSON NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_event_type (event_type),
      INDEX idx_reward_type (reward_type),
      INDEX idx_is_active (is_active)
    );
  `,

  badges: `
    CREATE TABLE IF NOT EXISTS badges (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      icon_url VARCHAR(255) NOT NULL,
      category ENUM('inviter', 'achiever', 'special', 'seasonal') NOT NULL,
      rarity ENUM('common', 'rare', 'epic', 'legendary') NOT NULL,
      requirements JSON NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_category (category),
      INDEX idx_rarity (rarity),
      INDEX idx_is_active (is_active)
    );
  `,

  user_badges: `
    CREATE TABLE IF NOT EXISTS user_badges (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      badge_id VARCHAR(36) NOT NULL,
      earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_displayed BOOLEAN DEFAULT TRUE,
      INDEX idx_user_id (user_id),
      INDEX idx_badge_id (badge_id),
      UNIQUE KEY unique_user_badge (user_id, badge_id)
    );
  `,

  titles: `
    CREATE TABLE IF NOT EXISTS titles (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      color VARCHAR(7) NOT NULL,
      requirements JSON NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_is_active (is_active)
    );
  `,

  user_titles: `
    CREATE TABLE IF NOT EXISTS user_titles (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      title_id VARCHAR(36) NOT NULL,
      earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT FALSE,
      INDEX idx_user_id (user_id),
      INDEX idx_title_id (title_id),
      UNIQUE KEY unique_user_title (user_id, title_id)
    );
  `,

  credit_records: `
    CREATE TABLE IF NOT EXISTS credit_records (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      amount INT NOT NULL,
      type ENUM('earned', 'used', 'expired', 'refunded') NOT NULL,
      source ENUM('invite_reward', 'milestone_reward', 'activity_reward', 'purchase', 'admin_grant', 'system_refund') NOT NULL,
      source_id VARCHAR(36) NOT NULL,
      description TEXT NOT NULL,
      expires_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      used_at TIMESTAMP NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_type (type),
      INDEX idx_source (source),
      INDEX idx_expires_at (expires_at),
      INDEX idx_created_at (created_at)
    );
  `,

  credit_usage: `
    CREATE TABLE IF NOT EXISTS credit_usage (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      amount INT NOT NULL,
      purpose VARCHAR(255) NOT NULL,
      metadata JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_created_at (created_at)
    );
  `,

  user_credit_balances: `
    CREATE TABLE IF NOT EXISTS user_credit_balances (
      user_id VARCHAR(36) PRIMARY KEY,
      total_earned INT DEFAULT 0,
      total_used INT DEFAULT 0,
      total_expired INT DEFAULT 0,
      available_credits INT DEFAULT 0,
      expiring_credits INT DEFAULT 0,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_available_credits (available_credits),
      INDEX idx_last_updated (last_updated)
    );
  `,
};

// 模型转换函数
export class ModelConverter {
  // 将数据库模型转换为业务模型
  static toInviteCode(model: InviteCodeModel): InviteCode {
    return {
      id: model.id,
      code: model.code,
      inviterId: model.inviter_id,
      createdAt: model.created_at,
      expiresAt: model.expires_at,
      isActive: model.is_active,
      usageCount: model.usage_count,
      maxUsage: model.max_usage,
    };
  }

  static toInviteRegistration(model: InviteRegistrationModel): InviteRegistration {
    return {
      id: model.id,
      inviteCodeId: model.invite_code_id,
      inviterId: model.inviter_id,
      inviteeId: model.invitee_id,
      registeredAt: model.registered_at,
      isActivated: model.is_activated,
      activatedAt: model.activated_at,
      rewardsClaimed: model.rewards_claimed,
    };
  }

  static toRewardRecord(model: RewardRecordModel): RewardRecord {
    return {
      id: model.id,
      userId: model.user_id,
      reward: {
        type: model.reward_type,
        amount: model.amount,
        badgeId: model.badge_id,
        titleId: model.title_id,
        description: model.description,
        expiresAt: model.expires_at,
      },
      grantedAt: model.granted_at,
      sourceType: model.source_type,
      sourceId: model.source_id,
    };
  }

  static toInviteStats(model: InviteStatsModel): InviteStats {
    return {
      userId: model.user_id,
      totalInvites: model.total_invites,
      successfulRegistrations: model.successful_registrations,
      activeInvitees: model.active_invitees,
      totalRewardsEarned: model.total_rewards_earned,
      lastUpdated: model.last_updated,
    };
  }

  // 将业务模型转换为数据库模型
  static fromInviteCode(inviteCode: InviteCode): InviteCodeModel {
    return {
      id: inviteCode.id,
      code: inviteCode.code,
      inviter_id: inviteCode.inviterId,
      created_at: inviteCode.createdAt,
      expires_at: inviteCode.expiresAt,
      is_active: inviteCode.isActive,
      usage_count: inviteCode.usageCount,
      max_usage: inviteCode.maxUsage,
    };
  }

  static fromInviteRegistration(registration: InviteRegistration): InviteRegistrationModel {
    return {
      id: registration.id,
      invite_code_id: registration.inviteCodeId,
      inviter_id: registration.inviterId,
      invitee_id: registration.inviteeId,
      registered_at: registration.registeredAt,
      is_activated: registration.isActivated,
      activated_at: registration.activatedAt,
      rewards_claimed: registration.rewardsClaimed,
    };
  }
}
