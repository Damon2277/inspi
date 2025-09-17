/**
 * 内容安全验证模块入口
 */

// 类型定义
export type {
  SensitiveWordConfig,
  ValidationResult,
  ValidationIssue,
  ContentFilterOptions
} from './types';

// 敏感词检测
export {
  SensitiveWordDetector,
  defaultSensitiveWordDetector
} from './sensitiveWords';

// XSS过滤
export {
  XSSFilter,
  defaultXSSFilter
} from './xssFilter';

// 内容验证器
export {
  ContentValidator,
  defaultContentValidator,
  VALIDATOR_PRESETS
} from './contentValidator';

// 中间件
export {
  createSecurityMiddleware,
  withSecurity,
  validateField,
  cleanContent,
  SECURITY_MIDDLEWARE_PRESETS
} from './middleware';

// AI内容过滤
export {
  AIContentFilter,
  defaultAIContentFilter
} from './aiContentFilter';

// 第三方过滤服务
export {
  BaiduContentFilter,
  TencentContentFilter,
  AliyunContentFilter,
  ThirdPartyFilterManager,
  defaultThirdPartyFilterManager
} from './thirdPartyFilters';

// 便捷函数
export { 
  validateContent, 
  validateContentSync,
  cleanUserContent,
  cleanUserContentSync,
  validateMultipleContents,
  validateMultipleContentsSync,
  isContentSafe,
  isContentSafeSync,
  getContentRiskLevel,
  getContentRiskLevelSync
} from './utils';

// 配置
export {
  SENSITIVE_WORD_CONFIG,
  ENVIRONMENT_CONFIGS,
  CONTENT_TYPE_CONFIGS,
  ROLE_BASED_CONFIGS,
  getCurrentEnvironmentConfig,
  getContentTypeConfig,
  getRoleBasedConfig,
  mergeConfigs,
  loadSensitiveWordsFromRemote,
  validateConfig
} from './config';