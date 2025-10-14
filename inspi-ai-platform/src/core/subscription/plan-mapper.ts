/**
 * 套餐权限和配额映射逻辑
 * 处理套餐与权限、配额之间的映射关系
 */

import { DEFAULT_PLANS } from '@/core/subscription/constants';
import {
  UserTier,
  PlanQuotas,
  PlanFeatures,
  SubscriptionPlan,
} from '@/shared/types/subscription';

/**
 * 权限定义接口
 */
export interface Permission {
  key: string;
  name: string;
  description: string;
  category: string;
  level: number; // 权限级别，数字越大权限越高
}

/**
 * 功能定义接口
 */
export interface Feature {
  key: string;
  name: string;
  description: string;
  category: string;
  requiredTier: UserTier;
}

/**
 * 权限类别
 */
export enum PermissionCategory {
  CARD = 'card',
  GRAPH = 'graph',
  EXPORT = 'export',
  DATA = 'data',
  SUPPORT = 'support',
  API = 'api',
  BRAND = 'brand'
}

/**
 * 功能类别
 */
export enum FeatureCategory {
  CREATION = 'creation',
  EXPORT = 'export',
  ANALYSIS = 'analysis',
  CUSTOMIZATION = 'customization',
  SUPPORT = 'support',
  INTEGRATION = 'integration'
}

/**
 * 权限定义映射
 */
export const PERMISSION_DEFINITIONS: Record<string, Permission> = {
  // 卡片相关权限
  'card:create:basic': {
    key: 'card:create:basic',
    name: '基础卡片创建',
    description: '创建基础样式的卡片',
    category: PermissionCategory.CARD,
    level: 1,
  },
  'card:create:advanced': {
    key: 'card:create:advanced',
    name: '高级卡片创建',
    description: '创建高级样式和模板的卡片',
    category: PermissionCategory.CARD,
    level: 2,
  },
  'card:create:custom': {
    key: 'card:create:custom',
    name: '自定义卡片创建',
    description: '创建完全自定义的卡片',
    category: PermissionCategory.CARD,
    level: 3,
  },
  'card:reuse:basic': {
    key: 'card:reuse:basic',
    name: '基础卡片复用',
    description: '复用已有的卡片模板',
    category: PermissionCategory.CARD,
    level: 1,
  },
  'card:reuse:advanced': {
    key: 'card:reuse:advanced',
    name: '高级卡片复用',
    description: '高级复用功能，包括批量复用',
    category: PermissionCategory.CARD,
    level: 2,
  },

  // 导出相关权限
  'card:export:standard': {
    key: 'card:export:standard',
    name: '标准导出',
    description: '导出标准质量的图片',
    category: PermissionCategory.EXPORT,
    level: 1,
  },
  'card:export:hd': {
    key: 'card:export:hd',
    name: '高清导出',
    description: '导出高清质量的图片',
    category: PermissionCategory.EXPORT,
    level: 2,
  },
  'card:export:batch': {
    key: 'card:export:batch',
    name: '批量导出',
    description: '批量导出多张卡片',
    category: PermissionCategory.EXPORT,
    level: 3,
  },

  // 知识图谱相关权限
  'graph:view:limited': {
    key: 'graph:view:limited',
    name: '有限图谱查看',
    description: '查看有限的知识图谱节点',
    category: PermissionCategory.GRAPH,
    level: 1,
  },
  'graph:create:unlimited': {
    key: 'graph:create:unlimited',
    name: '无限图谱创建',
    description: '创建无限数量的知识图谱节点',
    category: PermissionCategory.GRAPH,
    level: 2,
  },
  'graph:export:basic': {
    key: 'graph:export:basic',
    name: '基础图谱导出',
    description: '导出基础格式的知识图谱',
    category: PermissionCategory.GRAPH,
    level: 2,
  },
  'graph:export:advanced': {
    key: 'graph:export:advanced',
    name: '高级图谱导出',
    description: '导出多种格式的知识图谱',
    category: PermissionCategory.GRAPH,
    level: 3,
  },
  'graph:api:access': {
    key: 'graph:api:access',
    name: '图谱API访问',
    description: '通过API访问知识图谱功能',
    category: PermissionCategory.API,
    level: 3,
  },

  // 品牌定制权限
  'card:brand:custom': {
    key: 'card:brand:custom',
    name: '品牌定制',
    description: '自定义品牌元素和样式',
    category: PermissionCategory.BRAND,
    level: 3,
  },

  // 数据相关权限
  'data:export:full': {
    key: 'data:export:full',
    name: '完整数据导出',
    description: '导出完整的用户数据',
    category: PermissionCategory.DATA,
    level: 3,
  },

  // 支持相关权限
  'support:email': {
    key: 'support:email',
    name: '邮件支持',
    description: '通过邮件获得客服支持',
    category: PermissionCategory.SUPPORT,
    level: 1,
  },
  'support:priority': {
    key: 'support:priority',
    name: '优先支持',
    description: '获得优先级客服支持',
    category: PermissionCategory.SUPPORT,
    level: 2,
  },
  'support:dedicated': {
    key: 'support:dedicated',
    name: '专属支持',
    description: '获得专属客服支持',
    category: PermissionCategory.SUPPORT,
    level: 3,
  },
};

/**
 * 功能定义映射
 */
export const FEATURE_DEFINITIONS: Record<string, Feature> = {
  // 创建功能
  'basic_creation': {
    key: 'basic_creation',
    name: '基础卡片创建',
    description: '创建基础样式的教学卡片',
    category: FeatureCategory.CREATION,
    requiredTier: 'free',
  },
  'advanced_creation': {
    key: 'advanced_creation',
    name: '高级卡片创建',
    description: '使用高级模板和样式创建卡片',
    category: FeatureCategory.CREATION,
    requiredTier: 'basic',
  },
  'custom_creation': {
    key: 'custom_creation',
    name: '自定义创建',
    description: '完全自定义的卡片创建功能',
    category: FeatureCategory.CREATION,
    requiredTier: 'pro',
  },

  // 导出功能
  'standard_export': {
    key: 'standard_export',
    name: '标准导出',
    description: '导出标准质量的图片文件',
    category: FeatureCategory.EXPORT,
    requiredTier: 'free',
  },
  'hd_export': {
    key: 'hd_export',
    name: '高清导出',
    description: '导出高清质量的图片文件',
    category: FeatureCategory.EXPORT,
    requiredTier: 'basic',
  },
  'batch_export': {
    key: 'batch_export',
    name: '批量导出',
    description: '一次性导出多张卡片',
    category: FeatureCategory.EXPORT,
    requiredTier: 'pro',
  },

  // 分析功能
  'smart_analysis': {
    key: 'smart_analysis',
    name: '智能分析',
    description: '智能分析卡片内容和效果',
    category: FeatureCategory.ANALYSIS,
    requiredTier: 'basic',
  },
  'advanced_analytics': {
    key: 'advanced_analytics',
    name: '高级分析',
    description: '深度分析和数据洞察',
    category: FeatureCategory.ANALYSIS,
    requiredTier: 'pro',
  },

  // 定制功能
  'brand_customization': {
    key: 'brand_customization',
    name: '品牌定制',
    description: '自定义品牌元素和样式',
    category: FeatureCategory.CUSTOMIZATION,
    requiredTier: 'pro',
  },

  // 支持功能
  'email_support': {
    key: 'email_support',
    name: '邮件支持',
    description: '通过邮件获得客服支持',
    category: FeatureCategory.SUPPORT,
    requiredTier: 'basic',
  },
  'priority_support': {
    key: 'priority_support',
    name: '优先支持',
    description: '获得优先级客服支持',
    category: FeatureCategory.SUPPORT,
    requiredTier: 'pro',
  },
  'dedicated_support': {
    key: 'dedicated_support',
    name: '专属客服',
    description: '获得专属客服支持',
    category: FeatureCategory.SUPPORT,
    requiredTier: 'pro',
  },

  // 集成功能
  'api_access': {
    key: 'api_access',
    name: 'API访问',
    description: '通过API集成和访问功能',
    category: FeatureCategory.INTEGRATION,
    requiredTier: 'pro',
  },
  'data_export': {
    key: 'data_export',
    name: '数据导出',
    description: '导出完整的用户数据',
    category: FeatureCategory.INTEGRATION,
    requiredTier: 'pro',
  },
};

/**
 * 套餐权限映射器
 */
export class PlanPermissionMapper {
  private static tierPermissions: Record<UserTier, string[]> = {
    free: [
      'card:create:basic',
      'card:export:standard',
      'graph:view:limited',
    ],
    basic: [
      'card:create:basic',
      'card:create:advanced',
      'card:export:hd',
      'card:reuse:basic',
      'graph:create:unlimited',
      'graph:export:basic',
      'support:email',
    ],
    pro: [
      'card:create:basic',
      'card:create:advanced',
      'card:create:custom',
      'card:export:hd',
      'card:export:batch',
      'card:reuse:advanced',
      'card:brand:custom',
      'graph:create:unlimited',
      'graph:export:advanced',
      'graph:api:access',
      'data:export:full',
      'support:priority',
      'support:dedicated',
    ],
    admin: ['*'], // 管理员拥有所有权限
  };

  /**
   * 获取套餐权限列表
   */
  static getPermissions(tier: UserTier): string[] {
    return this.tierPermissions[tier] || [];
  }

  /**
   * 检查单个权限
   */
  static hasPermission(tier: UserTier, permission: string): boolean {
    const permissions = this.getPermissions(tier);
    return permissions.includes('*') || permissions.includes(permission);
  }

  /**
   * 检查多个权限（需要全部满足）
   */
  static hasAllPermissions(tier: UserTier, requiredPermissions: string[]): boolean {
    return requiredPermissions.every(permission =>
      this.hasPermission(tier, permission),
    );
  }

  /**
   * 检查多个权限（满足任一即可）
   */
  static hasAnyPermission(tier: UserTier, requiredPermissions: string[]): boolean {
    return requiredPermissions.some(permission =>
      this.hasPermission(tier, permission),
    );
  }

  /**
   * 获取权限详情
   */
  static getPermissionDetails(permissionKey: string): Permission | null {
    return PERMISSION_DEFINITIONS[permissionKey] || null;
  }

  /**
   * 获取套餐的所有权限详情
   */
  static getTierPermissionDetails(tier: UserTier): Permission[] {
    const permissions = this.getPermissions(tier);
    if (permissions.includes('*')) {
      return Object.values(PERMISSION_DEFINITIONS);
    }

    return permissions
      .map(key => PERMISSION_DEFINITIONS[key])
      .filter(permission => permission !== undefined);
  }

  /**
   * 按类别获取权限
   */
  static getPermissionsByCategory(tier: UserTier, category: PermissionCategory): Permission[] {
    const allPermissions = this.getTierPermissionDetails(tier);
    return allPermissions.filter(permission => permission.category === category);
  }

  /**
   * 获取权限级别
   */
  static getPermissionLevel(tier: UserTier, category: PermissionCategory): number {
    const permissions = this.getPermissionsByCategory(tier, category);
    return Math.max(...permissions.map(p => p.level), 0);
  }
}

/**
 * 套餐功能映射器
 */
export class PlanFeatureMapper {
  private static tierFeatures: Record<UserTier, string[]> = {
    free: [
      'basic_creation',
      'standard_export',
    ],
    basic: [
      'basic_creation',
      'advanced_creation',
      'hd_export',
      'smart_analysis',
      'email_support',
    ],
    pro: [
      'basic_creation',
      'advanced_creation',
      'custom_creation',
      'hd_export',
      'batch_export',
      'smart_analysis',
      'advanced_analytics',
      'brand_customization',
      'priority_support',
      'dedicated_support',
      'api_access',
      'data_export',
    ],
    admin: Object.keys(FEATURE_DEFINITIONS), // 管理员拥有所有功能
  };

  /**
   * 获取套餐功能列表
   */
  static getFeatures(tier: UserTier): string[] {
    return this.tierFeatures[tier] || [];
  }

  /**
   * 检查功能可用性
   */
  static hasFeature(tier: UserTier, featureKey: string): boolean {
    const features = this.getFeatures(tier);
    return features.includes(featureKey);
  }

  /**
   * 获取功能详情
   */
  static getFeatureDetails(featureKey: string): Feature | null {
    return FEATURE_DEFINITIONS[featureKey] || null;
  }

  /**
   * 获取套餐的所有功能详情
   */
  static getTierFeatureDetails(tier: UserTier): Feature[] {
    const features = this.getFeatures(tier);
    return features
      .map(key => FEATURE_DEFINITIONS[key])
      .filter(feature => feature !== undefined);
  }

  /**
   * 按类别获取功能
   */
  static getFeaturesByCategory(tier: UserTier, category: FeatureCategory): Feature[] {
    const allFeatures = this.getTierFeatureDetails(tier);
    return allFeatures.filter(feature => feature.category === category);
  }

  /**
   * 获取功能升级建议
   */
  static getUpgradeRecommendations(currentTier: UserTier, targetTier: UserTier): Feature[] {
    const currentFeatures = this.getFeatures(currentTier);
    const targetFeatures = this.getFeatures(targetTier);

    const newFeatures = targetFeatures.filter(feature =>
      !currentFeatures.includes(feature),
    );

    return newFeatures
      .map(key => FEATURE_DEFINITIONS[key])
      .filter(feature => feature !== undefined);
  }
}

/**
 * 套餐配额映射器
 */
export class PlanQuotaMapper {
  private static tierQuotas: Record<UserTier, PlanQuotas> = {
    free: {
      dailyCreateQuota: 3,
      dailyReuseQuota: 1,
      maxExportsPerDay: 10,
      maxGraphNodes: 50,
    },
    basic: {
      dailyCreateQuota: 20,
      dailyReuseQuota: 5,
      maxExportsPerDay: 50,
      maxGraphNodes: -1,
    },
    pro: {
      dailyCreateQuota: 100,
      dailyReuseQuota: 50,
      maxExportsPerDay: 200,
      maxGraphNodes: -1,
    },
    admin: {
      dailyCreateQuota: -1,
      dailyReuseQuota: -1,
      maxExportsPerDay: -1,
      maxGraphNodes: -1,
    },
  };

  /**
   * 获取套餐配额
   */
  static getQuotas(tier: UserTier): PlanQuotas {
    return this.tierQuotas[tier] || this.tierQuotas.free;
  }

  /**
   * 获取特定配额值
   */
  static getQuotaValue(tier: UserTier, quotaType: keyof PlanQuotas): number {
    const quotas = this.getQuotas(tier);
    return quotas[quotaType];
  }

  /**
   * 检查配额是否无限
   */
  static isUnlimited(tier: UserTier, quotaType: keyof PlanQuotas): boolean {
    return this.getQuotaValue(tier, quotaType) === -1;
  }

  /**
   * 格式化配额显示
   */
  static formatQuota(value: number): string {
    return value === -1 ? '无限' : value.toString();
  }

  /**
   * 配额对比
   */
  static compareQuotas(fromTier: UserTier, toTier: UserTier): {
    quotaType: keyof PlanQuotas;
    from: number;
    to: number;
    improvement: string;
  }[] {
    const fromQuotas = this.getQuotas(fromTier);
    const toQuotas = this.getQuotas(toTier);

    const quotaTypes: (keyof PlanQuotas)[] = [
      'dailyCreateQuota',
      'dailyReuseQuota',
      'maxExportsPerDay',
      'maxGraphNodes',
    ];

    return quotaTypes.map(quotaType => {
      const from = fromQuotas[quotaType];
      const to = toQuotas[quotaType];

      let improvement = '';
      if (from === -1 && to === -1) {
        improvement = '保持无限';
      } else if (from !== -1 && to === -1) {
        improvement = '升级为无限';
      } else if (from !== -1 && to !== -1) {
        const increase = to - from;
        improvement = increase > 0 ? `增加 ${increase}` : '无变化';
      }

      return {
        quotaType,
        from,
        to,
        improvement,
      };
    });
  }
}

/**
 * 综合套餐映射器
 */
export class PlanMapper {
  /**
   * 获取套餐完整信息
   */
  static getPlanInfo(tier: UserTier): {
    tier: UserTier;
    permissions: Permission[];
    features: Feature[];
    quotas: PlanQuotas;
  } {
    return {
      tier,
      permissions: PlanPermissionMapper.getTierPermissionDetails(tier),
      features: PlanFeatureMapper.getTierFeatureDetails(tier),
      quotas: PlanQuotaMapper.getQuotas(tier),
    };
  }

  /**
   * 套餐升级对比
   */
  static getUpgradeComparison(fromTier: UserTier, toTier: UserTier): {
    newPermissions: Permission[];
    newFeatures: Feature[];
    quotaChanges: ReturnType<typeof PlanQuotaMapper.compareQuotas>;
  } {
    const fromPermissions = PlanPermissionMapper.getPermissions(fromTier);
    const toPermissions = PlanPermissionMapper.getPermissions(toTier);

    const newPermissionKeys = toPermissions.filter(p =>
      !fromPermissions.includes(p) && p !== '*',
    );

    return {
      newPermissions: newPermissionKeys
        .map(key => PERMISSION_DEFINITIONS[key])
        .filter(p => p !== undefined),
      newFeatures: PlanFeatureMapper.getUpgradeRecommendations(fromTier, toTier),
      quotaChanges: PlanQuotaMapper.compareQuotas(fromTier, toTier),
    };
  }

  /**
   * 检查操作权限
   */
  static canPerformOperation(
    tier: UserTier,
    operation: string,
    requiredPermissions: string[],
  ): {
    allowed: boolean;
    missingPermissions: string[];
    suggestedTier?: UserTier;
  } {
    const missingPermissions = requiredPermissions.filter(permission =>
      !PlanPermissionMapper.hasPermission(tier, permission),
    );

    const allowed = missingPermissions.length === 0;

    let suggestedTier: UserTier | undefined;
    if (!allowed) {
      // 找到能满足所有权限的最低层级
      const tiers: UserTier[] = ['basic', 'pro', 'admin'];
      suggestedTier = (tiers.find as any)(t =>
        PlanPermissionMapper.hasAllPermissions(t, requiredPermissions),
      );
    }

    return {
      allowed,
      missingPermissions,
      suggestedTier,
    };
  }
}

// 导出映射器实例
export const planMapper = PlanMapper;
export const permissionMapper = PlanPermissionMapper;
export const featureMapper = PlanFeatureMapper;
export const quotaMapper = PlanQuotaMapper;
