/**
 * Security Checker
 * 
 * Implements security test compliance verification with automated
 * scanning for common security vulnerabilities and best practices.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

export interface SecurityViolation {
  rule: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  file: string;
  line: number;
  message: string;
  recommendation: string;
  cweId?: string;
  evidence: string;
}

export interface SecurityCheckResult {
  passed: boolean;
  violations: SecurityViolation[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  categories: {
    secrets: SecurityViolation[];
    injection: SecurityViolation[];
    crypto: SecurityViolation[];
    auth: SecurityViolation[];
    xss: SecurityViolation[];
    other: SecurityViolation[];
  };
}

export interface SecurityConfig {
  enabled: boolean;
  rules: {
    noHardcodedSecrets: boolean;
    noInsecureRandomness: boolean;
    noSqlInjection: boolean;
    noXssVulnerabilities: boolean;
  };
  failOnViolation: boolean;
  excludePatterns: string[];
  customRules: SecurityRule[];
}

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  pattern: RegExp;
  filePatterns: string[];
  recommendation: string;
  cweId?: string;
}

export class SecurityChecker {
  private config: SecurityConfig;
  private builtInRules: SecurityRule[];

  constructor(config: SecurityConfig) {
    this.config = config;
    this.builtInRules = this.initializeBuiltInRules();
  }

  /**
   * Check security compliance
   */
  async check(): Promise<SecurityCheckResult> {
    try {
      const violations: SecurityViolation[] = [];
      const allRules = [...this.builtInRules, ...this.config.customRules];
      
      // Get all files to scan
      const filesToScan = await this.getFilesToScan();
      
      // Apply each rule to each file
      for (const rule of allRules) {
        if (this.isRuleEnabled(rule)) {
          const ruleViolations = await this.applyRule(rule, filesToScan);
          violations.push(...ruleViolations);
        }
      }

      const summary = this.calculateSummary(violations);
      const riskLevel = this.calculateRiskLevel(summary);
      const categories = this.categorizeViolations(violations);
      const passed = this.determinePassStatus(violations);

      return {
        passed,
        violations,
        riskLevel,
        summary,
        categories
      };
    } catch (error) {
      return {
        passed: false,
        violations: [{
          rule: 'security-check-error',
          severity: 'high',
          file: 'unknown',
          line: 0,
          message: `Security check failed: ${(error as Error).message}`,
          recommendation: 'Fix security checker configuration',
          evidence: ''
        }],
        riskLevel: 'high',
        summary: { total: 1, critical: 0, high: 1, medium: 0, low: 0 },
        categories: {
          secrets: [],
          injection: [],
          crypto: [],
          auth: [],
          xss: [],
          other: []
        }
      };
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: SecurityConfig): void {
    this.config = config;
  }

  /**
   * Generate security report
   */
  generateReport(result: SecurityCheckResult): string {
    const lines: string[] = [
      '# Security Report',
      `Generated: ${new Date().toISOString()}`,
      `Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`,
      `Risk Level: ${result.riskLevel.toUpperCase()}`,
      '',
      '## Summary',
      `- Total Violations: ${result.summary.total}`,
      `- Critical: ${result.summary.critical}`,
      `- High: ${result.summary.high}`,
      `- Medium: ${result.summary.medium}`,
      `- Low: ${result.summary.low}`,
      ''
    ];

    // Violations by category
    const categories = Object.entries(result.categories);
    for (const [category, violations] of categories) {
      if (violations.length > 0) {
        lines.push(`## ${category.charAt(0).toUpperCase() + category.slice(1)} Violations`);
        
        violations.slice(0, 10).forEach(violation => {
          lines.push(`### ${violation.rule} (${violation.severity.toUpperCase()})`);
          lines.push(`**File:** ${violation.file}:${violation.line}`);
          lines.push(`**Message:** ${violation.message}`);
          lines.push(`**Recommendation:** ${violation.recommendation}`);
          if (violation.cweId) {
            lines.push(`**CWE:** ${violation.cweId}`);
          }
          lines.push(`**Evidence:** \`${violation.evidence}\``);
          lines.push('');
        });

        if (violations.length > 10) {
          lines.push(`... and ${violations.length - 10} more ${category} violations`);
          lines.push('');
        }
      }
    }

    // Top recommendations
    const recommendations = this.generateTopRecommendations(result.violations);
    if (recommendations.length > 0) {
      lines.push('## Top Recommendations');
      recommendations.forEach(rec => lines.push(`- ${rec}`));
    }

    return lines.join('\n');
  }

  /**
   * Add custom security rule
   */
  addCustomRule(rule: SecurityRule): void {
    this.config.customRules.push(rule);
  }

  private initializeBuiltInRules(): SecurityRule[] {
    return [
      // Hardcoded secrets
      {
        id: 'hardcoded-api-key',
        name: 'Hardcoded API Key',
        description: 'Detects hardcoded API keys in source code',
        severity: 'critical',
        pattern: /(?:api[_-]?key|apikey|access[_-]?token|secret[_-]?key)\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/gi,
        filePatterns: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
        recommendation: 'Use environment variables or secure configuration management',
        cweId: 'CWE-798',
      },
      {
        id: 'hardcoded-password',
        name: 'Hardcoded Password',
        description: 'Detects hardcoded passwords in source code',
        severity: 'critical',
        pattern: /(?:password|pwd|pass)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
        filePatterns: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
        recommendation: 'Use secure password storage and environment variables',
        cweId: 'CWE-259',
      },
      {
        id: 'hardcoded-jwt-secret',
        name: 'Hardcoded JWT Secret',
        description: 'Detects hardcoded JWT secrets',
        severity: 'critical',
        pattern: /(?:jwt[_-]?secret|token[_-]?secret)\s*[:=]\s*['"][a-zA-Z0-9]{16,}['"]/gi,
        filePatterns: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
        recommendation: 'Use environment variables for JWT secrets',
        cweId: 'CWE-798',
      },

      // Insecure randomness
      {
        id: 'insecure-random',
        name: 'Insecure Random Number Generation',
        description: 'Detects use of Math.random() for security-sensitive operations',
        severity: 'medium',
        pattern: /Math\.random\(\)/g,
        filePatterns: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
        recommendation: 'Use crypto.randomBytes() or crypto.getRandomValues() for cryptographic purposes',
        cweId: 'CWE-338',
      },

      // SQL Injection
      {
        id: 'sql-injection-risk',
        name: 'SQL Injection Risk',
        description: 'Detects potential SQL injection vulnerabilities',
        severity: 'high',
        pattern: /(?:query|execute)\s*\(\s*['"`][^'"`]*\$\{[^}]+\}[^'"`]*['"`]/g,
        filePatterns: ['**/*.ts', '**/*.js'],
        recommendation: 'Use parameterized queries or prepared statements',
        cweId: 'CWE-89',
      },

      // XSS vulnerabilities
      {
        id: 'xss-innerHTML',
        name: 'XSS via innerHTML',
        description: 'Detects potential XSS through innerHTML usage',
        severity: 'high',
        pattern: /\.innerHTML\s*=\s*[^;]+(?:\+|`|\$\{)/g,
        filePatterns: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
        recommendation: 'Use textContent or proper sanitization libraries',
        cweId: 'CWE-79',
      },
      {
        id: 'xss-dangerouslySetInnerHTML',
        name: 'XSS via dangerouslySetInnerHTML',
        description: 'Detects potential XSS through React dangerouslySetInnerHTML',
        severity: 'high',
        pattern: /dangerouslySetInnerHTML\s*=\s*\{\{\s*__html:\s*[^}]+\}\}/g,
        filePatterns: ['**/*.tsx', '**/*.jsx'],
        recommendation: 'Sanitize HTML content or use safer alternatives',
        cweId: 'CWE-79',
      },

      // Insecure HTTP
      {
        id: 'insecure-http',
        name: 'Insecure HTTP Usage',
        description: 'Detects hardcoded HTTP URLs that should use HTTPS',
        severity: 'medium',
        pattern: /['"]http:\/\/[^'"]+['"]/g,
        filePatterns: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
        recommendation: 'Use HTTPS for all external communications',
        cweId: 'CWE-319',
      },

      // Weak crypto
      {
        id: 'weak-crypto-md5',
        name: 'Weak Cryptographic Hash (MD5)',
        description: 'Detects use of MD5 hashing algorithm',
        severity: 'medium',
        pattern: /createHash\s*\(\s*['"]md5['"]\s*\)/g,
        filePatterns: ['**/*.ts', '**/*.js'],
        recommendation: 'Use SHA-256 or stronger hashing algorithms',
        cweId: 'CWE-327',
      },
      {
        id: 'weak-crypto-sha1',
        name: 'Weak Cryptographic Hash (SHA1)',
        description: 'Detects use of SHA1 hashing algorithm',
        severity: 'low',
        pattern: /createHash\s*\(\s*['"]sha1['"]\s*\)/g,
        filePatterns: ['**/*.ts', '**/*.js'],
        recommendation: 'Use SHA-256 or stronger hashing algorithms',
        cweId: 'CWE-327',
      },

      // Eval usage
      {
        id: 'dangerous-eval',
        name: 'Dangerous eval() Usage',
        description: 'Detects use of eval() function',
        severity: 'high',
        pattern: /\beval\s*\(/g,
        filePatterns: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
        recommendation: 'Avoid eval() and use safer alternatives like JSON.parse()',
        cweId: 'CWE-95',
      },

      // Console.log in production
      {
        id: 'console-log-production',
        name: 'Console Logging in Production',
        description: 'Detects console.log statements that may leak sensitive information',
        severity: 'low',
        pattern: /console\.(log|info|warn|error|debug)\s*\(/g,
        filePatterns: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
        recommendation: 'Remove console statements or use proper logging libraries',
        cweId: 'CWE-532',
      }
    ];
  }

  private async getFilesToScan(): Promise<string[]> {
    const patterns = [
      'src/**/*.ts',
      'src/**/*.js',
      'src/**/*.tsx',
      'src/**/*.jsx',
      '!src/**/*.test.*',
      '!src/**/*.spec.*',
      '!node_modules/**',
      '!coverage/**',
      '!dist/**',
      '!build/**'
    ];

    // Add exclude patterns from config
    this.config.excludePatterns.forEach(pattern => {
      patterns.push(`!${pattern}`);
    });

    try {
      const files = await glob(patterns);
      return files.filter(file => fs.existsSync(file));
    } catch {
      return [];
    }
  }

  private isRuleEnabled(rule: SecurityRule): boolean {
    switch (rule.id) {
      case 'hardcoded-api-key':
      case 'hardcoded-password':
      case 'hardcoded-jwt-secret':
        return this.config.rules.noHardcodedSecrets;
      case 'insecure-random':
        return this.config.rules.noInsecureRandomness;
      case 'sql-injection-risk':
        return this.config.rules.noSqlInjection;
      case 'xss-innerHTML':
      case 'xss-dangerouslySetInnerHTML':
        return this.config.rules.noXssVulnerabilities;
      default:
        return true; // Custom rules are enabled by default
    }
  }

  private async applyRule(rule: SecurityRule, files: string[]): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = [];
    
    // Filter files based on rule's file patterns
    const applicableFiles = files.filter(file => 
      rule.filePatterns.some(pattern => 
        file.includes(pattern.replace('**/', '').replace('*', ''))
      )
    );

    for (const file of applicableFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        let match;
        while ((match = rule.pattern.exec(content)) !== null) {
          const lineNumber = this.getLineNumber(content, match.index);
          const evidence = match[0].length > 100 ? match[0].substring(0, 100) + '...' : match[0];
          
          violations.push({
            rule: rule.id,
            severity: rule.severity,
            file: file,
            line: lineNumber,
            message: rule.description,
            recommendation: rule.recommendation,
            cweId: rule.cweId,
            evidence: evidence
          });
        }
        
        // Reset regex lastIndex to avoid issues with global regex
        rule.pattern.lastIndex = 0;
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return violations;
  }

  private getLineNumber(content: string, index: number): number {
    const beforeMatch = content.substring(0, index);
    return beforeMatch.split('\n').length;
  }

  private calculateSummary(violations: SecurityViolation[]): SecurityCheckResult['summary'] {
    const summary = {
      total: violations.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    violations.forEach(violation => {
      summary[violation.severity]++;
    });

    return summary;
  }

  private calculateRiskLevel(summary: SecurityCheckResult['summary']): 'low' | 'medium' | 'high' | 'critical' {
    if (summary.critical > 0) return 'critical';
    if (summary.high > 2) return 'high';
    if (summary.high > 0 || summary.medium > 5) return 'medium';
    return 'low';
  }

  private categorizeViolations(violations: SecurityViolation[]): SecurityCheckResult['categories'] {
    const categories: SecurityCheckResult['categories'] = {
      secrets: [],
      injection: [],
      crypto: [],
      auth: [],
      xss: [],
      other: []
    };

    violations.forEach(violation => {
      if (violation.rule.includes('hardcoded') || violation.rule.includes('secret')) {
        categories.secrets.push(violation);
      } else if (violation.rule.includes('sql') || violation.rule.includes('injection')) {
        categories.injection.push(violation);
      } else if (violation.rule.includes('crypto') || violation.rule.includes('hash')) {
        categories.crypto.push(violation);
      } else if (violation.rule.includes('auth') || violation.rule.includes('jwt')) {
        categories.auth.push(violation);
      } else if (violation.rule.includes('xss') || violation.rule.includes('innerHTML')) {
        categories.xss.push(violation);
      } else {
        categories.other.push(violation);
      }
    });

    return categories;
  }

  private determinePassStatus(violations: SecurityViolation[]): boolean {
    if (!this.config.failOnViolation) {
      return true;
    }

    // Fail if there are any critical or high severity violations
    return !violations.some(v => v.severity === 'critical' || v.severity === 'high');
  }

  private generateTopRecommendations(violations: SecurityViolation[]): string[] {
    const recommendations = new Map<string, number>();
    
    violations.forEach(violation => {
      const count = recommendations.get(violation.recommendation) || 0;
      recommendations.set(violation.recommendation, count + 1);
    });

    return Array.from(recommendations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([rec, count]) => `${rec} (${count} occurrence${count > 1 ? 's' : ''})`);
  }
}