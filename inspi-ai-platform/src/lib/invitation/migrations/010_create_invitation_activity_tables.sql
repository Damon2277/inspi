-- 邀请活动系统数据库表结构
-- Migration: 010_create_invitation_activity_tables.sql

-- 邀请活动表
CREATE TABLE IF NOT EXISTS invitation_activities (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('challenge', 'competition', 'milestone', 'seasonal') NOT NULL,
  status ENUM('draft', 'active', 'paused', 'completed', 'cancelled') DEFAULT 'draft',
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  rules JSON NOT NULL,
  target_metrics JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_type (type),
  INDEX idx_dates (start_date, end_date),
  INDEX idx_active (is_active)
);

-- 活动奖励表
CREATE TABLE IF NOT EXISTS activity_rewards (
  id VARCHAR(36) PRIMARY KEY,
  activity_id VARCHAR(36) NOT NULL,
  reward_type ENUM('ai_credits', 'badge', 'title', 'premium_access', 'template_unlock') NOT NULL,
  reward_amount INT NOT NULL DEFAULT 0,
  description TEXT,
  rank_min INT DEFAULT 1,
  rank_max INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES invitation_activities(id) ON DELETE CASCADE,
  INDEX idx_activity_id (activity_id),
  INDEX idx_reward_type (reward_type),
  INDEX idx_rank_range (rank_min, rank_max)
);

-- 活动参与者表
CREATE TABLE IF NOT EXISTS activity_participants (
  id VARCHAR(36) PRIMARY KEY,
  activity_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'inactive', 'disqualified') DEFAULT 'active',
  FOREIGN KEY (activity_id) REFERENCES invitation_activities(id) ON DELETE CASCADE,
  UNIQUE KEY unique_activity_user (activity_id, user_id),
  INDEX idx_activity_id (activity_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);

-- 活动进度表
CREATE TABLE IF NOT EXISTS activity_progress (
  id VARCHAR(36) PRIMARY KEY,
  activity_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  invites_sent INT DEFAULT 0,
  registrations_achieved INT DEFAULT 0,
  activations_achieved INT DEFAULT 0,
  current_score INT DEFAULT 0,
  current_rank INT DEFAULT NULL,
  completed_at TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES invitation_activities(id) ON DELETE CASCADE,
  UNIQUE KEY unique_activity_user_progress (activity_id, user_id),
  INDEX idx_activity_id (activity_id),
  INDEX idx_user_id (user_id),
  INDEX idx_score (current_score DESC),
  INDEX idx_rank (current_rank ASC)
);

-- 活动结果表
CREATE TABLE IF NOT EXISTS activity_results (
  id VARCHAR(36) PRIMARY KEY,
  activity_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  final_rank INT NOT NULL,
  final_score INT NOT NULL,
  is_winner BOOLEAN DEFAULT FALSE,
  rewards_granted JSON,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES invitation_activities(id) ON DELETE CASCADE,
  UNIQUE KEY unique_activity_user_result (activity_id, user_id),
  INDEX idx_activity_id (activity_id),
  INDEX idx_user_id (user_id),
  INDEX idx_rank (final_rank ASC),
  INDEX idx_winners (is_winner, final_rank)
);

-- 活动事件日志表
CREATE TABLE IF NOT EXISTS activity_events (
  id VARCHAR(36) PRIMARY KEY,
  activity_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36),
  event_type ENUM('activity_created', 'user_joined', 'progress_updated', 'activity_completed', 'rewards_granted') NOT NULL,
  event_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES invitation_activities(id) ON DELETE CASCADE,
  INDEX idx_activity_id (activity_id),
  INDEX idx_user_id (user_id),
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at)
);