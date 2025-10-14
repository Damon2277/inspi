/**
 * 内容安全配置
 */

import { SensitiveWordConfig, ContentFilterOptions } from './types';

/**
 * 敏感词配置
 */
export const SENSITIVE_WORD_CONFIG: SensitiveWordConfig = {
  words: [
    // 政治敏感词（示例，实际使用时应从安全的配置源加载）
    '政治敏感词示例1',
    '政治敏感词示例2',

    // 色情暴力词汇
    '暴力词汇示例1',
    '色情词汇示例1',

    // 违法违规词汇
    '违法词汇示例1',
    '违规词汇示例1',

    // 歧视性语言
    '歧视词汇示例1',
    '歧视词汇示例2',

    // 常见不当词汇
    '垃圾', '废物', '白痴', '傻逼', '蠢货', '智障',
    '死', '滚', '操', '草', '艹', '靠', '妈的',
    '他妈的', '你妈', '去死', '找死',
  ],
  replacement: '*',
  fuzzyMatch: true,
  customRules: [
    // 自定义正则规则
    /\b[a-zA-Z]*fuck[a-zA-Z]*\b/gi,
    /\b[a-zA-Z]*shit[a-zA-Z]*\b/gi,
    /\b[a-zA-Z]*damn[a-zA-Z]*\b/gi,
  ],
};

/**
 * 环境特定配置
 */
export const ENVIRONMENT_CONFIGS = {
  development: {
    enableLogging: true,
    strictMode: false,
    allowTestWords: true,
  },
  production: {
    enableLogging: false,
    strictMode: true,
    allowTestWords: false,
  },
  test: {
    enableLogging: false,
    strictMode: false,
    allowTestWords: true,
  },
};

/**
 * 内容类型特定配置
 */
export const CONTENT_TYPE_CONFIGS: Record<string, ContentFilterOptions> = {
  // 用户评论
  comment: {
    maxLength: 500,
    enableXssFilter: true,
    enableSensitiveWordFilter: true,
    enableHtmlFilter: true,
  },

  // 文章内容
  article: {
    maxLength: 10000,
    enableXssFilter: true,
    enableSensitiveWordFilter: true,
    enableHtmlFilter: false, // 文章可能需要保留一些HTML格式
  },

  // 用户昵称
  username: {
    maxLength: 50,
    enableXssFilter: true,
    enableSensitiveWordFilter: true,
    enableHtmlFilter: true,
  },

  // 标题
  title: {
    maxLength: 100,
    enableXssFilter: true,
    enableSensitiveWordFilter: true,
    enableHtmlFilter: true,
  },

  // 搜索关键词
  search: {
    maxLength: 200,
    enableXssFilter: true,
    enableSensitiveWordFilter: false, // 搜索时不过滤敏感词
    enableHtmlFilter: true,
  },

  // 教学内容
  teaching: {
    maxLength: 2000,
    enableXssFilter: true,
    enableSensitiveWordFilter: true,
    enableHtmlFilter: false,
  },
};

/**
 * 用户角色特定配置
 */
export const ROLE_BASED_CONFIGS: Record<string, ContentFilterOptions> = {
  // 普通用户
  user: {
    maxLength: 1000,
    enableXssFilter: true,
    enableSensitiveWordFilter: true,
    enableHtmlFilter: true,
  },

  // VIP用户
  vip: {
    maxLength: 2000,
    enableXssFilter: true,
    enableSensitiveWordFilter: true,
    enableHtmlFilter: false,
  },

  // 管理员
  admin: {
    maxLength: 10000,
    enableXssFilter: true,
    enableSensitiveWordFilter: false, // 管理员可以使用敏感词
    enableHtmlFilter: false,
  },

  // 系统用户
  system: {
    maxLength: 50000,
    enableXssFilter: false,
    enableSensitiveWordFilter: false,
    enableHtmlFilter: false,
  },
};

/**
 * 获取当前环境配置
 */
export function getCurrentEnvironmentConfig() {
  const env = process.env.NODE_ENV as keyof typeof ENVIRONMENT_CONFIGS;
  return ENVIRONMENT_CONFIGS[env] || ENVIRONMENT_CONFIGS.development;
}

/**
 * 获取内容类型配置
 */
export function getContentTypeConfig(contentType: string): ContentFilterOptions {
  return CONTENT_TYPE_CONFIGS[contentType] || CONTENT_TYPE_CONFIGS.comment;
}

/**
 * 获取角色配置
 */
export function getRoleBasedConfig(role: string): ContentFilterOptions {
  return ROLE_BASED_CONFIGS[role] || ROLE_BASED_CONFIGS.user;
}

/**
 * 合并配置
 */
export function mergeConfigs(...configs: Partial<ContentFilterOptions>[]): ContentFilterOptions {
  return configs.reduce((merged, config) => ({
    ...merged,
    ...config,
  }), {
    maxLength: 1000,
    enableXssFilter: true,
    enableSensitiveWordFilter: true,
    enableHtmlFilter: true,
    customValidators: [],
  });
}

/**
 * 动态加载敏感词库（用于生产环境）
 */
export async function loadSensitiveWordsFromRemote(): Promise<string[]> {
  try {
    // 在实际应用中，这里应该从安全的远程服务加载敏感词库
    // 例如从加密的配置服务、数据库或CDN加载

    if (process.env.SENSITIVE_WORDS_URL) {
      const response = await fetch(process.env.SENSITIVE_WORDS_URL, {
        headers: {
          'Authorization': `Bearer ${process.env.SENSITIVE_WORDS_TOKEN}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.words || [];
      }
    }

    // 降级到本地配置
    return SENSITIVE_WORD_CONFIG.words;
  } catch (error) {
    console.error('Failed to load sensitive words from remote:', error);
    return SENSITIVE_WORD_CONFIG.words;
  }
}

/**
 * 验证配置有效性
 */
export function validateConfig(config: ContentFilterOptions): boolean {
  if (config.maxLength && config.maxLength < 1) {
    console.warn('Invalid maxLength in content filter config');
    return false;
  }

  if (config.customValidators && !Array.isArray(config.customValidators)) {
    console.warn('Invalid customValidators in content filter config');
    return false;
  }

  return true;
}
