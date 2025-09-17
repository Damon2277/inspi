-- 高级防作弊系统数据库表
-- 创建行为模式、异常告警、审核案例、账户冻结等相关表

-- 行为模式表
CREATE TABLE IF NOT EXISTS behavior_patterns (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  pattern_type ENUM('registration', 'invitation', 'activity', 'reward_claim') NOT NULL,
  features JSON NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  risk_score DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_pattern (user_id, pattern_type),
  INDEX idx_timestamp (timestamp),
  INDEX idx_risk_score (risk_score)
);

-- 用户行为档案表
CREATE TABLE IF NOT EXISTS user_behavior_profiles (
  user_id VARCHAR(36) PRIMARY KEY,
  pattern_type VARCHAR(50) NOT NULL,
  features JSON NOT NULL,
  risk_score DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_risk_score (risk_score),
  INDEX idx_last_updated (last_updated)
);

-- 异常告警表
CREATE TABLE IF NOT EXISTS anomaly_alerts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  alert_type ENUM('behavior_anomaly', 'pattern_deviation', 'velocity_spike', 'network_abuse') NOT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
  description TEXT NOT NULL,
  evidence JSON,
  status ENUM('pending', 'investigating', 'resolved', 'false_positive') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  resolved_by VARCHAR(36) NULL,
  resolution TEXT NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_alert_type (alert_type),
  INDEX idx_severity (severity),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- 审核案例表
CREATE TABLE IF NOT EXISTS review_cases (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  case_type ENUM('suspicious_behavior', 'fraud_detection', 'reward_dispute', 'account_verification') NOT NULL,
  priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL,
  status ENUM('pending', 'in_review', 'approved', 'rejected', 'escalated') DEFAULT 'pending',
  assigned_to VARCHAR(36) NULL,
  evidence JSON,
  decision JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_case_type (case_type),
  INDEX idx_priority (priority),
  INDEX idx_status (status),
  INDEX idx_assigned_to (assigned_to),
  INDEX idx_created_at (created_at)
);

-- 账户冻结表
CREATE TABLE IF NOT EXISTS account_freezes (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  reason TEXT NOT NULL,
  duration INT NULL COMMENT '冻结时长（小时），NULL表示永久冻结',
  frozen_features JSON NOT NULL COMMENT '被冻结的功能列表',
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  unfrozen_at TIMESTAMP NULL,
  unfrozen_by VARCHAR(36) NULL,
  unfreeze_reason TEXT NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_is_active (is_active),
  INDEX idx_created_at (created_at),
  INDEX idx_expires_at (expires_at)
);

-- 奖励回收表
CREATE TABLE IF NOT EXISTS reward_recoveries (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  reward_ids JSON NOT NULL COMMENT '被回收的奖励ID列表',
  recovered_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  reason TEXT NOT NULL,
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  completed_at TIMESTAMP NULL,
  error_message TEXT NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- 风险评估历史表
CREATE TABLE IF NOT EXISTS risk_assessment_history (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  assessment_type ENUM('registration', 'invitation', 'reward_claim', 'periodic') NOT NULL,
  risk_level ENUM('low', 'medium', 'high') NOT NULL,
  risk_score DECIMAL(3,2) NOT NULL,
  risk_factors JSON COMMENT '风险因子详情',
  assessment_context JSON COMMENT '评估上下文',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_assessment_type (assessment_type),
  INDEX idx_risk_level (risk_level),
  INDEX idx_created_at (created_at)
);

-- 管理员操作日志表
CREATE TABLE IF NOT EXISTS admin_operation_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  admin_id VARCHAR(36) NOT NULL,
  operation_type ENUM('freeze_account', 'unfreeze_account', 'recover_rewards', 'resolve_alert', 'review_case') NOT NULL,
  target_user_id VARCHAR(36) NULL,
  target_resource_id VARCHAR(36) NULL COMMENT '目标资源ID（如案例ID、告警ID等）',
  operation_details JSON,
  result ENUM('success', 'failed') NOT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_id (admin_id),
  INDEX idx_operation_type (operation_type),
  INDEX idx_target_user_id (target_user_id),
  INDEX idx_created_at (created_at)
);

-- 网络滥用检测表
CREATE TABLE IF NOT EXISTS network_abuse_patterns (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  ip_address VARCHAR(45) NOT NULL,
  user_agent_hash VARCHAR(64) NOT NULL,
  device_fingerprint_hash VARCHAR(64) NULL,
  abuse_type ENUM('ip_sharing', 'device_sharing', 'bot_activity', 'proxy_usage') NOT NULL,
  user_count INT NOT NULL DEFAULT 1,
  first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_at TIMESTAMP NULL,
  blocked_reason TEXT NULL,
  INDEX idx_ip_address (ip_address),
  INDEX idx_user_agent_hash (user_agent_hash),
  INDEX idx_device_fingerprint_hash (device_fingerprint_hash),
  INDEX idx_abuse_type (abuse_type),
  INDEX idx_is_blocked (is_blocked),
  INDEX idx_last_seen (last_seen)
);

-- 审核员工作负载表
CREATE TABLE IF NOT EXISTS reviewer_workloads (
  reviewer_id VARCHAR(36) PRIMARY KEY,
  active_cases INT NOT NULL DEFAULT 0,
  completed_cases_today INT NOT NULL DEFAULT 0,
  completed_cases_week INT NOT NULL DEFAULT 0,
  avg_resolution_time_hours DECIMAL(5,2) NULL,
  specializations JSON COMMENT '专业领域',
  max_concurrent_cases INT NOT NULL DEFAULT 10,
  is_available BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active_cases (active_cases),
  INDEX idx_is_available (is_available),
  INDEX idx_last_activity (last_activity)
);

-- 系统配置表（用于存储阈值和规则）
CREATE TABLE IF NOT EXISTS fraud_detection_config (
  config_key VARCHAR(100) PRIMARY KEY,
  config_value JSON NOT NULL,
  description TEXT,
  category ENUM('threshold', 'rule', 'feature', 'notification') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(36) NULL,
  INDEX idx_category (category),
  INDEX idx_is_active (is_active)
);

-- 插入默认配置
INSERT INTO fraud_detection_config (config_key, config_value, description, category) VALUES
('velocity_threshold', '{"hourly_limit": 10, "daily_limit": 50}', '活动频率阈值', 'threshold'),
('pattern_deviation_threshold', '2.0', '行为模式偏差阈值', 'threshold'),
('risk_score_thresholds', '{"low": 0.3, "medium": 0.6, "high": 0.8}', '风险评分阈值', 'threshold'),
('auto_freeze_conditions', '{"high_risk_actions": 3, "critical_alerts": 1}', '自动冻结条件', 'rule'),
('notification_settings', '{"admin_emails": ["admin@example.com"], "alert_channels": ["email", "slack"]}', '通知设置', 'notification')
ON DUPLICATE KEY UPDATE 
  config_value = VALUES(config_value),
  updated_at = CURRENT_TIMESTAMP;

-- 创建视图：活跃风险用户
CREATE OR REPLACE VIEW active_risk_users AS
SELECT 
  u.user_id,
  u.risk_score,
  COUNT(DISTINCT aa.id) as active_alerts,
  COUNT(DISTINCT rc.id) as active_reviews,
  af.is_active as is_frozen,
  af.reason as freeze_reason
FROM user_behavior_profiles u
LEFT JOIN anomaly_alerts aa ON u.user_id = aa.user_id AND aa.status IN ('pending', 'investigating')
LEFT JOIN review_cases rc ON u.user_id = rc.user_id AND rc.status IN ('pending', 'in_review')
LEFT JOIN account_freezes af ON u.user_id = af.user_id AND af.is_active = TRUE
WHERE u.risk_score > 0.6
GROUP BY u.user_id, u.risk_score, af.is_active, af.reason
ORDER BY u.risk_score DESC, active_alerts DESC;

-- 创建视图：审核工作台
CREATE OR REPLACE VIEW review_dashboard AS
SELECT 
  rc.id as case_id,
  rc.user_id,
  rc.case_type,
  rc.priority,
  rc.status,
  rc.assigned_to,
  rc.created_at,
  rc.updated_at,
  ubp.risk_score as user_risk_score,
  COUNT(aa.id) as related_alerts,
  af.is_active as user_frozen
FROM review_cases rc
LEFT JOIN user_behavior_profiles ubp ON rc.user_id = ubp.user_id
LEFT JOIN anomaly_alerts aa ON rc.user_id = aa.user_id AND aa.status IN ('pending', 'investigating')
LEFT JOIN account_freezes af ON rc.user_id = af.user_id AND af.is_active = TRUE
WHERE rc.status IN ('pending', 'in_review')
GROUP BY rc.id, rc.user_id, rc.case_type, rc.priority, rc.status, rc.assigned_to, 
         rc.created_at, rc.updated_at, ubp.risk_score, af.is_active
ORDER BY 
  CASE rc.priority 
    WHEN 'urgent' THEN 1 
    WHEN 'high' THEN 2 
    WHEN 'medium' THEN 3 
    ELSE 4 
  END,
  rc.created_at ASC;