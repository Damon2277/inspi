/**
 * 智能问题预警系统
 * 实现问题模式识别算法，创建预警通知机制，建立修复建议生成功能
 */

const fs = require('fs').promises;
const path = require('path');

class IntelligentWarningSystem {
  constructor(config = {}) {
    this.config = {
      projectRoot: process.cwd(),
      warningThresholds: {
        errorTrend: 3, // 连续3次增长触发预警
        performanceDegradation: 20, // 性能下降20%触发预警
        testCoverageDecline: 5, // 覆盖率下降5%触发预警
        complexityIncrease: 2, // 复杂度增加2点触发预警
        duplicateCodeIncrease: 3 // 重复代码增加3%触发预警
      },
      patternAnalysis: {
        lookbackPeriod: 10, // 分析最近10次记录
        minDataPoints: 3 // 至少需要3个数据点才能分析趋势
      },
      ...config
    };

    this.knownPatterns = [
      {
        id: 'increasing_errors',
        name: 'Increasing Error Trend',
        description: 'ESLint errors are consistently increasing',
        severity: 'high',
        pattern: (data) => this._detectIncreasingTrend(data, 'eslintErrors')
      },
      {
        id: 'declining_coverage',
        name: 'Declining Test Coverage',
        description: 'Test coverage is consistently declining',
        severity: 'high',
        pattern: (data) => this._detectDecliningTrend(data, 'testCoverage')
      },
      {
        id: 'complexity_growth',
        name: 'Growing Code Complexity',
        description: 'Code complexity is increasing over time',
        severity: 'medium',
        pattern: (data) => this._detectIncreasingTrend(data, 'codeComplexity')
      },
      {
        id: 'test_instability',
        name: 'Test Result Instability',
        description: 'Test results are fluctuating significantly',
        severity: 'medium',
        pattern: (data) => this._detectTestInstability(data)
      },
      {
        id: 'dependency_issues',
        name: 'Dependency Management Issues',
        description: 'Increasing number of outdated or vulnerable dependencies',
        severity: 'medium',
        pattern: (data) => this._detectDependencyIssues(data)
      },
      {
        id: 'performance_degradation',
        name: 'Performance Degradation',
        description: 'System performance is declining',
        severity: 'high',
        pattern: (data) => this._detectPerformanceDegradation(data)
      }
    ];
  }

  /**
   * 分析并生成智能预警
   */
  async analyzeForWarnings(qualityChecks) {
    const results = {
      status: 'passed',
      timestamp: new Date().toISOString(),
      warnings: [],
      patterns: [],
      recommendations: [],
      riskAssessment: {
        overall: 'low',
        factors: []
      }
    };

    try {
      console.log('    🔍 Analyzing patterns and trends...');

      // 1. 获取历史数据
      const historicalData = await this._getHistoricalData();

      // 2. 分析当前质量检查结果
      const currentWarnings = this._analyzeCurrentResults(qualityChecks);
      results.warnings.push(...currentWarnings);

      // 3. 执行模式识别
      if (historicalData.length >= this.config.patternAnalysis.minDataPoints) {
        const patternWarnings = await this._executePatternAnalysis(historicalData);
        results.warnings.push(...patternWarnings);
        results.patterns = patternWarnings.map(w => w.pattern).filter(p => p);
      }

      // 4. 生成智能建议
      results.recommendations = this._generateIntelligentRecommendations(results.warnings, qualityChecks);

      // 5. 评估整体风险
      results.riskAssessment = this._assessOverallRisk(results.warnings, qualityChecks);

      // 6. 确定预警状态
      results.status = this._determineWarningStatus(results.warnings);

      // 7. 保存预警结果
      await this._saveWarningResults(results);

      // 8. 发送通知（如果需要）
      await this._sendNotifications(results);

      return results;
    } catch (error) {
      console.error('Intelligent warning analysis error:', error);
      results.status = 'error';
      results.error = error.message;
      return results;
    }
  }

  /**
   * 获取历史数据
   */
  async _getHistoricalData() {
    try {
      const historyPath = path.join(this.config.projectRoot, '.kiro', 'quality-checks', 'history');
      
      const files = await fs.readdir(historyPath);
      const qualityFiles = files
        .filter(f => f.startsWith('quality-metrics-'))
        .sort()
        .slice(-this.config.patternAnalysis.lookbackPeriod);

      const historicalData = [];

      for (const file of qualityFiles) {
        try {
          const content = await fs.readFile(path.join(historyPath, file), 'utf8');
          const data = JSON.parse(content);
          
          if (data.checks?.codeQuality?.metrics) {
            const metrics = data.checks.codeQuality.metrics;
            historicalData.push({
              timestamp: data.timestamp,
              eslintErrors: metrics.eslint?.errors || 0,
              eslintWarnings: metrics.eslint?.warnings || 0,
              testCoverage: metrics.testCoverage?.percentage || 0,
              codeComplexity: metrics.codeComplexity?.averageComplexity || 0,
              duplicateCode: metrics.duplicateCode?.percentage || 0,
              dependencyIssues: (metrics.dependencies?.outdated?.length || 0) + (metrics.dependencies?.vulnerable?.length || 0),
              testsPassed: data.checks.functionalValidation?.testResults?.passed || 0,
              testsFailed: data.checks.functionalValidation?.testResults?.failed || 0,
              testsTotal: data.checks.functionalValidation?.testResults?.total || 0
            });
          }
        } catch (error) {
          // 忽略无法解析的文件
        }
      }

      return historicalData;
    } catch (error) {
      return [];
    }
  }

  /**
   * 分析当前结果
   */
  _analyzeCurrentResults(qualityChecks) {
    const warnings = [];

    // 分析代码质量检查结果
    if (qualityChecks.codeQuality) {
      const cq = qualityChecks.codeQuality;

      // 检查严重的质量问题
      if (cq.issues) {
        const highSeverityIssues = cq.issues.filter(issue => issue.severity === 'high');
        if (highSeverityIssues.length > 0) {
          warnings.push({
            id: 'high_severity_quality_issues',
            type: 'immediate',
            severity: 'high',
            message: `Found ${highSeverityIssues.length} high-severity quality issues`,
            details: highSeverityIssues.map(issue => issue.message),
            actionRequired: true
          });
        }
      }

      // 检查测试覆盖率
      if (cq.metrics?.testCoverage?.percentage < 50) {
        warnings.push({
          id: 'very_low_coverage',
          type: 'immediate',
          severity: 'high',
          message: `Test coverage is critically low: ${cq.metrics.testCoverage.percentage}%`,
          recommendation: 'Add comprehensive tests to improve coverage',
          actionRequired: true
        });
      }

      // 检查代码复杂度
      if (cq.metrics?.codeComplexity?.highComplexityFunctions?.length > 5) {
        warnings.push({
          id: 'high_complexity_functions',
          type: 'immediate',
          severity: 'medium',
          message: `Found ${cq.metrics.codeComplexity.highComplexityFunctions.length} highly complex functions`,
          recommendation: 'Consider refactoring complex functions to improve maintainability',
          actionRequired: false
        });
      }
    }

    // 分析功能验证结果
    if (qualityChecks.functionalValidation) {
      const fv = qualityChecks.functionalValidation;

      // 检查测试失败
      if (fv.testResults?.failed > 0) {
        warnings.push({
          id: 'failing_tests',
          type: 'immediate',
          severity: 'high',
          message: `${fv.testResults.failed} tests are currently failing`,
          recommendation: 'Fix failing tests before proceeding with development',
          actionRequired: true
        });
      }

      // 检查回归问题
      if (fv.regressionIssues?.length > 0) {
        const highSeverityRegressions = fv.regressionIssues.filter(issue => issue.severity === 'high');
        if (highSeverityRegressions.length > 0) {
          warnings.push({
            id: 'functional_regression',
            type: 'immediate',
            severity: 'high',
            message: `Detected ${highSeverityRegressions.length} functional regressions`,
            details: highSeverityRegressions.map(issue => issue.message),
            actionRequired: true
          });
        }
      }
    }

    return warnings;
  }

  /**
   * 执行模式分析
   */
  async _executePatternAnalysis(historicalData) {
    const patternWarnings = [];

    for (const patternDef of this.knownPatterns) {
      try {
        const patternResult = patternDef.pattern(historicalData);
        
        if (patternResult.detected) {
          patternWarnings.push({
            id: patternDef.id,
            type: 'pattern',
            severity: patternDef.severity,
            message: patternDef.description,
            pattern: {
              name: patternDef.name,
              confidence: patternResult.confidence,
              trend: patternResult.trend,
              dataPoints: patternResult.dataPoints
            },
            recommendation: this._getPatternRecommendation(patternDef.id),
            actionRequired: patternDef.severity === 'high'
          });
        }
      } catch (error) {
        console.warn(`Pattern analysis failed for ${patternDef.id}:`, error.message);
      }
    }

    return patternWarnings;
  }

  /**
   * 检测递增趋势
   */
  _detectIncreasingTrend(data, metric) {
    if (data.length < this.config.patternAnalysis.minDataPoints) {
      return { detected: false };
    }

    const values = data.map(d => d[metric]).filter(v => v !== undefined);
    if (values.length < this.config.patternAnalysis.minDataPoints) {
      return { detected: false };
    }

    // 计算趋势
    let increasingCount = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i - 1]) {
        increasingCount++;
      }
    }

    const trendRatio = increasingCount / (values.length - 1);
    const detected = trendRatio >= 0.6; // 60%的时间在增长

    return {
      detected,
      confidence: Math.round(trendRatio * 100),
      trend: 'increasing',
      dataPoints: values.length,
      currentValue: values[values.length - 1],
      previousValue: values[0]
    };
  }

  /**
   * 检测下降趋势
   */
  _detectDecliningTrend(data, metric) {
    if (data.length < this.config.patternAnalysis.minDataPoints) {
      return { detected: false };
    }

    const values = data.map(d => d[metric]).filter(v => v !== undefined);
    if (values.length < this.config.patternAnalysis.minDataPoints) {
      return { detected: false };
    }

    // 计算趋势
    let decliningCount = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i] < values[i - 1]) {
        decliningCount++;
      }
    }

    const trendRatio = decliningCount / (values.length - 1);
    const detected = trendRatio >= 0.6; // 60%的时间在下降

    return {
      detected,
      confidence: Math.round(trendRatio * 100),
      trend: 'declining',
      dataPoints: values.length,
      currentValue: values[values.length - 1],
      previousValue: values[0]
    };
  }

  /**
   * 检测测试不稳定性
   */
  _detectTestInstability(data) {
    if (data.length < this.config.patternAnalysis.minDataPoints) {
      return { detected: false };
    }

    const passRates = data
      .filter(d => d.testsTotal > 0)
      .map(d => (d.testsPassed / d.testsTotal) * 100);

    if (passRates.length < this.config.patternAnalysis.minDataPoints) {
      return { detected: false };
    }

    // 计算标准差
    const mean = passRates.reduce((sum, rate) => sum + rate, 0) / passRates.length;
    const variance = passRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / passRates.length;
    const stdDev = Math.sqrt(variance);

    // 如果标准差大于15%，认为不稳定
    const detected = stdDev > 15;

    return {
      detected,
      confidence: Math.min(Math.round(stdDev * 2), 100),
      trend: 'unstable',
      dataPoints: passRates.length,
      standardDeviation: Math.round(stdDev * 100) / 100,
      averagePassRate: Math.round(mean * 100) / 100
    };
  }

  /**
   * 检测依赖问题
   */
  _detectDependencyIssues(data) {
    if (data.length < this.config.patternAnalysis.minDataPoints) {
      return { detected: false };
    }

    const dependencyIssues = data.map(d => d.dependencyIssues || 0);
    
    // 检查是否有增长趋势
    let increasingCount = 0;
    for (let i = 1; i < dependencyIssues.length; i++) {
      if (dependencyIssues[i] > dependencyIssues[i - 1]) {
        increasingCount++;
      }
    }

    const trendRatio = increasingCount / (dependencyIssues.length - 1);
    const currentIssues = dependencyIssues[dependencyIssues.length - 1];
    
    // 如果当前问题数量大于5或者有明显增长趋势
    const detected = currentIssues > 5 || trendRatio >= 0.5;

    return {
      detected,
      confidence: Math.round(Math.max(trendRatio, currentIssues / 10) * 100),
      trend: trendRatio >= 0.5 ? 'increasing' : 'stable',
      dataPoints: dependencyIssues.length,
      currentIssues,
      previousIssues: dependencyIssues[0]
    };
  }

  /**
   * 检测性能下降
   */
  _detectPerformanceDegradation(data) {
    // 这里可以扩展为检测构建时间、测试执行时间等性能指标
    // 目前返回未检测到，因为我们还没有收集这些指标
    return { detected: false };
  }

  /**
   * 生成智能建议
   */
  _generateIntelligentRecommendations(warnings, qualityChecks) {
    const recommendations = [];

    // 基于警告类型生成建议
    const warningTypes = warnings.map(w => w.id);

    if (warningTypes.includes('high_severity_quality_issues')) {
      recommendations.push({
        priority: 'high',
        category: 'code_quality',
        action: 'Fix ESLint errors immediately',
        command: 'cd inspi-ai-platform && npx eslint src --fix',
        description: 'Run ESLint with auto-fix to resolve common issues'
      });
    }

    if (warningTypes.includes('very_low_coverage')) {
      recommendations.push({
        priority: 'high',
        category: 'testing',
        action: 'Improve test coverage',
        command: 'cd inspi-ai-platform && npm test -- --coverage',
        description: 'Add tests for uncovered code paths, focusing on critical functionality'
      });
    }

    if (warningTypes.includes('failing_tests')) {
      recommendations.push({
        priority: 'high',
        category: 'testing',
        action: 'Fix failing tests',
        command: 'cd inspi-ai-platform && npm test',
        description: 'Review and fix all failing tests before continuing development'
      });
    }

    if (warningTypes.includes('increasing_errors')) {
      recommendations.push({
        priority: 'medium',
        category: 'process',
        action: 'Implement stricter code review process',
        description: 'Set up pre-commit hooks and enforce code quality standards'
      });
    }

    if (warningTypes.includes('declining_coverage')) {
      recommendations.push({
        priority: 'medium',
        category: 'testing',
        action: 'Establish coverage requirements',
        description: 'Set minimum coverage thresholds and enforce them in CI/CD pipeline'
      });
    }

    if (warningTypes.includes('complexity_growth')) {
      recommendations.push({
        priority: 'medium',
        category: 'refactoring',
        action: 'Refactor complex functions',
        description: 'Break down complex functions into smaller, more manageable pieces'
      });
    }

    // 基于质量检查结果生成额外建议
    if (qualityChecks.codeQuality?.suggestions) {
      qualityChecks.codeQuality.suggestions.forEach(suggestion => {
        recommendations.push({
          priority: suggestion.priority,
          category: 'code_quality',
          action: suggestion.message,
          description: 'Automated suggestion from code quality analysis'
        });
      });
    }

    return recommendations.slice(0, 10); // 限制建议数量
  }

  /**
   * 评估整体风险
   */
  _assessOverallRisk(warnings, qualityChecks) {
    const riskFactors = [];
    let riskScore = 0;

    // 基于警告严重程度计算风险分数
    warnings.forEach(warning => {
      switch (warning.severity) {
        case 'high':
          riskScore += 3;
          riskFactors.push({
            factor: warning.message,
            impact: 'high',
            weight: 3
          });
          break;
        case 'medium':
          riskScore += 2;
          riskFactors.push({
            factor: warning.message,
            impact: 'medium',
            weight: 2
          });
          break;
        case 'low':
          riskScore += 1;
          riskFactors.push({
            factor: warning.message,
            impact: 'low',
            weight: 1
          });
          break;
      }
    });

    // 基于质量指标调整风险分数
    if (qualityChecks.codeQuality?.metrics) {
      const metrics = qualityChecks.codeQuality.metrics;
      
      if (metrics.testCoverage?.percentage < 60) {
        riskScore += 2;
        riskFactors.push({
          factor: 'Low test coverage',
          impact: 'medium',
          weight: 2
        });
      }

      if (metrics.eslint?.errors > 5) {
        riskScore += 2;
        riskFactors.push({
          factor: 'High number of ESLint errors',
          impact: 'medium',
          weight: 2
        });
      }
    }

    // 确定整体风险等级
    let overallRisk;
    if (riskScore >= 8) {
      overallRisk = 'critical';
    } else if (riskScore >= 5) {
      overallRisk = 'high';
    } else if (riskScore >= 2) {
      overallRisk = 'medium';
    } else {
      overallRisk = 'low';
    }

    return {
      overall: overallRisk,
      score: riskScore,
      factors: riskFactors,
      recommendation: this._getRiskRecommendation(overallRisk)
    };
  }

  /**
   * 获取风险建议
   */
  _getRiskRecommendation(riskLevel) {
    const recommendations = {
      critical: 'Immediate action required. Stop development and address critical issues.',
      high: 'High priority issues detected. Address before continuing with new features.',
      medium: 'Monitor closely and plan to address issues in next development cycle.',
      low: 'Continue development with regular monitoring.'
    };

    return recommendations[riskLevel] || recommendations.low;
  }

  /**
   * 获取模式建议
   */
  _getPatternRecommendation(patternId) {
    const recommendations = {
      increasing_errors: 'Implement stricter code review and pre-commit checks',
      declining_coverage: 'Establish coverage requirements and add tests for new code',
      complexity_growth: 'Refactor complex functions and establish complexity limits',
      test_instability: 'Investigate flaky tests and improve test reliability',
      dependency_issues: 'Regularly update dependencies and monitor security advisories',
      performance_degradation: 'Profile application performance and optimize bottlenecks'
    };

    return recommendations[patternId] || 'Monitor the situation and take appropriate action';
  }

  /**
   * 确定预警状态
   */
  _determineWarningStatus(warnings) {
    const highSeverityWarnings = warnings.filter(w => w.severity === 'high');
    const actionRequiredWarnings = warnings.filter(w => w.actionRequired);

    if (highSeverityWarnings.length > 0 || actionRequiredWarnings.length > 0) {
      return 'warning';
    }

    return 'passed';
  }

  /**
   * 保存预警结果
   */
  async _saveWarningResults(results) {
    try {
      const historyPath = path.join(this.config.projectRoot, '.kiro', 'quality-checks', 'warnings');
      await fs.mkdir(historyPath, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `warnings-${timestamp}.json`;
      const filepath = path.join(historyPath, filename);

      await fs.writeFile(filepath, JSON.stringify(results, null, 2));

      // 保持最近50个预警记录
      const files = await fs.readdir(historyPath);
      const warningFiles = files.filter(f => f.startsWith('warnings-')).sort();
      
      if (warningFiles.length > 50) {
        const filesToDelete = warningFiles.slice(0, warningFiles.length - 50);
        for (const file of filesToDelete) {
          await fs.unlink(path.join(historyPath, file));
        }
      }
    } catch (error) {
      console.warn('Failed to save warning results:', error.message);
    }
  }

  /**
   * 发送通知
   */
  async _sendNotifications(results) {
    try {
      // 检查是否有需要立即通知的警告
      const criticalWarnings = results.warnings.filter(w => 
        w.severity === 'high' && w.actionRequired
      );

      if (criticalWarnings.length > 0) {
        console.log('\n🚨 CRITICAL WARNINGS DETECTED 🚨');
        console.log('=====================================');
        
        criticalWarnings.forEach(warning => {
          console.log(`❌ ${warning.message}`);
          if (warning.recommendation) {
            console.log(`   💡 ${warning.recommendation}`);
          }
        });
        
        console.log('=====================================\n');

        // 这里可以扩展为发送邮件、Slack通知等
        await this._saveNotificationLog(criticalWarnings);
      }

      // 检查整体风险等级
      if (results.riskAssessment?.overall === 'critical') {
        console.log('\n🔴 CRITICAL RISK LEVEL DETECTED');
        console.log(`Risk Score: ${results.riskAssessment.score}`);
        console.log(`Recommendation: ${results.riskAssessment.recommendation}`);
        console.log('');
      }
    } catch (error) {
      console.warn('Failed to send notifications:', error.message);
    }
  }

  /**
   * 保存通知日志
   */
  async _saveNotificationLog(criticalWarnings) {
    try {
      const notificationsPath = path.join(this.config.projectRoot, '.kiro', 'quality-checks', 'notifications');
      await fs.mkdir(notificationsPath, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `notification-${timestamp}.json`;
      const filepath = path.join(notificationsPath, filename);

      const notificationData = {
        timestamp: new Date().toISOString(),
        type: 'critical_warning',
        warnings: criticalWarnings,
        notificationSent: true
      };

      await fs.writeFile(filepath, JSON.stringify(notificationData, null, 2));
    } catch (error) {
      console.warn('Failed to save notification log:', error.message);
    }
  }
}

module.exports = IntelligentWarningSystem;