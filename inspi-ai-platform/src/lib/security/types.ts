/**
 * 内容安全验证类型定义
 */

export interface SensitiveWordConfig {
  /** 敏感词列表 */
  words: string[];
  /** 替换字符 */
  replacement: string;
  /** 是否启用模糊匹配 */
  fuzzyMatch: boolean;
  /** 自定义规则 */
  customRules?: RegExp[];
}

export interface ValidationResult {
  /** 是否通过验证 */
  isValid: boolean;
  /** 清理后的内容 */
  cleanContent: string;
  /** 检测到的问题 */
  issues: ValidationIssue[];
  /** 风险等级 */
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ValidationIssue {
  /** 问题类型 */
  type: 'sensitive_word' | 'xss' | 'length_limit' | 'format_error';
  /** 问题描述 */
  message: string;
  /** 问题位置 */
  position?: { start: number; end: number };
  /** 严重程度 */
  severity: 'warning' | 'error';
}

export interface ContentFilterOptions {
  /** 最大长度限制 */
  maxLength?: number;
  /** 是否启用XSS过滤 */
  enableXssFilter?: boolean;
  /** 是否启用敏感词过滤 */
  enableSensitiveWordFilter?: boolean;
  /** 是否启用HTML标签过滤 */
  enableHtmlFilter?: boolean;
  /** 是否启用AI内容过滤 */
  enableAIFilter?: boolean;
  /** 是否启用第三方过滤服务 */
  enableThirdPartyFilter?: boolean;
  /** 自定义验证规则 */
  customValidators?: ((content: string) => ValidationIssue[])[];
}