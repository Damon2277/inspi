-- 创建邀请事件表
CREATE TABLE IF NOT EXISTS invite_events (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  type ENUM('code_generated', 'code_shared', 'link_clicked', 'user_registered', 'user_activated', 'reward_granted') NOT NULL,
  inviter_id VARCHAR(36) NOT NULL,
  invitee_id VARCHAR(36) NULL,
  invite_code_id VARCHAR(36) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_inviter_id (inviter_id),
  INDEX idx_invitee_id (invitee_id),
  INDEX idx_invite_code_id (invite_code_id),
  INDEX idx_type (type),
  INDEX idx_timestamp (timestamp),
  INDEX idx_type_timestamp (type, timestamp),
  
  FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invite_code_id) REFERENCES invite_codes(id) ON DELETE CASCADE
);

-- 创建邀请统计汇总视图
CREATE OR REPLACE VIEW invite_stats_summary AS
SELECT 
  ic.inviter_id as user_id,
  COUNT(DISTINCT ic.id) as total_invites,
  COUNT(DISTINCT ir.id) as successful_registrations,
  COUNT(DISTINCT CASE WHEN ir.is_activated = 1 THEN ir.id END) as active_invitees,
  COUNT(DISTINCT CASE WHEN ie.type = 'code_shared' THEN ie.id END) as total_shares,
  COUNT(DISTINCT CASE WHEN ie.type = 'link_clicked' THEN ie.id END) as total_clicks,
  CASE 
    WHEN COUNT(DISTINCT ic.id) > 0 
    THEN (COUNT(DISTINCT ir.id) * 100.0 / COUNT(DISTINCT ic.id))
    ELSE 0 
  END as conversion_rate,
  MAX(ir.registered_at) as last_invite_success,
  MAX(ic.created_at) as last_invite_created
FROM invite_codes ic
LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
LEFT JOIN invite_events ie ON ic.id = ie.invite_code_id
GROUP BY ic.inviter_id;

-- 创建每日统计视图
CREATE OR REPLACE VIEW daily_invite_stats AS
SELECT 
  DATE(ie.timestamp) as date,
  ie.inviter_id as user_id,
  COUNT(CASE WHEN ie.type = 'code_generated' THEN 1 END) as invites_created,
  COUNT(CASE WHEN ie.type = 'code_shared' THEN 1 END) as invites_shared,
  COUNT(CASE WHEN ie.type = 'link_clicked' THEN 1 END) as links_clicked,
  COUNT(CASE WHEN ie.type = 'user_registered' THEN 1 END) as registrations,
  COUNT(CASE WHEN ie.type = 'user_activated' THEN 1 END) as activations,
  COUNT(CASE WHEN ie.type = 'reward_granted' THEN 1 END) as rewards_granted
FROM invite_events ie
GROUP BY DATE(ie.timestamp), ie.inviter_id;

-- 创建平台统计视图
CREATE OR REPLACE VIEW platform_invite_stats AS
SELECT 
  DATE(ie.timestamp) as date,
  COUNT(CASE WHEN ie.type = 'code_generated' THEN 1 END) as total_invites,
  COUNT(CASE WHEN ie.type = 'user_registered' THEN 1 END) as total_registrations,
  COUNT(CASE WHEN ie.type = 'user_activated' THEN 1 END) as total_activations,
  COUNT(DISTINCT ie.inviter_id) as active_inviters,
  CASE 
    WHEN COUNT(CASE WHEN ie.type = 'code_generated' THEN 1 END) > 0 
    THEN (COUNT(CASE WHEN ie.type = 'user_registered' THEN 1 END) * 100.0 / COUNT(CASE WHEN ie.type = 'code_generated' THEN 1 END))
    ELSE 0 
  END as conversion_rate
FROM invite_events ie
GROUP BY DATE(ie.timestamp);

-- 创建排行榜视图
CREATE OR REPLACE VIEW invite_leaderboard AS
SELECT 
  u.id as user_id,
  u.name as user_name,
  u.email as user_email,
  COUNT(DISTINCT ir.id) as invite_count,
  COUNT(DISTINCT CASE WHEN ir.is_activated = 1 THEN ir.id END) as active_invite_count,
  SUM(CASE WHEN r.type = 'ai_credits' THEN r.amount ELSE 0 END) as total_credits_earned,
  COUNT(DISTINCT CASE WHEN r.type = 'badge' THEN r.id END) as badges_earned,
  COUNT(DISTINCT CASE WHEN r.type = 'title' THEN r.id END) as titles_earned,
  MAX(ir.registered_at) as last_successful_invite,
  ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT ir.id) DESC, SUM(CASE WHEN r.type = 'ai_credits' THEN r.amount ELSE 0 END) DESC) as rank
FROM users u
LEFT JOIN invite_codes ic ON u.id = ic.inviter_id
LEFT JOIN invite_registrations ir ON ic.id = ir.invite_code_id
LEFT JOIN rewards r ON u.id = r.user_id AND r.source_type = 'invite_registration'
GROUP BY u.id, u.name, u.email
HAVING invite_count > 0
ORDER BY invite_count DESC, total_credits_earned DESC;