/**
 * 用户角色和权限管理系统
 */

export type UserRole = 'free' | 'basic' | 'pro' | 'admin';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending';

export interface RolePermissions {
  // 基础功能权限
  canCreateCards: boolean;
  canEditCards: boolean;
  canSaveCards: boolean;
  canReuseCards: boolean;

  // 导出权限
  canExportStandard: boolean;
  canExportHD: boolean;
  canBatchExport: boolean;

  // 知识图谱权限
  canUseKnowledgeGraph: boolean;
  canAdvancedAnalysis: boolean;
  maxGraphNodes: number;

  // 高级功能权限
  canCustomBranding: boolean;
  canDataExport: boolean;
  canAPIAccess: boolean;

  // 管理权限
  canManageUsers: boolean;
  canViewAnalytics: boolean;
  canManageContent: boolean;
}

export interface QuotaLimits {
  dailyCreateQuota: number;
  dailyReuseQuota: number;
  maxHistoryCards: number;
  maxGraphNodes: number;
  maxExportsPerDay: number;
}

export interface RoleConfig {
  name: string;
  displayName: string;
  description: string;
  monthlyPrice: number;
  permissions: RolePermissions;
  quotas: QuotaLimits;
  features: string[];
  limitations: string[];
}

/**
 * 角色配置定义
 */
export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  free: {
    name: 'free',
    displayName: '免费版',
    description: '适合个人体验和轻度使用',
    monthlyPrice: 0,
    permissions: {
      canCreateCards: true,
      canEditCards: true,
      canSaveCards: true,
      canReuseCards: true,
      canExportStandard: true,
      canExportHD: false,
      canBatchExport: false,
      canUseKnowledgeGraph: true,
      canAdvancedAnalysis: false,
      maxGraphNodes: 50,
      canCustomBranding: false,
      canDataExport: false,
      canAPIAccess: false,
      canManageUsers: false,
      canViewAnalytics: false,
      canManageContent: false,
    },
    quotas: {
      dailyCreateQuota: 3,
      dailyReuseQuota: 1,
      maxHistoryCards: 100,
      maxGraphNodes: 50,
      maxExportsPerDay: 10,
    },
    features: [
      '每日3次AI卡片创建',
      '每日1次卡片复用',
      '基础图片导出',
      '个人知识图谱（50个节点）',
      '历史记录（100张卡片）',
    ],
    limitations: [
      '无高清导出功能',
      '无批量操作',
      '无智能分析',
      '无数据导出',
    ],
  },

  basic: {
    name: 'basic',
    displayName: '基础版',
    description: '适合专业教师和内容创作者',
    monthlyPrice: 69,
    permissions: {
      canCreateCards: true,
      canEditCards: true,
      canSaveCards: true,
      canReuseCards: true,
      canExportStandard: true,
      canExportHD: true,
      canBatchExport: true,
      canUseKnowledgeGraph: true,
      canAdvancedAnalysis: true,
      maxGraphNodes: -1, // 无限制
      canCustomBranding: false,
      canDataExport: false,
      canAPIAccess: false,
      canManageUsers: false,
      canViewAnalytics: false,
      canManageContent: false,
    },
    quotas: {
      dailyCreateQuota: 20,
      dailyReuseQuota: 5,
      maxHistoryCards: -1, // 无限制
      maxGraphNodes: -1, // 无限制
      maxExportsPerDay: 50,
    },
    features: [
      '每日20次AI卡片创建',
      '每日5次卡片复用',
      '高清图片导出（2x-3x分辨率）',
      '批量操作功能',
      '无限个人知识图谱',
      '智能分析和推荐',
      '无限历史记录',
      '优先客服支持',
    ],
    limitations: [
      '无自定义品牌水印',
      '无数据导出功能',
      '无API访问权限',
    ],
  },

  pro: {
    name: 'pro',
    displayName: '专业版',
    description: '适合企业用户和专业团队',
    monthlyPrice: 199,
    permissions: {
      canCreateCards: true,
      canEditCards: true,
      canSaveCards: true,
      canReuseCards: true,
      canExportStandard: true,
      canExportHD: true,
      canBatchExport: true,
      canUseKnowledgeGraph: true,
      canAdvancedAnalysis: true,
      maxGraphNodes: -1,
      canCustomBranding: true,
      canDataExport: true,
      canAPIAccess: true,
      canManageUsers: false,
      canViewAnalytics: false,
      canManageContent: false,
    },
    quotas: {
      dailyCreateQuota: 100,
      dailyReuseQuota: 50,
      maxHistoryCards: -1,
      maxGraphNodes: -1,
      maxExportsPerDay: 200,
    },
    features: [
      '每日100次AI卡片创建',
      '每日50次卡片复用',
      '所有基础版功能',
      '自定义品牌水印',
      '数据导出和备份',
      'API访问权限',
      '高级样式编辑器',
      '专属客服支持',
    ],
    limitations: [],
  },

  admin: {
    name: 'admin',
    displayName: '管理员',
    description: '系统管理员权限',
    monthlyPrice: 0,
    permissions: {
      canCreateCards: true,
      canEditCards: true,
      canSaveCards: true,
      canReuseCards: true,
      canExportStandard: true,
      canExportHD: true,
      canBatchExport: true,
      canUseKnowledgeGraph: true,
      canAdvancedAnalysis: true,
      maxGraphNodes: -1,
      canCustomBranding: true,
      canDataExport: true,
      canAPIAccess: true,
      canManageUsers: true,
      canViewAnalytics: true,
      canManageContent: true,
    },
    quotas: {
      dailyCreateQuota: -1, // 无限制
      dailyReuseQuota: -1, // 无限制
      maxHistoryCards: -1,
      maxGraphNodes: -1,
      maxExportsPerDay: -1,
    },
    features: [
      '所有专业版功能',
      '用户管理',
      '内容管理',
      '系统分析',
      '无限制使用',
    ],
    limitations: [],
  },
};

/**
 * 获取用户角色配置
 */
export function getRoleConfig(role: UserRole): RoleConfig {
  return ROLE_CONFIGS[role];
}

/**
 * 获取用户权限
 */
export function getUserPermissions(role: UserRole, subscriptionStatus: SubscriptionStatus): RolePermissions {
  const config = getRoleConfig(role);

  // 如果订阅过期或取消，降级到免费版权限
  if (role !== 'free' && role !== 'admin' && (subscriptionStatus === 'expired' || subscriptionStatus === 'cancelled')) {
    return getRoleConfig('free').permissions;
  }

  return config.permissions;
}

/**
 * 获取用户配额
 */
export function getUserQuotas(role: UserRole, subscriptionStatus: SubscriptionStatus): QuotaLimits {
  const config = getRoleConfig(role);

  // 如果订阅过期或取消，降级到免费版配额
  if (role !== 'free' && role !== 'admin' && (subscriptionStatus === 'expired' || subscriptionStatus === 'cancelled')) {
    return getRoleConfig('free').quotas;
  }

  return config.quotas;
}

/**
 * 检查用户是否有特定权限
 */
export function hasPermission(
  role: UserRole,
  subscriptionStatus: SubscriptionStatus,
  permission: keyof RolePermissions,
): boolean {
  const permissions = getUserPermissions(role, subscriptionStatus);
  return permissions[permission] as boolean;
}

/**
 * 检查用户是否可以升级到指定角色
 */
export function canUpgradeTo(currentRole: UserRole, targetRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    free: 0,
    basic: 1,
    pro: 2,
    admin: 3,
  };

  return roleHierarchy[targetRole] > roleHierarchy[currentRole];
}

/**
 * 获取升级选项
 */
export function getUpgradeOptions(currentRole: UserRole): RoleConfig[] {
  const availableRoles: UserRole[] = ['basic', 'pro'];

  return availableRoles
    .filter(role => canUpgradeTo(currentRole, role))
    .map(role => getRoleConfig(role));
}

/**
 * 计算角色价值提升
 */
export function calculateRoleValueIncrease(fromRole: UserRole, toRole: UserRole): {
  createQuotaIncrease: number;
  reuseQuotaIncrease: number;
  pricePerCreate: number;
  pricePerReuse: number;
} {
  const fromConfig = getRoleConfig(fromRole);
  const toConfig = getRoleConfig(toRole);

  const createIncrease = toConfig.quotas.dailyCreateQuota === -1
    ? Infinity
    : toConfig.quotas.dailyCreateQuota - fromConfig.quotas.dailyCreateQuota;

  const reuseIncrease = toConfig.quotas.dailyReuseQuota === -1
    ? Infinity
    : toConfig.quotas.dailyReuseQuota - fromConfig.quotas.dailyReuseQuota;

  const monthlyCreateQuota = toConfig.quotas.dailyCreateQuota === -1
    ? Infinity
    : toConfig.quotas.dailyCreateQuota * 30;

  const monthlyReuseQuota = toConfig.quotas.dailyReuseQuota === -1
    ? Infinity
    : toConfig.quotas.dailyReuseQuota * 30;

  return {
    createQuotaIncrease: createIncrease,
    reuseQuotaIncrease: reuseIncrease,
    pricePerCreate: monthlyCreateQuota === Infinity ? 0 : toConfig.monthlyPrice / monthlyCreateQuota,
    pricePerReuse: monthlyReuseQuota === Infinity ? 0 : toConfig.monthlyPrice / monthlyReuseQuota,
  };
}

/**
 * 用户角色管理类
 */
export class UserRoleManager {
  constructor(
    private role: UserRole,
    private subscriptionStatus: SubscriptionStatus,
  ) {}

  getConfig(): RoleConfig {
    return getRoleConfig(this.role);
  }

  getPermissions(): RolePermissions {
    return getUserPermissions(this.role, this.subscriptionStatus);
  }

  getQuotas(): QuotaLimits {
    return getUserQuotas(this.role, this.subscriptionStatus);
  }

  hasPermission(permission: keyof RolePermissions): boolean {
    return hasPermission(this.role, this.subscriptionStatus, permission);
  }

  canUpgradeTo(targetRole: UserRole): boolean {
    return canUpgradeTo(this.role, targetRole);
  }

  getUpgradeOptions(): RoleConfig[] {
    return getUpgradeOptions(this.role);
  }

  isSubscriptionActive(): boolean {
    return this.subscriptionStatus === 'active' || this.role === 'free' || this.role === 'admin';
  }

  needsUpgrade(requiredRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      free: 0,
      basic: 1,
      pro: 2,
      admin: 3,
    };

    return roleHierarchy[this.role] < roleHierarchy[requiredRole];
  }
}
