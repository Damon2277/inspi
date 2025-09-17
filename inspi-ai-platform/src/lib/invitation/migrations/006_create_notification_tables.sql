-- 创建通知相关表

-- 通知消息表
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  type ENUM(
    'invite_success',
    'reward_received', 
    'invite_progress',
    'invite_code_expiring',
    'milestone_achieved',
    'weekly_summary',
    'monthly_report'
  ) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  channel ENUM(
    'in_app',
    'email',
    'sms',
    'push',
    'wechat',
    'webhook'
  ) NOT NULL,
  status ENUM(
    'pending',
    'sent',
    'delivered',
    'read',
    'failed'
  ) NOT NULL DEFAULT 'pending',
  metadata JSON,
  scheduled_at TIMESTAMP NULL,
  sent_at TIMESTAMP NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_channel (channel),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_scheduled_at (scheduled_at)
);

-- 通知偏好设置表
CREATE TABLE IF NOT EXISTS notification_preferences (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  type ENUM(
    'invite_success',
    'reward_received',
    'invite_progress', 
    'invite_code_expiring',
    'milestone_achieved',
    'weekly_summary',
    'monthly_report'
  ) NOT NULL,
  channels JSON NOT NULL DEFAULT '["in_app", "email"]',
  frequency ENUM(
    'immediate',
    'daily',
    'weekly',
    'monthly'
  ) NOT NULL DEFAULT 'immediate',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start TIME NULL,
  quiet_hours_end TIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_user_type (user_id, type),
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_is_enabled (is_enabled)
);

-- 通知模板表
CREATE TABLE IF NOT EXISTS notification_templates (
  id VARCHAR(50) PRIMARY KEY,
  type ENUM(
    'invite_success',
    'reward_received',
    'invite_progress',
    'invite_code_expiring', 
    'milestone_achieved',
    'weekly_summary',
    'monthly_report'
  ) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  variables JSON NOT NULL DEFAULT '[]',
  channels JSON NOT NULL DEFAULT '["in_app", "email"]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_type (type),
  INDEX idx_type (type),
  INDEX idx_is_active (is_active)
);

-- 推送令牌表（用于推送通知）
CREATE TABLE IF NOT EXISTS push_tokens (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  token VARCHAR(255) NOT NULL,
  platform ENUM('ios', 'android', 'web') NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_user_token (user_id, token),
  INDEX idx_user_id (user_id),
  INDEX idx_token (token),
  INDEX idx_is_active (is_active)
);

-- 插入默认通知模板
INSERT INTO notification_templates (id, type, title, content, variables, channels, is_active) VALUES
('invite_success', 'invite_success', '邀请成功！', '恭喜！{{inviteeName}} 通过您的邀请成功注册了 Inspi.AI，您获得了 {{rewardAmount}} 次AI生成次数奖励！', '["inviteeName", "rewardAmount"]', '["in_app", "email"]', TRUE),
('reward_received', 'reward_received', '奖励到账', '您获得了新的奖励：{{rewardType}} {{rewardAmount}}，快去查看吧！', '["rewardType", "rewardAmount"]', '["in_app", "push"]', TRUE),
('invite_progress', 'invite_progress', '邀请进度更新', '您已成功邀请 {{inviteCount}} 人注册，距离下一个里程碑还需要 {{remainingCount}} 人！', '["inviteCount", "remainingCount"]', '["in_app"]', TRUE),
('invite_code_expiring', 'invite_code_expiring', '邀请码即将过期', '您的邀请码 {{inviteCode}} 将在 {{daysLeft}} 天后过期，请及时分享给朋友！', '["inviteCode", "daysLeft"]', '["in_app", "email"]', TRUE),
('milestone_achieved', 'milestone_achieved', '里程碑达成！', '恭喜您达成了 {{milestoneName}} 里程碑！获得了 {{rewardDescription}} 奖励！', '["milestoneName", "rewardDescription"]', '["in_app", "email", "push"]', TRUE),
('weekly_summary', 'weekly_summary', '本周邀请总结', '本周您邀请了 {{weeklyInvites}} 人，累计获得 {{weeklyRewards}} 奖励。继续加油！', '["weeklyInvites", "weeklyRewards"]', '["email"]', TRUE),
('monthly_report', 'monthly_report', '月度邀请报告', '您的月度邀请报告已生成，本月排名第 {{monthlyRank}} 位，共邀请 {{monthlyInvites}} 人！', '["monthlyRank", "monthlyInvites"]', '["email"]', TRUE)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  content = VALUES(content),
  variables = VALUES(variables),
  channels = VALUES(channels),
  is_active = VALUES(is_active);