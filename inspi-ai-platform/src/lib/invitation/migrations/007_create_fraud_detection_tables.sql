-- 创建防作弊检测相关表

-- 设备指纹表
CREATE TABLE IF NOT EXISTS device_fingerprints (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  fingerprint_hash VARCHAR(64) NOT NULL,
  user_agent TEXT,
  screen_resolution VARCHAR(20),
  timezone VARCHAR(50),
  language VARCHAR(10),
  platform VARCHAR(50),
  cookie_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_fingerprint_hash (fingerprint_hash),
  INDEX idx_created_at (created_at)
);

-- 可疑活动记录表
CREATE TABLE IF NOT EXISTS suspicious_activities (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NULL,
  ip VARCHAR(45) NOT NULL,
  type ENUM(
    'ip_frequency',
    'device_reuse', 
    'self_invitation',
    'batch_registration',
    'pattern_anomaly'
  ) NOT NULL,
  description TEXT NOT NULL,
  severity ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_ip (ip),
  INDEX idx_type (type),
  INDEX idx_severity (severity),
  INDEX idx_created_at (created_at)
);

-- 用户风险档案表
CREATE TABLE IF NOT EXISTS user_risk_profiles (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL UNIQUE,
  risk_level ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'low',
  reason TEXT,
  last_suspicious_activity TIMESTAMP NULL,
  suspicious_activity_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_user_id (user_id),
  INDEX idx_risk_level (risk_level),
  INDEX idx_updated_at (updated_at)
);

-- 用户禁止表
CREATE TABLE IF NOT EXISTS user_bans (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  reason TEXT NOT NULL,
  ban_type ENUM('invitation', 'registration', 'full') DEFAULT 'invitation',
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(36) NULL, -- 管理员ID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_ban_type (ban_type),
  INDEX idx_is_active (is_active),
  INDEX idx_expires_at (expires_at),
  INDEX idx_created_at (created_at)
);

-- IP频率限制记录表
CREATE TABLE IF NOT EXISTS ip_frequency_records (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  ip VARCHAR(45) NOT NULL,
  action_type ENUM('registration', 'invitation', 'login') NOT NULL,
  user_id VARCHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_ip (ip),
  INDEX idx_action_type (action_type),
  INDEX idx_created_at (created_at),
  INDEX idx_ip_time (ip, created_at)
);

-- 邀请关系验证表（用于检测自我邀请等）
CREATE TABLE IF NOT EXISTS invitation_relationships (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  inviter_id VARCHAR(36) NOT NULL,
  invitee_id VARCHAR(36) NOT NULL,
  invite_code VARCHAR(20) NOT NULL,
  inviter_ip VARCHAR(45),
  invitee_ip VARCHAR(45),
  inviter_device_hash VARCHAR(64),
  invitee_device_hash VARCHAR(64),
  relationship_score DECIMAL(3,2) DEFAULT 0.00, -- 关系相似度评分
  is_verified BOOLEAN DEFAULT FALSE,
  verification_status ENUM('pending', 'approved', 'rejected', 'suspicious') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_inviter_id (inviter_id),
  INDEX idx_invitee_id (invitee_id),
  INDEX idx_invite_code (invite_code),
  INDEX idx_verification_status (verification_status),
  INDEX idx_relationship_score (relationship_score),
  INDEX idx_created_at (created_at)
);

-- 批量操作检测表
CREATE TABLE IF NOT EXISTS batch_operation_detections (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  detection_key VARCHAR(100) NOT NULL, -- IP, User-Agent hash, 或其他标识
  detection_type ENUM('ip', 'user_agent', 'email_domain', 'device') NOT NULL,
  operation_type ENUM('registration', 'invitation') NOT NULL,
  count INT DEFAULT 1,
  first_occurrence TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_occurrence TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_flagged BOOLEAN DEFAULT FALSE,
  
  UNIQUE KEY unique_detection (detection_key, detection_type, operation_type),
  INDEX idx_detection_type (detection_type),
  INDEX idx_operation_type (operation_type),
  INDEX idx_is_flagged (is_flagged),
  INDEX idx_count (count),
  INDEX idx_last_occurrence (last_occurrence)
);

-- 风险规则配置表
CREATE TABLE IF NOT EXISTS fraud_detection_rules (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  rule_name VARCHAR(100) NOT NULL UNIQUE,
  rule_type ENUM('ip_frequency', 'device_reuse', 'batch_detection', 'pattern_matching') NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  threshold_value INT,
  time_window_minutes INT,
  action_type ENUM('block', 'review', 'warn', 'monitor') DEFAULT 'monitor',
  severity ENUM('low', 'medium', 'high') DEFAULT 'medium',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_rule_name (rule_name),
  INDEX idx_rule_type (rule_type),
  INDEX idx_is_enabled (is_enabled),
  INDEX idx_severity (severity)
);

-- 插入默认风险规则
INSERT INTO fraud_detection_rules (rule_name, rule_type, threshold_value, time_window_minutes, action_type, severity, description) VALUES
('ip_hourly_registration_limit', 'ip_frequency', 5, 60, 'block', 'high', '每小时每IP最多5次注册'),
('device_reuse_limit', 'device_reuse', 3, NULL, 'block', 'high', '每设备最多3个用户'),
('batch_registration_detection', 'batch_detection', 3, 5, 'review', 'medium', '5分钟内批量注册检测'),
('similar_email_pattern', 'pattern_matching', 2, NULL, 'review', 'medium', '相似邮箱模式检测')
ON DUPLICATE KEY UPDATE
  threshold_value = VALUES(threshold_value),
  time_window_minutes = VALUES(time_window_minutes),
  action_type = VALUES(action_type),
  severity = VALUES(severity),
  description = VALUES(description);

-- 添加用户表的字段（如果不存在）
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS registration_ip VARCHAR(45),
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS device_fingerprint_hash VARCHAR(64);

-- 添加索引
ALTER TABLE users 
ADD INDEX IF NOT EXISTS idx_registration_ip (registration_ip),
ADD INDEX IF NOT EXISTS idx_device_fingerprint_hash (device_fingerprint_hash);