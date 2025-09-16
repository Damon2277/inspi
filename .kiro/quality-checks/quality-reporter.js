/**
 * 质量报告生成器
 * 创建质量趋势报告功能
 */

const fs = require('fs').promises;
const path = require('path');

class QualityReporter {
  constructor(config = {}) {
    this.config = {
      projectRoot: process.cwd(),
      reportFormats: ['console', 'json', 'html'],
      ...config
    };
  }

  /**
   * 生成质量报告
   */
  async generateQualityReport(results) {
    try {
      // 确保报告目录存在
      const reportsDir = path.join(this.config.projectRoot, '.kiro', 'quality-checks', 'reports');
      await fs.mkdir(reportsDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      // 生成不同格式的报告
      if (this.config.reportFormats.includes('console')) {
        this._generateConsoleReport(results);
      }

      if (this.config.reportFormats.includes('json')) {
        await this._generateJsonReport(results, reportsDir, timestamp);
      }

      if (this.config.reportFormats.includes('html')) {
        await this._generateHtmlReport(results, reportsDir, timestamp);
      }

      // 生成趋势报告
      await this._generateTrendReport(reportsDir);

    } catch (error) {
      console.error('Failed to generate quality report:', error);
    }
  }

  /**
   * 生成控制台报告
   */
  _generateConsoleReport(results) {
    console.log('\n📊 Quality Check Report');
    console.log('========================');
    console.log(`Overall Status: ${this._getStatusEmoji(results.overallStatus)} ${results.overallStatus.toUpperCase()}`);
    console.log(`Timestamp: ${results.timestamp}`);

    // 代码质量部分
    if (results.checks.codeQuality) {
      const cq = results.checks.codeQuality;
      console.log('\n🔍 Code Quality:');
      
      if (cq.metrics.eslint) {
        console.log(`  ESLint: ${cq.metrics.eslint.errors} errors, ${cq.metrics.eslint.warnings} warnings`);
        if (cq.metrics.eslint.fixableIssues > 0) {
          console.log(`  💡 ${cq.metrics.eslint.fixableIssues} issues can be auto-fixed`);
        }
      }

      if (cq.metrics.testCoverage) {
        console.log(`  Test Coverage: ${cq.metrics.testCoverage.percentage}%`);
        if (cq.metrics.testCoverage.uncoveredFiles?.length > 0) {
          console.log(`  📝 ${cq.metrics.testCoverage.uncoveredFiles.length} files need better coverage`);
        }
      }

      if (cq.metrics.codeComplexity) {
        console.log(`  Code Complexity: ${cq.metrics.codeComplexity.averageComplexity} (avg)`);
        if (cq.metrics.codeComplexity.highComplexityFunctions?.length > 0) {
          console.log(`  ⚠️  ${cq.metrics.codeComplexity.highComplexityFunctions.length} functions are too complex`);
        }
      }

      if (cq.metrics.duplicateCode) {
        console.log(`  Duplicate Code: ${cq.metrics.duplicateCode.percentage}%`);
      }
    }

    // 功能验证部分
    if (results.checks.functionalValidation) {
      const fv = results.checks.functionalValidation;
      console.log('\n🧪 Functional Validation:');
      console.log(`  Status: ${this._getStatusEmoji(fv.status)} ${fv.status}`);
      
      if (fv.testResults) {
        console.log(`  Tests: ${fv.testResults.passed}/${fv.testResults.total} passed`);
        if (fv.testResults.failed > 0) {
          console.log(`  ❌ ${fv.testResults.failed} tests failed`);
        }
      }
    }

    // 智能预警部分
    if (results.checks.intelligentWarnings) {
      const iw = results.checks.intelligentWarnings;
      console.log('\n⚠️  Intelligent Warnings:');
      
      if (iw.warnings?.length > 0) {
        iw.warnings.slice(0, 5).forEach(warning => {
          console.log(`  ${this._getSeverityEmoji(warning.severity)} ${warning.message}`);
        });
        
        if (iw.warnings.length > 5) {
          console.log(`  ... and ${iw.warnings.length - 5} more warnings`);
        }
      } else {
        console.log('  ✅ No warnings detected');
      }
    }

    // 建议部分
    if (results.checks.codeQuality?.suggestions?.length > 0) {
      console.log('\n💡 Suggestions:');
      results.checks.codeQuality.suggestions.slice(0, 3).forEach(suggestion => {
        console.log(`  ${this._getPriorityEmoji(suggestion.priority)} ${suggestion.message}`);
      });
    }

    console.log('\n========================\n');
  }

  /**
   * 生成 JSON 报告
   */
  async _generateJsonReport(results, reportsDir, timestamp) {
    const filename = `quality-report-${timestamp}.json`;
    const filepath = path.join(reportsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(results, null, 2));
    console.log(`📄 JSON report saved: ${filename}`);
  }

  /**
   * 生成 HTML 报告
   */
  async _generateHtmlReport(results, reportsDir, timestamp) {
    const filename = `quality-report-${timestamp}.html`;
    const filepath = path.join(reportsDir, filename);
    
    const html = this._generateHtmlContent(results);
    await fs.writeFile(filepath, html);
    console.log(`🌐 HTML report saved: ${filename}`);
  }

  /**
   * 生成 HTML 内容
   */
  _generateHtmlContent(results) {
    const statusColor = {
      'passed': '#28a745',
      'warning': '#ffc107',
      'failed': '#dc3545',
      'error': '#dc3545'
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quality Check Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .status { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin-left: 10px; }
        .content { padding: 30px; }
        .section { margin-bottom: 30px; }
        .section h3 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .metric { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .metric:last-child { border-bottom: none; }
        .metric-value { font-weight: bold; }
        .issues { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 10px 0; }
        .suggestions { background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 4px; padding: 15px; margin: 10px 0; }
        .timestamp { color: #666; font-size: 0.9em; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: #f8f9fa; border-radius: 6px; padding: 20px; }
        .progress-bar { background: #e9ecef; border-radius: 10px; height: 20px; overflow: hidden; }
        .progress-fill { height: 100%; transition: width 0.3s ease; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Quality Check Report</h1>
            <div class="timestamp">${results.timestamp}</div>
            <span class="status" style="background-color: ${statusColor[results.overallStatus]}">
                ${results.overallStatus.toUpperCase()}
            </span>
        </div>
        
        <div class="content">
            ${this._generateCodeQualitySection(results.checks.codeQuality)}
            ${this._generateFunctionalValidationSection(results.checks.functionalValidation)}
            ${this._generateIntelligentWarningsSection(results.checks.intelligentWarnings)}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 生成代码质量部分的 HTML
   */
  _generateCodeQualitySection(codeQuality) {
    if (!codeQuality) return '';

    const metrics = codeQuality.metrics;
    
    return `
    <div class="section">
        <h3>🔍 Code Quality</h3>
        <div class="grid">
            ${metrics.eslint ? `
            <div class="card">
                <h4>ESLint Analysis</h4>
                <div class="metric">
                    <span>Errors:</span>
                    <span class="metric-value" style="color: ${metrics.eslint.errors > 0 ? '#dc3545' : '#28a745'}">${metrics.eslint.errors}</span>
                </div>
                <div class="metric">
                    <span>Warnings:</span>
                    <span class="metric-value" style="color: ${metrics.eslint.warnings > 10 ? '#ffc107' : '#28a745'}">${metrics.eslint.warnings}</span>
                </div>
                <div class="metric">
                    <span>Auto-fixable:</span>
                    <span class="metric-value">${metrics.eslint.fixableIssues}</span>
                </div>
            </div>
            ` : ''}
            
            ${metrics.testCoverage ? `
            <div class="card">
                <h4>Test Coverage</h4>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${metrics.testCoverage.percentage}%; background-color: ${metrics.testCoverage.percentage >= 80 ? '#28a745' : metrics.testCoverage.percentage >= 60 ? '#ffc107' : '#dc3545'}"></div>
                </div>
                <div class="metric">
                    <span>Coverage:</span>
                    <span class="metric-value">${metrics.testCoverage.percentage}%</span>
                </div>
                <div class="metric">
                    <span>Total Lines:</span>
                    <span class="metric-value">${metrics.testCoverage.totalLines || 'N/A'}</span>
                </div>
            </div>
            ` : ''}
            
            ${metrics.codeComplexity ? `
            <div class="card">
                <h4>Code Complexity</h4>
                <div class="metric">
                    <span>Average Complexity:</span>
                    <span class="metric-value" style="color: ${metrics.codeComplexity.averageComplexity > 10 ? '#dc3545' : '#28a745'}">${metrics.codeComplexity.averageComplexity}</span>
                </div>
                <div class="metric">
                    <span>Complex Functions:</span>
                    <span class="metric-value">${metrics.codeComplexity.highComplexityFunctions?.length || 0}</span>
                </div>
            </div>
            ` : ''}
        </div>
        
        ${codeQuality.issues?.length > 0 ? `
        <div class="issues">
            <h4>⚠️ Issues Found</h4>
            ${codeQuality.issues.map(issue => `<div>• ${issue.message}</div>`).join('')}
        </div>
        ` : ''}
        
        ${codeQuality.suggestions?.length > 0 ? `
        <div class="suggestions">
            <h4>💡 Suggestions</h4>
            ${codeQuality.suggestions.map(suggestion => `<div>• ${suggestion.message}</div>`).join('')}
        </div>
        ` : ''}
    </div>`;
  }

  /**
   * 生成功能验证部分的 HTML
   */
  _generateFunctionalValidationSection(functionalValidation) {
    if (!functionalValidation) return '';

    return `
    <div class="section">
        <h3>🧪 Functional Validation</h3>
        <div class="card">
            <div class="metric">
                <span>Status:</span>
                <span class="metric-value" style="color: ${functionalValidation.status === 'passed' ? '#28a745' : '#dc3545'}">${functionalValidation.status}</span>
            </div>
            ${functionalValidation.testResults ? `
            <div class="metric">
                <span>Tests Passed:</span>
                <span class="metric-value">${functionalValidation.testResults.passed}/${functionalValidation.testResults.total}</span>
            </div>
            ` : ''}
        </div>
    </div>`;
  }

  /**
   * 生成智能预警部分的 HTML
   */
  _generateIntelligentWarningsSection(intelligentWarnings) {
    if (!intelligentWarnings) return '';

    return `
    <div class="section">
        <h3>⚠️ Intelligent Warnings</h3>
        <div class="card">
            ${intelligentWarnings.warnings?.length > 0 ? `
                ${intelligentWarnings.warnings.map(warning => `
                    <div class="metric">
                        <span>${warning.message}</span>
                        <span class="metric-value" style="color: ${warning.severity === 'high' ? '#dc3545' : warning.severity === 'medium' ? '#ffc107' : '#28a745'}">${warning.severity}</span>
                    </div>
                `).join('')}
            ` : '<div>✅ No warnings detected</div>'}
        </div>
    </div>`;
  }

  /**
   * 生成趋势报告
   */
  async _generateTrendReport(reportsDir) {
    try {
      const historyDir = path.join(this.config.projectRoot, '.kiro', 'quality-checks', 'history');
      
      try {
        const files = await fs.readdir(historyDir);
        const qualityFiles = files
          .filter(f => f.startsWith('quality-metrics-'))
          .sort()
          .slice(-10); // 最近10个报告

        if (qualityFiles.length < 2) {
          return; // 需要至少2个报告才能生成趋势
        }

        const trends = [];
        
        for (const file of qualityFiles) {
          try {
            const content = await fs.readFile(path.join(historyDir, file), 'utf8');
            const data = JSON.parse(content);
            
            if (data.checks?.codeQuality?.metrics) {
              trends.push({
                timestamp: data.timestamp,
                eslintErrors: data.checks.codeQuality.metrics.eslint?.errors || 0,
                eslintWarnings: data.checks.codeQuality.metrics.eslint?.warnings || 0,
                testCoverage: data.checks.codeQuality.metrics.testCoverage?.percentage || 0,
                codeComplexity: data.checks.codeQuality.metrics.codeComplexity?.averageComplexity || 0
              });
            }
          } catch (error) {
            // 忽略无法解析的文件
          }
        }

        if (trends.length >= 2) {
          const trendReport = this._analyzeTrends(trends);
          const trendFilename = `quality-trends-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
          await fs.writeFile(path.join(reportsDir, trendFilename), JSON.stringify(trendReport, null, 2));
          console.log(`📈 Trend report saved: ${trendFilename}`);
        }
      } catch (error) {
        // 历史目录不存在或无法访问
      }
    } catch (error) {
      console.warn('Failed to generate trend report:', error.message);
    }
  }

  /**
   * 分析趋势
   */
  _analyzeTrends(trends) {
    const latest = trends[trends.length - 1];
    const previous = trends[trends.length - 2];

    const changes = {
      eslintErrors: latest.eslintErrors - previous.eslintErrors,
      eslintWarnings: latest.eslintWarnings - previous.eslintWarnings,
      testCoverage: latest.testCoverage - previous.testCoverage,
      codeComplexity: latest.codeComplexity - previous.codeComplexity
    };

    const analysis = {
      timestamp: new Date().toISOString(),
      period: `${previous.timestamp} to ${latest.timestamp}`,
      changes,
      trends: {
        eslintErrors: changes.eslintErrors === 0 ? 'stable' : changes.eslintErrors > 0 ? 'increasing' : 'decreasing',
        eslintWarnings: changes.eslintWarnings === 0 ? 'stable' : changes.eslintWarnings > 0 ? 'increasing' : 'decreasing',
        testCoverage: changes.testCoverage === 0 ? 'stable' : changes.testCoverage > 0 ? 'improving' : 'declining',
        codeComplexity: changes.codeComplexity === 0 ? 'stable' : changes.codeComplexity > 0 ? 'increasing' : 'decreasing'
      },
      summary: this._generateTrendSummary(changes)
    };

    return analysis;
  }

  /**
   * 生成趋势摘要
   */
  _generateTrendSummary(changes) {
    const improvements = [];
    const regressions = [];

    if (changes.eslintErrors < 0) improvements.push(`ESLint errors reduced by ${Math.abs(changes.eslintErrors)}`);
    if (changes.eslintErrors > 0) regressions.push(`ESLint errors increased by ${changes.eslintErrors}`);

    if (changes.eslintWarnings < 0) improvements.push(`ESLint warnings reduced by ${Math.abs(changes.eslintWarnings)}`);
    if (changes.eslintWarnings > 0) regressions.push(`ESLint warnings increased by ${changes.eslintWarnings}`);

    if (changes.testCoverage > 0) improvements.push(`Test coverage improved by ${changes.testCoverage.toFixed(1)}%`);
    if (changes.testCoverage < 0) regressions.push(`Test coverage declined by ${Math.abs(changes.testCoverage).toFixed(1)}%`);

    if (changes.codeComplexity < 0) improvements.push(`Code complexity reduced by ${Math.abs(changes.codeComplexity).toFixed(1)}`);
    if (changes.codeComplexity > 0) regressions.push(`Code complexity increased by ${changes.codeComplexity.toFixed(1)}`);

    return {
      improvements,
      regressions,
      overallTrend: regressions.length === 0 ? 'improving' : improvements.length > regressions.length ? 'mixed_positive' : 'declining'
    };
  }

  /**
   * 获取状态表情符号
   */
  _getStatusEmoji(status) {
    const emojis = {
      'passed': '✅',
      'warning': '⚠️',
      'failed': '❌',
      'error': '💥'
    };
    return emojis[status] || '❓';
  }

  /**
   * 获取严重程度表情符号
   */
  _getSeverityEmoji(severity) {
    const emojis = {
      'high': '🔴',
      'medium': '🟡',
      'low': '🟢'
    };
    return emojis[severity] || '⚪';
  }

  /**
   * 获取优先级表情符号
   */
  _getPriorityEmoji(priority) {
    const emojis = {
      'high': '🔥',
      'medium': '📋',
      'low': '💡'
    };
    return emojis[priority] || '📝';
  }
}

module.exports = QualityReporter;