-- 奖励配置管理相关表结构
-- Migration: 009_create_reward_config_tables.sql

-- 奖励规则表
CREATE TABLE IF NOT EXISTS reward_rules (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL,
    reward_type VARCHAR(50) NOT NULL,
    reward_amount INTEGER NOT NULL DEFAULT 0,
    conditions JSONB DEFAULT '{}',
    priority INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 奖励活动表
CREATE TABLE IF NOT EXISTS reward_activities (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reward_rules JSONB DEFAULT '[]',
    target_metrics JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 奖励审核表
CREATE TABLE IF NOT EXISTS reward_approvals (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    reward_type VARCHAR(50) NOT NULL,
    reward_amount INTEGER NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    admin_id VARCHAR(36),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_reward_approvals_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_reward_approvals_admin FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_reward_rules_event_type ON reward_rules(event_type);
CREATE INDEX IF NOT EXISTS idx_reward_rules_active ON reward_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_reward_rules_priority ON reward_rules(priority DESC);

CREATE INDEX IF NOT EXISTS idx_reward_activities_dates ON reward_activities(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_reward_activities_active ON reward_activities(is_active);

CREATE INDEX IF NOT EXISTS idx_reward_approvals_status ON reward_approvals(status);
CREATE INDEX IF NOT EXISTS idx_reward_approvals_user ON reward_approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_approvals_created ON reward_approvals(created_at);

-- 插入默认奖励规则
INSERT INTO reward_rules (id, name, description, event_type, reward_type, reward_amount, conditions, priority, is_active) VALUES
('rule_001', '新用户注册奖励', '通过邀请码注册的新用户获得AI积分奖励', 'user_registered', 'ai_credits', 100, '{"min_activity_days": 0}', 100, true),
('rule_002', '邀请者注册奖励', '成功邀请新用户注册后获得AI积分奖励', 'user_registered', 'ai_credits', 50, '{"invitee_activated": false}', 90, true),
('rule_003', '用户激活奖励', '被邀请用户激活账户后的额外奖励', 'user_activated', 'ai_credits', 200, '{"min_activity_days": 7}', 80, true),
('rule_004', '邀请里程碑奖励', '邀请达到特定数量的里程碑奖励', 'milestone', 'badge', 1, '{"invite_count": 10}', 70, true),
('rule_005', '高级用户邀请奖励', '邀请高级用户的特殊奖励', 'user_activated', 'premium_access', 30, '{"invitee_premium": true}', 60, true)
ON CONFLICT (id) DO NOTHING;

-- 插入示例奖励活动
INSERT INTO reward_activities (id, name, description, start_date, end_date, reward_rules, target_metrics, is_active) VALUES
('activity_001', '春季邀请挑战', '春季期间的邀请活动，额外奖励和特殊徽章', '2024-03-01 00:00:00+00', '2024-05-31 23:59:59+00', 
 '[{"event_type": "user_registered", "reward_type": "ai_credits", "reward_amount": 150}]', 
 '{"target_invites": 1000, "target_registrations": 800}', true),
('activity_002', '夏季增长活动', '夏季用户增长活动，重点关注用户激活', '2024-06-01 00:00:00+00', '2024-08-31 23:59:59+00', 
 '[{"event_type": "user_activated", "reward_type": "ai_credits", "reward_amount": 300}]', 
 '{"target_activations": 500, "target_retention": 0.8}', false)
ON CONFLICT (id) DO NOTHING;

-- 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reward_rules_updated_at BEFORE UPDATE ON reward_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reward_activities_updated_at BEFORE UPDATE ON reward_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reward_approvals_updated_at BEFORE UPDATE ON reward_approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();