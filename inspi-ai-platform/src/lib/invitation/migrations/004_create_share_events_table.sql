-- 创建分享事件表
CREATE TABLE IF NOT EXISTS share_events (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  invite_code_id VARCHAR(36) NOT NULL,
  platform ENUM('wechat', 'qq', 'dingtalk', 'wework', 'email', 'link') NOT NULL,
  event_type ENUM('share', 'click', 'conversion') NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  referrer TEXT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_invite_code_id (invite_code_id),
  INDEX idx_platform (platform),
  INDEX idx_event_type (event_type),
  INDEX idx_timestamp (timestamp),
  INDEX idx_platform_timestamp (platform, timestamp),
  
  FOREIGN KEY (invite_code_id) REFERENCES invite_codes(id) ON DELETE CASCADE
);

-- 创建分享统计视图
CREATE OR REPLACE VIEW share_stats_view AS
SELECT 
  invite_code_id,
  platform,
  COUNT(CASE WHEN event_type = 'share' THEN 1 END) as share_count,
  COUNT(CASE WHEN event_type = 'click' THEN 1 END) as click_count,
  COUNT(CASE WHEN event_type = 'conversion' THEN 1 END) as conversion_count,
  CASE 
    WHEN COUNT(CASE WHEN event_type = 'click' THEN 1 END) > 0 
    THEN (COUNT(CASE WHEN event_type = 'conversion' THEN 1 END) * 100.0 / COUNT(CASE WHEN event_type = 'click' THEN 1 END))
    ELSE 0 
  END as conversion_rate
FROM share_events 
GROUP BY invite_code_id, platform;