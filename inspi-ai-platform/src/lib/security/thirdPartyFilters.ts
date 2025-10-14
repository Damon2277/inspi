/**
 * 第三方内容过滤服务集成
 * 支持百度、腾讯、阿里云等内容审核API
 */

import { logger } from '@/shared/utils/logger';

import { ValidationIssue } from './types';

export interface ThirdPartyFilterConfig {
  provider: 'baidu' | 'tencent' | 'aliyun' | 'custom';
  apiKey: string;
  secretKey?: string;
  endpoint?: string;
  enabled: boolean;
  timeout?: number;
}

export interface ThirdPartyFilterResult {
  provider: string;
  conclusion: 'pass' | 'review' | 'block';
  confidence: number;
  categories: Array<{
    category: string;
    probability: number;
    description: string;
  }>;
  requestId?: string;
}

/**
 * 百度内容审核服务
 */
export class BaiduContentFilter {
  private config: ThirdPartyFilterConfig;
  private accessToken?: string;
  private tokenExpiry?: number;

  constructor(config: ThirdPartyFilterConfig) {
    this.config = {
      timeout: 5000,
      ...config,
      provider: 'baidu',
    };
  }

  async detect(content: string): Promise<ValidationIssue[]> {
    if (!this.config.enabled) {
      return [];
    }

    try {
      const result = await this.checkContent(content);
      return this.convertToValidationIssues(result);
    } catch (error) {
      logger.error('Baidu content filter error:', error);
      return [];
    }
  }

  private async checkContent(content: string): Promise<ThirdPartyFilterResult> {
    const token = await this.getAccessToken();

    const response = await fetch('https://aip.baidubce.com/rest/2.0/solution/v1/text_censor/v2/user_defined', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        access_token: token,
        text: content,
      }),
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      throw new Error(`Baidu API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error_code) {
      throw new Error(`Baidu API error: ${data.error_msg}`);
    }

    return {
      provider: 'baidu',
      conclusion: this.mapBaiduConclusion(data.conclusionType),
      confidence: data.confidence || 0.8,
      categories: (data.data || []).map((item: any) => ({
        category: item.type,
        probability: item.probability,
        description: item.msg || '',
      })),
      requestId: data.log_id,
    };
  }

  private async getAccessToken(): Promise<string> {
    // 检查token是否过期
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.apiKey,
        client_secret: this.config.secretKey!,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`Failed to get Baidu access token: ${data.error_description}`);
    }

    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000; // 提前5分钟过期

    return this.accessToken;
  }

  private mapBaiduConclusion(conclusionType: number): 'pass' | 'review' | 'block' {
    switch (conclusionType) {
      case 1: return 'pass';    // 合规
      case 2: return 'review';  // 不确定
      case 3: return 'block';   // 不合规
      case 4: return 'review';  // 审核失败
      default: return 'review';
    }
  }

  private convertToValidationIssues(result: ThirdPartyFilterResult): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (result.conclusion !== 'pass') {
      const severity = result.conclusion === 'block' ? 'error' : 'warning';
      const categories = result.categories.map(c => c.category).join(', ');

      issues.push({
        type: 'sensitive_word',
        message: `百度内容审核: ${categories || '检测到不当内容'}`,
        severity,
      });
    }

    return issues;
  }
}

/**
 * 腾讯云内容安全服务
 */
export class TencentContentFilter {
  private config: ThirdPartyFilterConfig;

  constructor(config: ThirdPartyFilterConfig) {
    this.config = {
      timeout: 5000,
      ...config,
      provider: 'tencent',
    };
  }

  async detect(content: string): Promise<ValidationIssue[]> {
    if (!this.config.enabled) {
      return [];
    }

    try {
      // 腾讯云内容安全API实现
      // 这里需要根据腾讯云SDK实现具体逻辑
      logger.info('Tencent content filter not fully implemented');
      return [];
    } catch (error) {
      logger.error('Tencent content filter error:', error);
      return [];
    }
  }
}

/**
 * 阿里云内容安全服务
 */
export class AliyunContentFilter {
  private config: ThirdPartyFilterConfig;

  constructor(config: ThirdPartyFilterConfig) {
    this.config = {
      timeout: 5000,
      ...config,
      provider: 'aliyun',
    };
  }

  async detect(content: string): Promise<ValidationIssue[]> {
    if (!this.config.enabled) {
      return [];
    }

    try {
      // 阿里云内容安全API实现
      // 这里需要根据阿里云SDK实现具体逻辑
      logger.info('Aliyun content filter not fully implemented');
      return [];
    } catch (error) {
      logger.error('Aliyun content filter error:', error);
      return [];
    }
  }
}

/**
 * 第三方过滤器管理器
 */
export class ThirdPartyFilterManager {
  private filters: Map<string, BaiduContentFilter | TencentContentFilter | AliyunContentFilter> = new Map();

  /**
   * 添加过滤器
   */
  addFilter(name: string, config: ThirdPartyFilterConfig) {
    let filter;

    switch (config.provider) {
      case 'baidu':
        filter = new BaiduContentFilter(config);
        break;
      case 'tencent':
        filter = new TencentContentFilter(config);
        break;
      case 'aliyun':
        filter = new AliyunContentFilter(config);
        break;
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }

    this.filters.set(name, filter);
  }

  /**
   * 移除过滤器
   */
  removeFilter(name: string) {
    this.filters.delete(name);
  }

  /**
   * 使用所有启用的过滤器检测内容
   */
  async detectAll(content: string): Promise<ValidationIssue[]> {
    const allIssues: ValidationIssue[] = [];
    const promises: Promise<ValidationIssue[]>[] = [];

    // 并行调用所有过滤器
    for (const [name, filter] of this.filters) {
      promises.push(
        filter.detect(content).catch(error => {
          logger.error(`Filter ${name} failed:`, error);
          return [];
        }),
      );
    }

    const results = await Promise.all(promises);

    // 合并所有结果
    for (const issues of results) {
      allIssues.push(...issues);
    }

    return allIssues;
  }

  /**
   * 获取过滤器列表
   */
  getFilters(): string[] {
    return Array.from(this.filters.keys());
  }
}

// 创建默认管理器实例
export const defaultThirdPartyFilterManager = new ThirdPartyFilterManager();

// 根据环境变量自动配置百度过滤器
if (process.env.BAIDU_API_KEY && process.env.BAIDU_SECRET_KEY) {
  defaultThirdPartyFilterManager.addFilter('baidu', {
    provider: 'baidu',
    apiKey: process.env.BAIDU_API_KEY,
    secretKey: process.env.BAIDU_SECRET_KEY,
    enabled: process.env.BAIDU_CONTENT_FILTER_ENABLED !== 'false',
  });
}

// 根据环境变量自动配置腾讯过滤器
if (process.env.TENCENT_SECRET_ID && process.env.TENCENT_SECRET_KEY) {
  defaultThirdPartyFilterManager.addFilter('tencent', {
    provider: 'tencent',
    apiKey: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY,
    enabled: process.env.TENCENT_CONTENT_FILTER_ENABLED !== 'false',
  });
}

// 根据环境变量自动配置阿里云过滤器
if (process.env.ALIYUN_ACCESS_KEY_ID && process.env.ALIYUN_ACCESS_KEY_SECRET) {
  defaultThirdPartyFilterManager.addFilter('aliyun', {
    provider: 'aliyun',
    apiKey: process.env.ALIYUN_ACCESS_KEY_ID,
    secretKey: process.env.ALIYUN_ACCESS_KEY_SECRET,
    enabled: process.env.ALIYUN_CONTENT_FILTER_ENABLED !== 'false',
  });
}
