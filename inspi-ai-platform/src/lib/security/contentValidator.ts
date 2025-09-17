/**
 * 内容验证器 - 统一的内容安全验证服务
 */

import { ValidationResult, ValidationIssue, ContentFilterOptions } from './types';
import { defaultSensitiveWordDetector } from './sensitiveWords';
import { defaultXSSFilter } from './xssFilter';
import { defaultAIContentFilter } from './aiContentFilter';
import { defaultThirdPartyFilterManager } from './thirdPartyFilters';

export class ContentValidator {
  private options: Required<ContentFilterOptions>;

  constructor(options: ContentFilterOptions = {}) {
    this.options = {
      maxLength: 500,
      enableXssFilter: true,
      enableSensitiveWordFilter: true,
      enableHtmlFilter: true,
      enableAIFilter: false, // 默认关闭，需要明确启用
      enableThirdPartyFilter: false, // 默认关闭，需要明确启用
      customValidators: [],
      ...options
    };
  }

  /**
   * 验证内容
   */
  async validate(content: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let cleanContent = content;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // 1. 长度验证
    if (this.options.maxLength && content.length > this.options.maxLength) {
      issues.push({
        type: 'length_limit',
        message: `内容长度超出限制，最大允许${this.options.maxLength}字符`,
        severity: 'error'
      });
      riskLevel = 'medium';
    }

    // 2. 基础格式验证
    const formatIssues = this.validateFormat(content);
    issues.push(...formatIssues);

    // 3. XSS过滤
    if (this.options.enableXssFilter) {
      const xssIssues = defaultXSSFilter.detect(content);
      issues.push(...xssIssues);
      
      if (xssIssues.length > 0) {
        cleanContent = defaultXSSFilter.sanitize(cleanContent);
        riskLevel = 'high';
      }
    }

    // 4. 敏感词过滤
    if (this.options.enableSensitiveWordFilter) {
      const sensitiveIssues = defaultSensitiveWordDetector.detect(content);
      issues.push(...sensitiveIssues);
      
      if (sensitiveIssues.length > 0) {
        cleanContent = defaultSensitiveWordDetector.filter(cleanContent);
        if (riskLevel === 'low') riskLevel = 'medium';
      }
    }

    // 5. AI内容过滤
    if (this.options.enableAIFilter) {
      try {
        const aiIssues = await defaultAIContentFilter.detect(content);
        issues.push(...aiIssues);
        
        if (aiIssues.some(issue => issue.severity === 'error')) {
          riskLevel = 'high';
        } else if (aiIssues.length > 0 && riskLevel === 'low') {
          riskLevel = 'medium';
        }
      } catch (error) {
        console.warn('AI content filter failed:', error);
      }
    }

    // 6. 第三方过滤服务
    if (this.options.enableThirdPartyFilter) {
      try {
        const thirdPartyIssues = await defaultThirdPartyFilterManager.detectAll(content);
        issues.push(...thirdPartyIssues);
        
        if (thirdPartyIssues.some(issue => issue.severity === 'error')) {
          riskLevel = 'high';
        } else if (thirdPartyIssues.length > 0 && riskLevel === 'low') {
          riskLevel = 'medium';
        }
      } catch (error) {
        console.warn('Third party content filter failed:', error);
      }
    }

    // 7. HTML标签过滤
    if (this.options.enableHtmlFilter) {
      cleanContent = this.stripHtmlTags(cleanContent);
    }

    // 8. 自定义验证器
    for (const validator of this.options.customValidators) {
      const customIssues = validator(content);
      issues.push(...customIssues);
    }

    // 9. 最终清理
    cleanContent = this.finalCleanup(cleanContent);

    return {
      isValid: !issues.some(issue => issue.severity === 'error'),
      cleanContent,
      issues,
      riskLevel
    };
  }

  /**
   * 快速验证（只返回是否通过）
   */
  async isValid(content: string): Promise<boolean> {
    const result = await this.validate(content);
    return result.isValid;
  }

  /**
   * 快速清理（只返回清理后的内容）
   */
  async clean(content: string): Promise<string> {
    const result = await this.validate(content);
    return result.cleanContent;
  }

  /**
   * 同步验证（不包含AI和第三方服务）
   */
  validateSync(content: string): ValidationResult {
    const issues: ValidationIssue[] = [];
    let cleanContent = content;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // 1. 长度验证
    if (this.options.maxLength && content.length > this.options.maxLength) {
      issues.push({
        type: 'length_limit',
        message: `内容长度超出限制，最大允许${this.options.maxLength}字符`,
        severity: 'error'
      });
      riskLevel = 'medium';
    }

    // 2. 基础格式验证
    const formatIssues = this.validateFormat(content);
    issues.push(...formatIssues);

    // 3. XSS过滤
    if (this.options.enableXssFilter) {
      const xssIssues = defaultXSSFilter.detect(content);
      issues.push(...xssIssues);
      
      if (xssIssues.length > 0) {
        cleanContent = defaultXSSFilter.sanitize(cleanContent);
        riskLevel = 'high';
      }
    }

    // 4. 敏感词过滤
    if (this.options.enableSensitiveWordFilter) {
      const sensitiveIssues = defaultSensitiveWordDetector.detect(content);
      issues.push(...sensitiveIssues);
      
      if (sensitiveIssues.length > 0) {
        cleanContent = defaultSensitiveWordDetector.filter(cleanContent);
        if (riskLevel === 'low') riskLevel = 'medium';
      }
    }

    // 5. HTML标签过滤
    if (this.options.enableHtmlFilter) {
      cleanContent = this.stripHtmlTags(cleanContent);
    }

    // 6. 自定义验证器
    for (const validator of this.options.customValidators) {
      const customIssues = validator(content);
      issues.push(...customIssues);
    }

    // 7. 最终清理
    cleanContent = this.finalCleanup(cleanContent);

    return {
      isValid: !issues.some(issue => issue.severity === 'error'),
      cleanContent,
      issues,
      riskLevel
    };
  }

  /**
   * 格式验证
   */
  private validateFormat(content: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 检查是否为空
    if (!content || content.trim().length === 0) {
      issues.push({
        type: 'format_error',
        message: '内容不能为空',
        severity: 'error'
      });
      return issues;
    }

    // 检查是否包含过多的特殊字符
    const specialCharCount = (content.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;
    const specialCharRatio = specialCharCount / content.length;
    
    if (specialCharRatio > 0.3) {
      issues.push({
        type: 'format_error',
        message: '内容包含过多特殊字符',
        severity: 'warning'
      });
    }

    // 检查是否包含过多的重复字符
    const repeatedCharRegex = /(.)\1{4,}/g;
    if (repeatedCharRegex.test(content)) {
      issues.push({
        type: 'format_error',
        message: '内容包含过多重复字符',
        severity: 'warning'
      });
    }

    // 检查是否包含可疑的URL模式
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const urls = content.match(urlRegex);
    if (urls && urls.length > 3) {
      issues.push({
        type: 'format_error',
        message: '内容包含过多链接',
        severity: 'warning'
      });
    }

    return issues;
  }

  /**
   * 移除HTML标签
   */
  private stripHtmlTags(content: string): string {
    // 保留一些安全的标签
    const allowedTags = ['b', 'i', 'u', 'strong', 'em', 'br', 'p'];
    const tagRegex = /<\/?(\w+)[^>]*>/gi;
    
    return content.replace(tagRegex, (match, tagName) => {
      if (allowedTags.includes(tagName.toLowerCase())) {
        return match;
      }
      return '';
    });
  }

  /**
   * 最终清理
   */
  private finalCleanup(content: string): string {
    return content
      .trim() // 移除首尾空白
      .replace(/\s+/g, ' ') // 合并多个空格
      .replace(/\n{3,}/g, '\n\n') // 限制连续换行
      .substring(0, this.options.maxLength); // 确保长度限制
  }

  /**
   * 更新配置
   */
  updateOptions(options: Partial<ContentFilterOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

// 预定义的验证器配置
export const VALIDATOR_PRESETS = {
  // 严格模式 - 用于公开内容
  STRICT: {
    maxLength: 500,
    enableXssFilter: true,
    enableSensitiveWordFilter: true,
    enableHtmlFilter: true,
    enableAIFilter: true,
    enableThirdPartyFilter: true
  },
  
  // 标准模式 - 用于一般用户内容
  STANDARD: {
    maxLength: 1000,
    enableXssFilter: true,
    enableSensitiveWordFilter: true,
    enableHtmlFilter: false,
    enableAIFilter: false,
    enableThirdPartyFilter: false
  },
  
  // 宽松模式 - 用于管理员或特殊场景
  RELAXED: {
    maxLength: 2000,
    enableXssFilter: true,
    enableSensitiveWordFilter: false,
    enableHtmlFilter: false,
    enableAIFilter: false,
    enableThirdPartyFilter: false
  },

  // AI增强模式 - 使用AI辅助过滤
  AI_ENHANCED: {
    maxLength: 1000,
    enableXssFilter: true,
    enableSensitiveWordFilter: true,
    enableHtmlFilter: false,
    enableAIFilter: true,
    enableThirdPartyFilter: false
  },

  // 企业级模式 - 使用所有过滤手段
  ENTERPRISE: {
    maxLength: 2000,
    enableXssFilter: true,
    enableSensitiveWordFilter: true,
    enableHtmlFilter: false,
    enableAIFilter: true,
    enableThirdPartyFilter: true
  }
};

// 导出默认实例
export const defaultContentValidator = new ContentValidator(VALIDATOR_PRESETS.STANDARD);