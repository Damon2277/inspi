/**
 * 代码质量监控器
 * 集成代码质量检查工具，实现质量指标收集和分析
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class CodeQualityMonitor {
  constructor(config = {}) {
    this.config = {
      projectRoot: process.cwd(),
      qualityThresholds: {
        eslintErrors: 0,
        eslintWarnings: 10,
        testCoverage: 80,
        duplicateCodePercentage: 5,
        complexityScore: 10
      },
      ...config
    };

    this.qualityMetrics = {
      eslint: { errors: 0, warnings: 0, fixableIssues: 0 },
      testCoverage: { percentage: 0, uncoveredLines: [] },
      codeComplexity: { averageComplexity: 0, highComplexityFunctions: [] },
      duplicateCode: { percentage: 0, duplicateBlocks: [] },
      dependencies: { outdated: [], vulnerable: [] }
    };
  }

  /**
   * 运行所有代码质量检查
   */
  async runQualityChecks() {
    const results = {
      status: 'passed',
      timestamp: new Date().toISOString(),
      metrics: {},
      issues: [],
      suggestions: []
    };

    try {
      // 1. ESLint 检查
      console.log('  📋 Running ESLint checks...');
      results.metrics.eslint = await this._runEslintCheck();

      // 2. 测试覆盖率检查
      console.log('  📊 Checking test coverage...');
      results.metrics.testCoverage = await this._checkTestCoverage();

      // 3. 代码复杂度分析
      console.log('  🧮 Analyzing code complexity...');
      results.metrics.codeComplexity = await this._analyzeCodeComplexity();

      // 4. 重复代码检测
      console.log('  🔍 Detecting duplicate code...');
      results.metrics.duplicateCode = await this._detectDuplicateCode();

      // 5. 依赖安全检查
      console.log('  🔒 Checking dependency security...');
      results.metrics.dependencies = await this._checkDependencySecurity();

      // 分析结果并生成建议
      results.issues = this._analyzeQualityIssues(results.metrics);
      results.suggestions = this._generateQualitySuggestions(results.metrics);
      results.status = this._determineQualityStatus(results.metrics, results.issues);

      // 保存质量指标历史
      await this._saveQualityMetrics(results);

      return results;
    } catch (error) {
      console.error('Code quality check error:', error);
      results.status = 'error';
      results.error = error.message;
      return results;
    }
  }

  /**
   * 运行 ESLint 检查
   */
  async _runEslintCheck() {
    try {
      const eslintConfigPath = path.join(this.config.projectRoot, 'inspi-ai-platform', 'eslint.config.mjs');
      const srcPath = path.join(this.config.projectRoot, 'inspi-ai-platform', 'src');
      
      // 检查 ESLint 配置是否存在
      try {
        await fs.access(eslintConfigPath);
      } catch {
        return {
          errors: 0,
          warnings: 0,
          fixableIssues: 0,
          message: 'ESLint config not found, skipping check'
        };
      }

      // 运行 ESLint
      const command = `cd ${path.join(this.config.projectRoot, 'inspi-ai-platform')} && npx eslint src --format json --max-warnings 50`;
      
      try {
        const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
        const results = JSON.parse(output);
        
        let errors = 0;
        let warnings = 0;
        let fixableIssues = 0;

        results.forEach(file => {
          file.messages.forEach(message => {
            if (message.severity === 2) errors++;
            else if (message.severity === 1) warnings++;
            if (message.fix) fixableIssues++;
          });
        });

        return { errors, warnings, fixableIssues, details: results };
      } catch (error) {
        // ESLint 返回非零退出码时仍可能有有效输出
        if (error.stdout) {
          try {
            const results = JSON.parse(error.stdout);
            let errors = 0;
            let warnings = 0;
            let fixableIssues = 0;

            results.forEach(file => {
              file.messages.forEach(message => {
                if (message.severity === 2) errors++;
                else if (message.severity === 1) warnings++;
                if (message.fix) fixableIssues++;
              });
            });

            return { errors, warnings, fixableIssues, details: results };
          } catch {
            return { errors: 1, warnings: 0, fixableIssues: 0, error: 'ESLint parsing failed' };
          }
        }
        return { errors: 1, warnings: 0, fixableIssues: 0, error: error.message };
      }
    } catch (error) {
      return { errors: 0, warnings: 0, fixableIssues: 0, error: error.message };
    }
  }

  /**
   * 检查测试覆盖率
   */
  async _checkTestCoverage() {
    try {
      const coveragePath = path.join(this.config.projectRoot, 'inspi-ai-platform', 'coverage', 'coverage-final.json');
      
      try {
        const coverageData = JSON.parse(await fs.readFile(coveragePath, 'utf8'));
        
        let totalLines = 0;
        let coveredLines = 0;
        const uncoveredFiles = [];

        Object.entries(coverageData).forEach(([file, data]) => {
          const lines = data.s || {};
          const lineCount = Object.keys(lines).length;
          const covered = Object.values(lines).filter(count => count > 0).length;
          
          totalLines += lineCount;
          coveredLines += covered;
          
          if (lineCount > 0 && (covered / lineCount) < 0.8) {
            uncoveredFiles.push({
              file: file.replace(this.config.projectRoot, ''),
              coverage: Math.round((covered / lineCount) * 100)
            });
          }
        });

        const percentage = totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0;
        
        return {
          percentage,
          totalLines,
          coveredLines,
          uncoveredFiles
        };
      } catch {
        return {
          percentage: 0,
          message: 'No coverage data found. Run tests with coverage first.'
        };
      }
    } catch (error) {
      return { percentage: 0, error: error.message };
    }
  }

  /**
   * 分析代码复杂度
   */
  async _analyzeCodeComplexity() {
    try {
      const srcPath = path.join(this.config.projectRoot, 'inspi-ai-platform', 'src');
      const complexFunctions = [];
      let totalComplexity = 0;
      let functionCount = 0;

      // 简单的复杂度分析（基于文件内容）
      const analyzeFile = async (filePath) => {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const lines = content.split('\n');
          
          let currentFunction = null;
          let braceDepth = 0;
          let complexity = 1;

          lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            // 检测函数开始
            if (trimmed.match(/^(function|const\s+\w+\s*=|async\s+function|\w+\s*\()/)) {
              if (currentFunction) {
                if (complexity > this.config.qualityThresholds.complexityScore) {
                  complexFunctions.push({
                    file: filePath.replace(this.config.projectRoot, ''),
                    function: currentFunction,
                    complexity,
                    line: index + 1
                  });
                }
                totalComplexity += complexity;
                functionCount++;
              }
              currentFunction = trimmed.substring(0, 50);
              complexity = 1;
              braceDepth = 0;
            }

            // 计算复杂度
            if (trimmed.includes('if') || trimmed.includes('else') || 
                trimmed.includes('for') || trimmed.includes('while') ||
                trimmed.includes('switch') || trimmed.includes('catch') ||
                trimmed.includes('&&') || trimmed.includes('||')) {
              complexity++;
            }

            // 跟踪大括号
            braceDepth += (line.match(/{/g) || []).length;
            braceDepth -= (line.match(/}/g) || []).length;

            if (braceDepth === 0 && currentFunction) {
              if (complexity > this.config.qualityThresholds.complexityScore) {
                complexFunctions.push({
                  file: filePath.replace(this.config.projectRoot, ''),
                  function: currentFunction,
                  complexity,
                  line: index + 1
                });
              }
              totalComplexity += complexity;
              functionCount++;
              currentFunction = null;
            }
          });
        } catch (error) {
          // 忽略无法读取的文件
        }
      };

      // 递归分析所有 TypeScript/JavaScript 文件
      const analyzeDirectory = async (dir) => {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
              await analyzeDirectory(fullPath);
            } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
              await analyzeFile(fullPath);
            }
          }
        } catch (error) {
          // 忽略无法访问的目录
        }
      };

      await analyzeDirectory(srcPath);

      const averageComplexity = functionCount > 0 ? Math.round(totalComplexity / functionCount) : 0;

      return {
        averageComplexity,
        totalFunctions: functionCount,
        highComplexityFunctions: complexFunctions.slice(0, 10) // 只返回前10个最复杂的函数
      };
    } catch (error) {
      return { averageComplexity: 0, error: error.message };
    }
  }

  /**
   * 检测重复代码
   */
  async _detectDuplicateCode() {
    try {
      const srcPath = path.join(this.config.projectRoot, 'inspi-ai-platform', 'src');
      const codeBlocks = new Map();
      const duplicates = [];

      const analyzeFile = async (filePath) => {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const lines = content.split('\n');
          
          // 分析代码块（连续的5行作为一个块）
          for (let i = 0; i <= lines.length - 5; i++) {
            const block = lines.slice(i, i + 5)
              .map(line => line.trim())
              .filter(line => line && !line.startsWith('//') && !line.startsWith('*'))
              .join('\n');
            
            if (block.length > 50) { // 只考虑有意义的代码块
              const blockHash = this._hashCode(block);
              
              if (codeBlocks.has(blockHash)) {
                const existing = codeBlocks.get(blockHash);
                duplicates.push({
                  block: block.substring(0, 100) + '...',
                  locations: [
                    existing,
                    {
                      file: filePath.replace(this.config.projectRoot, ''),
                      startLine: i + 1,
                      endLine: i + 5
                    }
                  ]
                });
              } else {
                codeBlocks.set(blockHash, {
                  file: filePath.replace(this.config.projectRoot, ''),
                  startLine: i + 1,
                  endLine: i + 5
                });
              }
            }
          }
        } catch (error) {
          // 忽略无法读取的文件
        }
      };

      // 递归分析所有文件
      const analyzeDirectory = async (dir) => {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
              await analyzeDirectory(fullPath);
            } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
              await analyzeFile(fullPath);
            }
          }
        } catch (error) {
          // 忽略无法访问的目录
        }
      };

      await analyzeDirectory(srcPath);

      const totalBlocks = codeBlocks.size;
      const duplicateBlocks = duplicates.length;
      const percentage = totalBlocks > 0 ? Math.round((duplicateBlocks / totalBlocks) * 100) : 0;

      return {
        percentage,
        totalBlocks,
        duplicateBlocks: duplicates.slice(0, 5) // 只返回前5个重复代码块
      };
    } catch (error) {
      return { percentage: 0, error: error.message };
    }
  }

  /**
   * 检查依赖安全性
   */
  async _checkDependencySecurity() {
    try {
      const packageJsonPath = path.join(this.config.projectRoot, 'inspi-ai-platform', 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      const outdated = [];
      const vulnerable = [];

      // 简单的过期依赖检查（基于版本号模式）
      const checkDependencies = (deps, type) => {
        Object.entries(deps || {}).forEach(([name, version]) => {
          // 检查是否使用了过时的版本模式
          if (version.startsWith('^0.') || version.startsWith('~0.')) {
            outdated.push({ name, version, type, reason: 'Pre-1.0 version' });
          }
          
          // 检查已知的有问题的包（示例）
          const knownVulnerable = ['lodash', 'moment', 'request'];
          if (knownVulnerable.includes(name)) {
            vulnerable.push({ name, version, type, reason: 'Known security issues' });
          }
        });
      };

      checkDependencies(packageJson.dependencies, 'production');
      checkDependencies(packageJson.devDependencies, 'development');

      return {
        outdated: outdated.slice(0, 10),
        vulnerable: vulnerable.slice(0, 10),
        totalDependencies: Object.keys(packageJson.dependencies || {}).length + 
                          Object.keys(packageJson.devDependencies || {}).length
      };
    } catch (error) {
      return { outdated: [], vulnerable: [], error: error.message };
    }
  }

  /**
   * 分析质量问题
   */
  _analyzeQualityIssues(metrics) {
    const issues = [];

    // ESLint 问题
    if (metrics.eslint?.errors > this.config.qualityThresholds.eslintErrors) {
      issues.push({
        type: 'eslint_errors',
        severity: 'high',
        message: `Found ${metrics.eslint.errors} ESLint errors (threshold: ${this.config.qualityThresholds.eslintErrors})`,
        count: metrics.eslint.errors
      });
    }

    if (metrics.eslint?.warnings > this.config.qualityThresholds.eslintWarnings) {
      issues.push({
        type: 'eslint_warnings',
        severity: 'medium',
        message: `Found ${metrics.eslint.warnings} ESLint warnings (threshold: ${this.config.qualityThresholds.eslintWarnings})`,
        count: metrics.eslint.warnings
      });
    }

    // 测试覆盖率问题
    if (metrics.testCoverage?.percentage < this.config.qualityThresholds.testCoverage) {
      issues.push({
        type: 'low_coverage',
        severity: 'high',
        message: `Test coverage is ${metrics.testCoverage.percentage}% (threshold: ${this.config.qualityThresholds.testCoverage}%)`,
        coverage: metrics.testCoverage.percentage
      });
    }

    // 代码复杂度问题
    if (metrics.codeComplexity?.averageComplexity > this.config.qualityThresholds.complexityScore) {
      issues.push({
        type: 'high_complexity',
        severity: 'medium',
        message: `Average code complexity is ${metrics.codeComplexity.averageComplexity} (threshold: ${this.config.qualityThresholds.complexityScore})`,
        complexity: metrics.codeComplexity.averageComplexity
      });
    }

    // 重复代码问题
    if (metrics.duplicateCode?.percentage > this.config.qualityThresholds.duplicateCodePercentage) {
      issues.push({
        type: 'duplicate_code',
        severity: 'medium',
        message: `Duplicate code percentage is ${metrics.duplicateCode.percentage}% (threshold: ${this.config.qualityThresholds.duplicateCodePercentage}%)`,
        percentage: metrics.duplicateCode.percentage
      });
    }

    return issues;
  }

  /**
   * 生成质量改进建议
   */
  _generateQualitySuggestions(metrics) {
    const suggestions = [];

    // ESLint 建议
    if (metrics.eslint?.fixableIssues > 0) {
      suggestions.push({
        type: 'eslint_autofix',
        priority: 'high',
        message: `Run 'npx eslint src --fix' to automatically fix ${metrics.eslint.fixableIssues} issues`
      });
    }

    // 测试覆盖率建议
    if (metrics.testCoverage?.uncoveredFiles?.length > 0) {
      suggestions.push({
        type: 'improve_coverage',
        priority: 'high',
        message: `Add tests for files with low coverage: ${metrics.testCoverage.uncoveredFiles.slice(0, 3).map(f => f.file).join(', ')}`
      });
    }

    // 代码复杂度建议
    if (metrics.codeComplexity?.highComplexityFunctions?.length > 0) {
      suggestions.push({
        type: 'reduce_complexity',
        priority: 'medium',
        message: `Consider refactoring complex functions: ${metrics.codeComplexity.highComplexityFunctions.slice(0, 2).map(f => f.function).join(', ')}`
      });
    }

    // 依赖建议
    if (metrics.dependencies?.outdated?.length > 0) {
      suggestions.push({
        type: 'update_dependencies',
        priority: 'low',
        message: `Consider updating outdated dependencies: ${metrics.dependencies.outdated.slice(0, 3).map(d => d.name).join(', ')}`
      });
    }

    return suggestions;
  }

  /**
   * 确定质量状态
   */
  _determineQualityStatus(metrics, issues) {
    const highSeverityIssues = issues.filter(issue => issue.severity === 'high');
    const mediumSeverityIssues = issues.filter(issue => issue.severity === 'medium');

    if (highSeverityIssues.length > 0) {
      return 'failed';
    }

    if (mediumSeverityIssues.length > 2) {
      return 'warning';
    }

    return 'passed';
  }

  /**
   * 保存质量指标历史
   */
  async _saveQualityMetrics(results) {
    try {
      const historyPath = path.join(this.config.projectRoot, '.kiro', 'quality-checks', 'history');
      await fs.mkdir(historyPath, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `quality-metrics-${timestamp}.json`;
      const filepath = path.join(historyPath, filename);

      await fs.writeFile(filepath, JSON.stringify(results, null, 2));

      // 保持最近30个历史记录
      const files = await fs.readdir(historyPath);
      const qualityFiles = files.filter(f => f.startsWith('quality-metrics-')).sort();
      
      if (qualityFiles.length > 30) {
        const filesToDelete = qualityFiles.slice(0, qualityFiles.length - 30);
        for (const file of filesToDelete) {
          await fs.unlink(path.join(historyPath, file));
        }
      }
    } catch (error) {
      console.warn('Failed to save quality metrics history:', error.message);
    }
  }

  /**
   * 简单的哈希函数
   */
  _hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash;
  }
}

module.exports = CodeQualityMonitor;