/**
 * 内容安全验证工具函数
 */

import { defaultContentValidator, VALIDATOR_PRESETS } from './contentValidator';
import { ValidationResult, ContentFilterOptions } from './types';

/**
 * 验证用户内容 - 便捷函数（异步）
 */
export async function validateContent(
  content: string,
  options?: ContentFilterOptions
): Promise<ValidationResult> {
  if (options) {
    const { ContentValidator } = require('./contentValidator');
    const validator = new ContentValidator(options);
    return validator.validate(content);
  }
  
  return defaultContentValidator.validate(content);
}

/**
 * 验证用户内容 - 便捷函数（同步，不包含AI和第三方服务）
 */
export function validateContentSync(
  content: string,
  options?: ContentFilterOptions
): ValidationResult {
  if (options) {
    const { ContentValidator } = require('./contentValidator');
    const validator = new ContentValidator(options);
    return validator.validateSync(content);
  }
  
  return defaultContentValidator.validateSync(content);
}

/**
 * 清理用户内容 - 便捷函数（异步）
 */
export async function cleanUserContent(
  content: string,
  strict: boolean = false
): Promise<string> {
  const options = strict ? VALIDATOR_PRESETS.STRICT : VALIDATOR_PRESETS.STANDARD;
  const { ContentValidator } = require('./contentValidator');
  const validator = new ContentValidator(options);
  return validator.clean(content);
}

/**
 * 清理用户内容 - 便捷函数（同步）
 */
export function cleanUserContentSync(
  content: string,
  strict: boolean = false
): string {
  const options = strict ? VALIDATOR_PRESETS.STRICT : VALIDATOR_PRESETS.STANDARD;
  const { ContentValidator } = require('./contentValidator');
  const validator = new ContentValidator(options);
  const result = validator.validateSync(content);
  return result.cleanContent;
}

/**
 * 批量验证内容（异步）
 */
export async function validateMultipleContents(
  contents: Record<string, string>,
  options?: ContentFilterOptions
): Promise<Record<string, ValidationResult>> {
  const results: Record<string, ValidationResult> = {};
  
  // 并行验证所有内容
  const promises = Object.entries(contents).map(async ([key, content]) => {
    const result = await validateContent(content, options);
    return { key, result };
  });
  
  const resolvedResults = await Promise.all(promises);
  
  for (const { key, result } of resolvedResults) {
    results[key] = result;
  }
  
  return results;
}

/**
 * 批量验证内容（同步）
 */
export function validateMultipleContentsSync(
  contents: Record<string, string>,
  options?: ContentFilterOptions
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};
  
  for (const [key, content] of Object.entries(contents)) {
    results[key] = validateContentSync(content, options);
  }
  
  return results;
}

/**
 * 检查内容是否安全（异步）
 */
export async function isContentSafe(
  content: string,
  options?: ContentFilterOptions
): Promise<boolean> {
  const result = await validateContent(content, options);
  return result.isValid;
}

/**
 * 检查内容是否安全（同步）
 */
export function isContentSafeSync(
  content: string,
  options?: ContentFilterOptions
): boolean {
  return validateContentSync(content, options).isValid;
}

/**
 * 获取内容风险等级（异步）
 */
export async function getContentRiskLevel(
  content: string,
  options?: ContentFilterOptions
): Promise<'low' | 'medium' | 'high'> {
  const result = await validateContent(content, options);
  return result.riskLevel;
}

/**
 * 获取内容风险等级（同步）
 */
export function getContentRiskLevelSync(
  content: string,
  options?: ContentFilterOptions
): 'low' | 'medium' | 'high' {
  return validateContentSync(content, options).riskLevel;
}

/**
 * 格式化验证错误信息
 */
export function formatValidationErrors(result: ValidationResult): string[] {
  return result.issues
    .filter(issue => issue.severity === 'error')
    .map(issue => issue.message);
}

/**
 * 格式化验证警告信息
 */
export function formatValidationWarnings(result: ValidationResult): string[] {
  return result.issues
    .filter(issue => issue.severity === 'warning')
    .map(issue => issue.message);
}

/**
 * 创建内容验证摘要
 */
export function createValidationSummary(result: ValidationResult) {
  const errors = formatValidationErrors(result);
  const warnings = formatValidationWarnings(result);
  
  return {
    isValid: result.isValid,
    riskLevel: result.riskLevel,
    hasErrors: errors.length > 0,
    hasWarnings: warnings.length > 0,
    errorCount: errors.length,
    warningCount: warnings.length,
    errors,
    warnings,
    cleanContent: result.cleanContent
  };
}