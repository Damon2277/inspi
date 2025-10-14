/**
 * XSS过滤器
 */

import { ValidationIssue } from './types';

// 危险的HTML标签
const DANGEROUS_TAGS = [
  'script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea',
  'button', 'select', 'option', 'link', 'meta', 'style', 'base',
];

// 危险的属性
const DANGEROUS_ATTRIBUTES = [
  'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
  'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset',
  '#', 'vbscript:', 'data:', 'expression',
];

// 危险的协议
const DANGEROUS_PROTOCOLS = [
  '#', 'vbscript:', 'data:', 'file:', 'ftp:',
];

export class XSSFilter {
  /**
   * 检测XSS攻击
   */
  detect(content: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 检测危险标签
    const tagIssues = this.detectDangerousTags(content);
    issues.push(...tagIssues);

    // 检测危险属性
    const attrIssues = this.detectDangerousAttributes(content);
    issues.push(...attrIssues);

    // 检测危险协议
    const protocolIssues = this.detectDangerousProtocols(content);
    issues.push(...protocolIssues);

    // 检测编码绕过
    const encodingIssues = this.detectEncodingBypass(content);
    issues.push(...encodingIssues);

    return issues;
  }

  /**
   * 清理XSS内容
   */
  sanitize(content: string): string {
    let sanitized = content;

    // 移除危险标签
    sanitized = this.removeDangerousTags(sanitized);

    // 移除危险属性
    sanitized = this.removeDangerousAttributes(sanitized);

    // 移除危险协议
    sanitized = this.removeDangerousProtocols(sanitized);

    // 解码并重新编码
    sanitized = this.normalizeEncoding(sanitized);

    return sanitized;
  }

  /**
   * 检测危险标签
   */
  private detectDangerousTags(content: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const tagRegex = /<\/?(\w+)[^>]*>/gi;
    let match;

    while ((match = tagRegex.exec(content)) !== null) {
      const tagName = match[1].toLowerCase();
      if (DANGEROUS_TAGS.includes(tagName)) {
        issues.push({
          type: 'xss',
          message: `检测到危险HTML标签: ${tagName}`,
          position: { start: match.index, end: match.index + match[0].length },
          severity: 'error',
        });
      }
    }

    return issues;
  }

  /**
   * 检测危险属性
   */
  private detectDangerousAttributes(content: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const attr of DANGEROUS_ATTRIBUTES) {
      const regex = new RegExp(`\\b${attr}\\s*=`, 'gi');
      let match;

      while ((match = regex.exec(content)) !== null) {
        issues.push({
          type: 'xss',
          message: `检测到危险属性: ${attr}`,
          position: { start: match.index, end: match.index + match[0].length },
          severity: 'error',
        });
      }
    }

    return issues;
  }

  /**
   * 检测危险协议
   */
  private detectDangerousProtocols(content: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const protocol of DANGEROUS_PROTOCOLS) {
      const regex = new RegExp(protocol, 'gi');
      let match;

      while ((match = regex.exec(content)) !== null) {
        issues.push({
          type: 'xss',
          message: `检测到危险协议: ${protocol}`,
          position: { start: match.index, end: match.index + protocol.length },
          severity: 'error',
        });
      }
    }

    return issues;
  }

  /**
   * 检测编码绕过
   */
  private detectEncodingBypass(content: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 检测HTML实体编码
    const htmlEntityRegex = /&#x?[0-9a-f]+;/gi;
    let match;

    while ((match = htmlEntityRegex.exec(content)) !== null) {
      const decoded = this.decodeHtmlEntities(match[0]);
      if (this.isDangerous(decoded)) {
        issues.push({
          type: 'xss',
          message: `检测到可疑的HTML实体编码: ${match[0]}`,
          position: { start: match.index, end: match.index + match[0].length },
          severity: 'warning',
        });
      }
    }

    // 检测URL编码
    const urlEncodedRegex = /%[0-9a-f]{2}/gi;
    const urlMatches = content.match(urlEncodedRegex);
    if (urlMatches && urlMatches.length > 5) {
      issues.push({
        type: 'xss',
        message: '检测到大量URL编码，可能存在绕过尝试',
        severity: 'warning',
      });
    }

    return issues;
  }

  /**
   * 移除危险标签
   */
  private removeDangerousTags(content: string): string {
    const tagRegex = /<\/?(\w+)[^>]*>/gi;
    return content.replace(tagRegex, (match, tagName) => {
      if (DANGEROUS_TAGS.includes(tagName.toLowerCase())) {
        return '';
      }
      return match;
    });
  }

  /**
   * 移除危险属性
   */
  private removeDangerousAttributes(content: string): string {
    let result = content;

    for (const attr of DANGEROUS_ATTRIBUTES) {
      const regex = new RegExp(`\\s+${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
      result = result.replace(regex, '');
    }

    return result;
  }

  /**
   * 移除危险协议
   */
  private removeDangerousProtocols(content: string): string {
    let result = content;

    for (const protocol of DANGEROUS_PROTOCOLS) {
      const regex = new RegExp(protocol, 'gi');
      result = result.replace(regex, '');
    }

    return result;
  }

  /**
   * 标准化编码
   */
  private normalizeEncoding(content: string): string {
    // 解码HTML实体
    let result = this.decodeHtmlEntities(content);

    // 解码URL编码
    try {
      result = decodeURIComponent(result);
    } catch (e) {
      // 忽略解码错误
    }

    // 重新编码特殊字符
    result = result
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return result;
  }

  /**
   * 解码HTML实体
   */
  private decodeHtmlEntities(text: string): string {
    const entityMap: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#x27;': "'",
      '&#x2F;': '/',
      '&#39;': "'",
    };

    return text.replace(/&[#\w]+;/g, (entity) => {
      return entityMap[entity] || entity;
    });
  }

  /**
   * 检查是否为危险内容
   */
  private isDangerous(content: string): boolean {
    const lowerContent = content.toLowerCase();

    return DANGEROUS_TAGS.some(tag => lowerContent.includes(`<${tag}`)) ||
           DANGEROUS_ATTRIBUTES.some(attr => lowerContent.includes(attr)) ||
           DANGEROUS_PROTOCOLS.some(protocol => lowerContent.includes(protocol));
  }
}

// 导出默认实例
export const defaultXSSFilter = new XSSFilter();
