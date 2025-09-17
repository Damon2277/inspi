/**
 * 敏感词库和检测服务
 */

import { SensitiveWordConfig, ValidationIssue } from './types';

// 敏感词分类枚举
export enum SensitiveWordCategory {
  POLITICAL = 'POLITICAL',      // 政治敏感
  PROFANITY = 'PROFANITY',      // 脏话粗俗
  VIOLENCE = 'VIOLENCE',        // 暴力血腥
  SEXUAL = 'SEXUAL',            // 色情内容
  ILLEGAL = 'ILLEGAL',          // 违法违规
  DISCRIMINATION = 'DISCRIMINATION', // 歧视性语言
  SPAM = 'SPAM',                // 垃圾信息
  OTHER = 'OTHER'               // 其他不当内容
}

// 分类敏感词库
const CATEGORIZED_SENSITIVE_WORDS: Record<SensitiveWordCategory, string[]> = {
  [SensitiveWordCategory.POLITICAL]: [
    '政治敏感词1', '政治敏感词2', '敏感政治话题'
  ],
  [SensitiveWordCategory.PROFANITY]: [
    '白痴', '傻逼', '废物', '垃圾', '蠢货', '混蛋'
  ],
  [SensitiveWordCategory.VIOLENCE]: [
    '暴力词汇1', '血腥', '杀害', '伤害'
  ],
  [SensitiveWordCategory.SEXUAL]: [
    '色情词汇1', '不当内容'
  ],
  [SensitiveWordCategory.ILLEGAL]: [
    '违法词汇1', '违规词汇1', '非法'
  ],
  [SensitiveWordCategory.DISCRIMINATION]: [
    '歧视词汇1', '歧视词汇2', '种族歧视'
  ],
  [SensitiveWordCategory.SPAM]: [
    '垃圾广告', '刷屏', '灌水'
  ],
  [SensitiveWordCategory.OTHER]: [
    '其他不当', '不合适内容'
  ]
};

// 基础敏感词库（合并所有分类）
const DEFAULT_SENSITIVE_WORDS = Object.values(CATEGORIZED_SENSITIVE_WORDS).flat();

// 敏感词变体映射（处理同音字、特殊字符替换等）
const WORD_VARIANTS: Record<string, string[]> = {
  '傻逼': ['傻B', '傻b', '沙比', 'SB', 'sb', '煞笔'],
  '白痴': ['白吃', '百痴', '白池'],
  '垃圾': ['拉圾', '啦圾', 'lj', 'LJ']
};

export class SensitiveWordDetector {
  private config: SensitiveWordConfig;
  private wordTrie: TrieNode;

  constructor(config?: Partial<SensitiveWordConfig>) {
    this.config = {
      words: DEFAULT_SENSITIVE_WORDS,
      replacement: '*',
      fuzzyMatch: true,
      ...config
    };
    
    this.wordTrie = this.buildTrie();
  }

  /**
   * 检测文本中的敏感词
   */
  detect(text: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const normalizedText = this.normalizeText(text);
    
    // 使用字典树进行快速匹配
    const matches = this.findMatches(normalizedText);
    
    for (const match of matches) {
      issues.push({
        type: 'sensitive_word',
        message: `检测到敏感词: ${match.word}`,
        position: { start: match.start, end: match.end },
        severity: 'error'
      });
    }

    // 如果启用模糊匹配，检查变体
    if (this.config.fuzzyMatch) {
      const variantMatches = this.findVariantMatches(normalizedText);
      for (const match of variantMatches) {
        issues.push({
          type: 'sensitive_word',
          message: `检测到敏感词变体: ${match.word}`,
          position: { start: match.start, end: match.end },
          severity: 'warning'
        });
      }
    }

    return issues;
  }

  /**
   * 过滤敏感词
   */
  filter(text: string): string {
    let filteredText = text;
    const matches = this.findMatches(this.normalizeText(text));
    
    // 从后往前替换，避免位置偏移
    matches.reverse().forEach(match => {
      const replacement = this.config.replacement.repeat(match.word.length);
      filteredText = filteredText.substring(0, match.start) + 
                    replacement + 
                    filteredText.substring(match.end);
    });

    return filteredText;
  }

  /**
   * 构建字典树
   */
  private buildTrie(): TrieNode {
    const root = new TrieNode();
    
    for (const word of this.config.words) {
      let current = root;
      for (const char of word) {
        if (!current.children.has(char)) {
          current.children.set(char, new TrieNode());
        }
        current = current.children.get(char)!;
      }
      current.isEnd = true;
      current.word = word;
    }
    
    return root;
  }

  /**
   * 查找匹配的敏感词
   */
  private findMatches(text: string): Array<{ word: string; start: number; end: number }> {
    const matches: Array<{ word: string; start: number; end: number }> = [];
    
    for (let i = 0; i < text.length; i++) {
      let current = this.wordTrie;
      let j = i;
      
      while (j < text.length && current.children.has(text[j])) {
        current = current.children.get(text[j])!;
        j++;
        
        if (current.isEnd) {
          matches.push({
            word: current.word!,
            start: i,
            end: j
          });
        }
      }
    }
    
    return matches;
  }

  /**
   * 查找变体匹配
   */
  private findVariantMatches(text: string): Array<{ word: string; start: number; end: number }> {
    const matches: Array<{ word: string; start: number; end: number }> = [];
    
    for (const [original, variants] of Object.entries(WORD_VARIANTS)) {
      for (const variant of variants) {
        const regex = new RegExp(this.escapeRegExp(variant), 'gi');
        let match;
        
        while ((match = regex.exec(text)) !== null) {
          matches.push({
            word: variant,
            start: match.index,
            end: match.index + variant.length
          });
        }
      }
    }
    
    return matches;
  }

  /**
   * 文本标准化
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, '') // 移除空格
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ''); // 只保留中文、英文、数字
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 更新敏感词库
   */
  updateWordList(words: string[]): void {
    this.config.words = words;
    this.wordTrie = this.buildTrie();
  }

  /**
   * 添加敏感词
   */
  addWords(words: string[]): void {
    this.config.words.push(...words);
    this.wordTrie = this.buildTrie();
  }
}

/**
 * 字典树节点
 */
class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEnd: boolean = false;
  word?: string;
}

// 导出默认实例
export const defaultSensitiveWordDetector = new SensitiveWordDetector();