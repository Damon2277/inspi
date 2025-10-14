/**
 * 套餐数据库表结构定义
 * 定义订阅套餐相关的数据库表结构和索引
 */

import { UserTier, PlanStatus } from '@/shared/types/subscription';

/**
 * 订阅套餐表结构
 */
export interface SubscriptionPlanTable {
  id: string;                    // 主键，套餐ID
  name: string;                  // 套餐名称
  tier: UserTier;               // 套餐层级
  status: PlanStatus;           // 套餐状态
  monthly_price: number;        // 月费（分为单位）
  yearly_price?: number;        // 年费（分为单位）
  currency: string;             // 货币代码
  description: string;          // 套餐描述
  popular: boolean;             // 是否热门
  recommended: boolean;         // 是否推荐
  badge?: string;               // 标签文本
  savings?: string;             // 优惠描述
  sort_order: number;           // 排序顺序
  created_at: Date;             // 创建时间
  updated_at: Date;             // 更新时间
}

/**
 * 套餐配额表结构
 */
export interface PlanQuotasTable {
  id: string;                   // 主键
  plan_id: string;              // 套餐ID（外键）
  daily_create_quota: number;   // 每日创建配额（-1表示无限）
  daily_reuse_quota: number;    // 每日复用配额（-1表示无限）
  max_exports_per_day: number;  // 每日导出配额（-1表示无限）
  max_graph_nodes: number;      // 知识图谱节点上限（-1表示无限）
  created_at: Date;             // 创建时间
  updated_at: Date;             // 更新时间
}

/**
 * 套餐功能表结构
 */
export interface PlanFeaturesTable {
  id: string;                   // 主键
  plan_id: string;              // 套餐ID（外键）
  feature_key: string;          // 功能键名
  feature_name: string;         // 功能显示名称
  feature_description?: string; // 功能描述
  enabled: boolean;             // 是否启用
  sort_order: number;           // 排序顺序
  created_at: Date;             // 创建时间
  updated_at: Date;             // 更新时间
}

/**
 * 套餐元数据表结构
 */
export interface PlanMetadataTable {
  id: string;                   // 主键
  plan_id: string;              // 套餐ID（外键）
  target_audience: string;      // 目标用户（JSON数组）
  use_cases: string;            // 使用场景（JSON数组）
  limitations: string;          // 限制说明（JSON数组）
  benefits: string;             // 优势说明（JSON数组）
  comparison_points: string;    // 对比要点（JSON数组）
  marketing_tags: string;       // 营销标签（JSON数组）
  created_at: Date;             // 创建时间
  updated_at: Date;             // 更新时间
}

/**
 * 套餐权限表结构
 */
export interface PlanPermissionsTable {
  id: string;                   // 主键
  plan_id: string;              // 套餐ID（外键）
  permission_key: string;       // 权限键名
  permission_name: string;      // 权限显示名称
  permission_description?: string; // 权限描述
  enabled: boolean;             // 是否启用
  created_at: Date;             // 创建时间
  updated_at: Date;             // 更新时间
}

/**
 * 数据库表创建SQL语句
 */
export const CREATE_TABLES_SQL = {
  // 订阅套餐主表
  subscription_plans: `
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      tier ENUM('free', 'basic', 'pro', 'admin') NOT NULL,
      status ENUM('active', 'inactive', 'deprecated') DEFAULT 'active',
      monthly_price INT NOT NULL DEFAULT 0,
      yearly_price INT NULL,
      currency VARCHAR(3) DEFAULT 'CNY',
      description TEXT,
      popular BOOLEAN DEFAULT FALSE,
      recommended BOOLEAN DEFAULT FALSE,
      badge VARCHAR(50) NULL,
      savings VARCHAR(100) NULL,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      INDEX idx_tier (tier),
      INDEX idx_status (status),
      INDEX idx_popular (popular),
      INDEX idx_recommended (recommended),
      INDEX idx_sort_order (sort_order),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  // 套餐配额表
  plan_quotas: `
    CREATE TABLE IF NOT EXISTS plan_quotas (
      id VARCHAR(50) PRIMARY KEY,
      plan_id VARCHAR(50) NOT NULL,
      daily_create_quota INT NOT NULL DEFAULT 0,
      daily_reuse_quota INT NOT NULL DEFAULT 0,
      max_exports_per_day INT NOT NULL DEFAULT 0,
      max_graph_nodes INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
      UNIQUE KEY uk_plan_quotas (plan_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  // 套餐功能表
  plan_features: `
    CREATE TABLE IF NOT EXISTS plan_features (
      id VARCHAR(50) PRIMARY KEY,
      plan_id VARCHAR(50) NOT NULL,
      feature_key VARCHAR(100) NOT NULL,
      feature_name VARCHAR(200) NOT NULL,
      feature_description TEXT NULL,
      enabled BOOLEAN DEFAULT TRUE,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
      INDEX idx_plan_feature (plan_id, feature_key),
      INDEX idx_enabled (enabled),
      INDEX idx_sort_order (sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  // 套餐元数据表
  plan_metadata: `
    CREATE TABLE IF NOT EXISTS plan_metadata (
      id VARCHAR(50) PRIMARY KEY,
      plan_id VARCHAR(50) NOT NULL,
      target_audience JSON NULL,
      use_cases JSON NULL,
      limitations JSON NULL,
      benefits JSON NULL,
      comparison_points JSON NULL,
      marketing_tags JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
      UNIQUE KEY uk_plan_metadata (plan_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  // 套餐权限表
  plan_permissions: `
    CREATE TABLE IF NOT EXISTS plan_permissions (
      id VARCHAR(50) PRIMARY KEY,
      plan_id VARCHAR(50) NOT NULL,
      permission_key VARCHAR(100) NOT NULL,
      permission_name VARCHAR(200) NOT NULL,
      permission_description TEXT NULL,
      enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
      INDEX idx_plan_permission (plan_id, permission_key),
      INDEX idx_enabled (enabled)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,
};

/**
 * 数据库索引创建SQL语句
 */
export const CREATE_INDEXES_SQL = [
  // 复合索引
  'CREATE INDEX idx_plans_tier_status ON subscription_plans(tier, status);',
  'CREATE INDEX idx_plans_status_popular ON subscription_plans(status, popular);',
  'CREATE INDEX idx_plans_status_recommended ON subscription_plans(status, recommended);',

  // 功能查询索引
  'CREATE INDEX idx_features_plan_enabled ON plan_features(plan_id, enabled);',
  'CREATE INDEX idx_permissions_plan_enabled ON plan_permissions(plan_id, enabled);',
];

/**
 * 默认数据插入SQL语句
 */
export const INSERT_DEFAULT_DATA_SQL = {
  // 插入默认套餐
  plans: `
    INSERT IGNORE INTO subscription_plans 
    (id, name, tier, status, monthly_price, yearly_price, currency, description, popular, recommended, badge, sort_order) 
    VALUES 
    ('plan-free', '免费版', 'free', 'active', 0, NULL, 'CNY', '适合个人用户体验产品功能', FALSE, FALSE, NULL, 1),
    ('plan-basic', '基础版', 'basic', 'active', 6900, 69000, 'CNY', '适合个人创作者和小团队使用', TRUE, FALSE, '最受欢迎', 2),
    ('plan-pro', '专业版', 'pro', 'active', 19900, 199000, 'CNY', '适合企业用户和专业团队', FALSE, TRUE, '推荐', 3);
  `,

  // 插入默认配额
  quotas: `
    INSERT IGNORE INTO plan_quotas 
    (id, plan_id, daily_create_quota, daily_reuse_quota, max_exports_per_day, max_graph_nodes) 
    VALUES 
    ('quota-free', 'plan-free', 3, 1, 10, 50),
    ('quota-basic', 'plan-basic', 20, 5, 50, -1),
    ('quota-pro', 'plan-pro', 100, 50, 200, -1);
  `,

  // 插入默认功能
  features: `
    INSERT IGNORE INTO plan_features 
    (id, plan_id, feature_key, feature_name, enabled, sort_order) 
    VALUES 
    -- 免费版功能
    ('feat-free-1', 'plan-free', 'card_create_basic', '基础卡片创建', TRUE, 1),
    ('feat-free-2', 'plan-free', 'template_simple', '简单模板', TRUE, 2),
    ('feat-free-3', 'plan-free', 'export_standard', '标准导出', TRUE, 3),
    
    -- 基础版功能
    ('feat-basic-1', 'plan-basic', 'export_hd', '高清导出', TRUE, 1),
    ('feat-basic-2', 'plan-basic', 'analysis_smart', '智能分析', TRUE, 2),
    ('feat-basic-3', 'plan-basic', 'graph_unlimited', '无限知识图谱', TRUE, 3),
    ('feat-basic-4', 'plan-basic', 'support_24x7', '24/7客服支持', TRUE, 4),
    ('feat-basic-5', 'plan-basic', 'data_backup', '数据备份', TRUE, 5),
    
    -- 专业版功能
    ('feat-pro-1', 'plan-pro', 'export_hd', '高清导出', TRUE, 1),
    ('feat-pro-2', 'plan-pro', 'analysis_smart', '智能分析', TRUE, 2),
    ('feat-pro-3', 'plan-pro', 'graph_unlimited', '无限知识图谱', TRUE, 3),
    ('feat-pro-4', 'plan-pro', 'brand_custom', '品牌定制', TRUE, 4),
    ('feat-pro-5', 'plan-pro', 'data_export', '数据导出', TRUE, 5),
    ('feat-pro-6', 'plan-pro', 'support_dedicated', '专属客服', TRUE, 6),
    ('feat-pro-7', 'plan-pro', 'support_priority', '优先技术支持', TRUE, 7),
    ('feat-pro-8', 'plan-pro', 'api_access', 'API访问', TRUE, 8);
  `,

  // 插入默认权限
  permissions: `
    INSERT IGNORE INTO plan_permissions 
    (id, plan_id, permission_key, permission_name, enabled) 
    VALUES 
    -- 免费版权限
    ('perm-free-1', 'plan-free', 'card:create:basic', '基础卡片创建', TRUE),
    ('perm-free-2', 'plan-free', 'card:export:standard', '标准导出', TRUE),
    ('perm-free-3', 'plan-free', 'graph:view:limited', '有限图谱查看', TRUE),
    
    -- 基础版权限
    ('perm-basic-1', 'plan-basic', 'card:create:basic', '基础卡片创建', TRUE),
    ('perm-basic-2', 'plan-basic', 'card:create:advanced', '高级卡片创建', TRUE),
    ('perm-basic-3', 'plan-basic', 'card:export:hd', '高清导出', TRUE),
    ('perm-basic-4', 'plan-basic', 'card:reuse:basic', '基础复用', TRUE),
    ('perm-basic-5', 'plan-basic', 'graph:create:unlimited', '无限图谱创建', TRUE),
    ('perm-basic-6', 'plan-basic', 'graph:export:basic', '基础图谱导出', TRUE),
    ('perm-basic-7', 'plan-basic', 'support:email', '邮件支持', TRUE),
    
    -- 专业版权限
    ('perm-pro-1', 'plan-pro', 'card:create:basic', '基础卡片创建', TRUE),
    ('perm-pro-2', 'plan-pro', 'card:create:advanced', '高级卡片创建', TRUE),
    ('perm-pro-3', 'plan-pro', 'card:create:custom', '自定义卡片创建', TRUE),
    ('perm-pro-4', 'plan-pro', 'card:export:hd', '高清导出', TRUE),
    ('perm-pro-5', 'plan-pro', 'card:export:batch', '批量导出', TRUE),
    ('perm-pro-6', 'plan-pro', 'card:reuse:advanced', '高级复用', TRUE),
    ('perm-pro-7', 'plan-pro', 'card:brand:custom', '品牌定制', TRUE),
    ('perm-pro-8', 'plan-pro', 'graph:create:unlimited', '无限图谱创建', TRUE),
    ('perm-pro-9', 'plan-pro', 'graph:export:advanced', '高级图谱导出', TRUE),
    ('perm-pro-10', 'plan-pro', 'graph:api:access', '图谱API访问', TRUE),
    ('perm-pro-11', 'plan-pro', 'data:export:full', '完整数据导出', TRUE),
    ('perm-pro-12', 'plan-pro', 'support:priority', '优先支持', TRUE),
    ('perm-pro-13', 'plan-pro', 'support:dedicated', '专属支持', TRUE);
  `,
};

/**
 * 数据库迁移脚本
 */
export class PlanSchemaMigration {
  /**
   * 创建所有表
   */
  static async createTables(): Promise<void> {
    console.log('开始创建套餐相关数据表...');

    try {
      // 这里应该连接实际数据库执行SQL
      // 目前只是模拟
      for (const [tableName, sql] of Object.entries(CREATE_TABLES_SQL)) {
        console.log(`创建表: ${tableName}`);
        // await db.execute(sql);
      }

      console.log('创建索引...');
      for (const sql of CREATE_INDEXES_SQL) {
        // await db.execute(sql);
      }

      console.log('插入默认数据...');
      for (const [dataType, sql] of Object.entries(INSERT_DEFAULT_DATA_SQL)) {
        console.log(`插入默认${dataType}数据`);
        // await db.execute(sql);
      }

      console.log('套餐数据表创建完成！');
    } catch (error) {
      console.error('创建套餐数据表失败:', error);
      throw error;
    }
  }

  /**
   * 删除所有表（谨慎使用）
   */
  static async dropTables(): Promise<void> {
    console.log('警告：即将删除所有套餐相关数据表！');

    const tables = [
      'plan_permissions',
      'plan_metadata',
      'plan_features',
      'plan_quotas',
      'subscription_plans',
    ];

    try {
      for (const table of tables) {
        console.log(`删除表: ${table}`);
        // await db.execute(`DROP TABLE IF EXISTS ${table}`);
      }

      console.log('所有套餐数据表已删除！');
    } catch (error) {
      console.error('删除套餐数据表失败:', error);
      throw error;
    }
  }

  /**
   * 检查表是否存在
   */
  static async checkTables(): Promise<Record<string, boolean>> {
    const tables = [
      'subscription_plans',
      'plan_quotas',
      'plan_features',
      'plan_metadata',
      'plan_permissions',
    ];

    const result: Record<string, boolean> = {};

    try {
      for (const table of tables) {
        // 这里应该查询实际数据库
        // const exists = await db.query(`SHOW TABLES LIKE '${table}'`);
        // result[table] = exists.length > 0;
        result[table] = true; // 模拟存在
      }

      return result;
    } catch (error) {
      console.error('检查数据表失败:', error);
      throw error;
    }
  }
}

/**
 * 数据库查询构建器
 */
export class PlanQueryBuilder {
  private conditions: string[] = [];
  private params: any[] = [];
  private orderBy: string[] = [];
  private limitClause: string = '';

  /**
   * 添加条件
   */
  where(condition: string, value?: any): this {
    this.conditions.push(condition);
    if (value !== undefined) {
      this.params.push(value);
    }
    return this;
  }

  /**
   * 添加排序
   */
  order(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderBy.push(`${column} ${direction}`);
    return this;
  }

  /**
   * 添加限制
   */
  limit(count: number, offset: number = 0): this {
    this.limitClause = `LIMIT ${offset}, ${count}`;
    return this;
  }

  /**
   * 构建查询SQL
   */
  build(baseQuery: string): { sql: string; params: any[] } {
    let sql = baseQuery;

    if (this.conditions.length > 0) {
      sql += ' WHERE ' + this.conditions.join(' AND ');
    }

    if (this.orderBy.length > 0) {
      sql += ' ORDER BY ' + this.orderBy.join(', ');
    }

    if (this.limitClause) {
      sql += ' ' + this.limitClause;
    }

    return {
      sql,
      params: this.params,
    };
  }

  /**
   * 重置构建器
   */
  reset(): this {
    this.conditions = [];
    this.params = [];
    this.orderBy = [];
    this.limitClause = '';
    return this;
  }
}

// 导出查询构建器实例
export const planQueryBuilder = new PlanQueryBuilder();
