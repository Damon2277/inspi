#!/usr/bin/env node

/**
 * 持续改进跟踪脚本
 * 用于收集数据、分析趋势、识别改进机会
 */

const fs = require('fs');
const path = require('path');

// 改进类型定义
const IMPROVEMENT_TYPES = {
  PROCESS: 'process',
  TOOL: 'tool',
  QUALITY: 'quality',
  EFFICIENCY: 'efficiency',
  COLLABORATION: 'collaboration'
};

// 改进状态
const IMPROVEMENT_STATUS = {
  IDENTIFIED: 'identified',
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  IMPLEMENTED: 'implemented',
  VALIDATED: 'validated',
  CLOSED: 'closed'
};

class ImprovementTracker {
  constructor() {
    this.improvements = this.loadImprovements();
    this.metrics = this.loadMetrics();
  }

  /**
   * 加载现有改进记录
   */
  loadImprovements() {
    const improvementsFile = path.join(process.cwd(), 'docs', 'improvements', 'improvements.json');
    
    if (fs.existsSync(improvementsFile)) {
      try {
        return JSON.parse(fs.readFileSync(improvementsFile, 'utf8'));
      } catch (error) {
        console.warn('Failed to load improvements:', error.message);
      }
    }

    return [];
  }

  /**
   * 加载历史指标数据
   */
  loadMetrics() {
    const metricsFile = path.join(process.cwd(), 'docs', 'metrics', 'historical-metrics.json');
    
    if (fs.existsSync(metricsFile)) {
      try {
        return JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
      } catch (error) {
        console.warn('Failed to load metrics:', error.message);
      }
    }

    return {
      efficiency: [],
      quality: [],
      collaboration: []
    };
  }

  /**
   * 收集当前项目数据
   */
  collectCurrentData() {
    const data = {
      timestamp: new Date().toISOString(),
      efficiency: this.collectEfficiencyData(),
      quality: this.collectQualityData(),
      collaboration: this.collectCollaborationData()
    };

    // 保存到历史数据
    this.metrics.efficiency.push(data.efficiency);
    this.metrics.quality.push(data.quality);
    this.metrics.collaboration.push(data.collaboration);

    this.saveMetrics();
    return data;
  }

  /**
   * 收集效率数据
   */
  collectEfficiencyData() {
    const taskFiles = [
      '.kiro/specs/inspi-ai-platform/tasks.md',
      '.kiro/specs/project-management-rules-enhancement/tasks.md'
    ];

    let totalTasks = 0;
    let completedTasks = 0;
    let blockedTasks = 0;

    taskFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach(line => {
          if (line.includes('- [') && line.includes(']')) {
            totalTasks++;
            if (line.includes('[x]')) completedTasks++;
            if (line.includes('[!]') || line.includes('[R]') || line.includes('[~]') || line.includes('[P]')) {
              blockedTasks++;
            }
          }
        });
      }
    });

    return {
      timestamp: new Date().toISOString(),
      totalTasks,
      completedTasks,
      blockedTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(2) : 0,
      blockingRate: totalTasks > 0 ? (blockedTasks / totalTasks * 100).toFixed(2) : 0
    };
  }

  /**
   * 收集质量数据
   */
  collectQualityData() {
    let coverageData = null;
    let qualityGateData = null;

    // 尝试读取覆盖率数据
    const coverageFile = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    if (fs.existsSync(coverageFile)) {
      try {
        const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
        coverageData = {
          lines: coverage.total.lines.pct,
          functions: coverage.total.functions.pct,
          branches: coverage.total.branches.pct,
          statements: coverage.total.statements.pct
        };
      } catch (error) {
        console.warn('Failed to read coverage data:', error.message);
      }
    }

    // 尝试读取最新的质量门禁报告
    const reportsDir = path.join(process.cwd(), 'docs', 'reports');
    if (fs.existsSync(reportsDir)) {
      const reportFiles = fs.readdirSync(reportsDir)
        .filter(file => file.startsWith('quality-gate-'))
        .sort()
        .reverse();

      if (reportFiles.length > 0) {
        try {
          const latestReport = JSON.parse(
            fs.readFileSync(path.join(reportsDir, reportFiles[0]), 'utf8')
          );
          qualityGateData = {
            passed: latestReport.passed,
            totalChecks: latestReport.summary.total,
            passedChecks: latestReport.summary.passed,
            failedChecks: latestReport.summary.failed
          };
        } catch (error) {
          console.warn('Failed to read quality gate data:', error.message);
        }
      }
    }

    return {
      timestamp: new Date().toISOString(),
      coverage: coverageData,
      qualityGate: qualityGateData
    };
  }

  /**
   * 收集协作数据
   */
  collectCollaborationData() {
    let notificationData = null;
    let issueData = null;

    // 尝试读取通知数据
    const notificationsDir = path.join(process.cwd(), 'docs', 'notifications');
    if (fs.existsSync(notificationsDir)) {
      const notificationFiles = fs.readdirSync(notificationsDir);
      notificationData = {
        totalNotifications: notificationFiles.length,
        recentNotifications: notificationFiles.slice(-10).length
      };
    }

    // 尝试读取问题数据
    const issuesDir = path.join(process.cwd(), 'docs', 'issues');
    if (fs.existsSync(issuesDir)) {
      const issueFiles = fs.readdirSync(issuesDir);
      let openIssues = 0;
      let closedIssues = 0;

      issueFiles.forEach(file => {
        try {
          const issue = JSON.parse(fs.readFileSync(path.join(issuesDir, file), 'utf8'));
          if (issue.status === 'open') openIssues++;
          else closedIssues++;
        } catch (error) {
          // 忽略读取错误
        }
      });

      issueData = {
        totalIssues: issueFiles.length,
        openIssues,
        closedIssues
      };
    }

    return {
      timestamp: new Date().toISOString(),
      notifications: notificationData,
      issues: issueData
    };
  }

  /**
   * 分析趋势和识别改进机会
   */
  analyzeAndIdentifyImprovements() {
    const analysis = {
      timestamp: new Date().toISOString(),
      trends: this.analyzeTrends(),
      opportunities: this.identifyOpportunities(),
      recommendations: []
    };

    // 基于分析结果生成建议
    analysis.recommendations = this.generateRecommendations(analysis.trends, analysis.opportunities);

    // 保存分析结果
    this.saveAnalysis(analysis);
    return analysis;
  }

  /**
   * 分析趋势
   */
  analyzeTrends() {
    const trends = {
      efficiency: this.analyzeEfficiencyTrend(),
      quality: this.analyzeQualityTrend(),
      collaboration: this.analyzeCollaborationTrend()
    };

    return trends;
  }

  /**
   * 分析效率趋势
   */
  analyzeEfficiencyTrend() {
    const efficiencyData = this.metrics.efficiency.slice(-5); // 最近5次数据
    
    if (efficiencyData.length < 2) {
      return { trend: 'insufficient_data', message: 'Need more data points' };
    }

    const completionRates = efficiencyData.map(d => parseFloat(d.completionRate));
    const blockingRates = efficiencyData.map(d => parseFloat(d.blockingRate));

    const completionTrend = this.calculateTrend(completionRates);
    const blockingTrend = this.calculateTrend(blockingRates);

    return {
      completion: {
        trend: completionTrend,
        current: completionRates[completionRates.length - 1],
        average: completionRates.reduce((a, b) => a + b, 0) / completionRates.length
      },
      blocking: {
        trend: blockingTrend,
        current: blockingRates[blockingRates.length - 1],
        average: blockingRates.reduce((a, b) => a + b, 0) / blockingRates.length
      }
    };
  }

  /**
   * 分析质量趋势
   */
  analyzeQualityTrend() {
    const qualityData = this.metrics.quality.slice(-5);
    
    if (qualityData.length < 2) {
      return { trend: 'insufficient_data', message: 'Need more data points' };
    }

    const coverageData = qualityData
      .filter(d => d.coverage && d.coverage.lines)
      .map(d => d.coverage.lines);

    if (coverageData.length < 2) {
      return { trend: 'insufficient_coverage_data', message: 'Need more coverage data' };
    }

    const coverageTrend = this.calculateTrend(coverageData);

    return {
      coverage: {
        trend: coverageTrend,
        current: coverageData[coverageData.length - 1],
        average: coverageData.reduce((a, b) => a + b, 0) / coverageData.length
      }
    };
  }

  /**
   * 分析协作趋势
   */
  analyzeCollaborationTrend() {
    const collaborationData = this.metrics.collaboration.slice(-5);
    
    if (collaborationData.length < 2) {
      return { trend: 'insufficient_data', message: 'Need more data points' };
    }

    // 分析问题解决趋势
    const issueData = collaborationData
      .filter(d => d.issues)
      .map(d => ({
        total: d.issues.totalIssues,
        open: d.issues.openIssues,
        closed: d.issues.closedIssues
      }));

    if (issueData.length < 2) {
      return { trend: 'insufficient_issue_data', message: 'Need more issue data' };
    }

    const resolutionRates = issueData.map(d => 
      d.total > 0 ? (d.closed / d.total * 100) : 0
    );

    const resolutionTrend = this.calculateTrend(resolutionRates);

    return {
      issueResolution: {
        trend: resolutionTrend,
        current: resolutionRates[resolutionRates.length - 1],
        average: resolutionRates.reduce((a, b) => a + b, 0) / resolutionRates.length
      }
    };
  }

  /**
   * 计算趋势方向
   */
  calculateTrend(data) {
    if (data.length < 2) return 'stable';

    const first = data[0];
    const last = data[data.length - 1];
    const change = ((last - first) / first) * 100;

    if (change > 5) return 'improving';
    if (change < -5) return 'declining';
    return 'stable';
  }

  /**
   * 识别改进机会
   */
  identifyOpportunities() {
    const opportunities = [];
    const currentData = this.collectCurrentData();

    // 效率改进机会
    if (parseFloat(currentData.efficiency.blockingRate) > 10) {
      opportunities.push({
        type: IMPROVEMENT_TYPES.PROCESS,
        priority: 'high',
        title: 'Reduce Task Blocking Rate',
        description: `Current blocking rate is ${currentData.efficiency.blockingRate}%, which is above the 10% threshold`,
        impact: 'high',
        effort: 'medium'
      });
    }

    if (parseFloat(currentData.efficiency.completionRate) < 80) {
      opportunities.push({
        type: IMPROVEMENT_TYPES.EFFICIENCY,
        priority: 'medium',
        title: 'Improve Task Completion Rate',
        description: `Current completion rate is ${currentData.efficiency.completionRate}%, target is 80%+`,
        impact: 'medium',
        effort: 'medium'
      });
    }

    // 质量改进机会
    if (currentData.quality.coverage && currentData.quality.coverage.lines < 85) {
      opportunities.push({
        type: IMPROVEMENT_TYPES.QUALITY,
        priority: 'medium',
        title: 'Improve Code Coverage',
        description: `Current coverage is ${currentData.quality.coverage.lines}%, target is 85%+`,
        impact: 'medium',
        effort: 'low'
      });
    }

    return opportunities;
  }

  /**
   * 生成改进建议
   */
  generateRecommendations(trends, opportunities) {
    const recommendations = [];

    // 基于趋势的建议
    if (trends.efficiency.completion && trends.efficiency.completion.trend === 'declining') {
      recommendations.push({
        type: 'trend_based',
        title: 'Address Declining Completion Rate',
        description: 'Task completion rate is declining. Consider reviewing task complexity and resource allocation.',
        actions: [
          'Review task breakdown and complexity',
          'Assess team capacity and workload',
          'Implement better time estimation practices'
        ]
      });
    }

    if (trends.quality.coverage && trends.quality.coverage.trend === 'declining') {
      recommendations.push({
        type: 'trend_based',
        title: 'Improve Quality Practices',
        description: 'Code coverage is declining. Strengthen testing practices.',
        actions: [
          'Implement test-first development',
          'Add coverage requirements to quality gates',
          'Provide testing training to team'
        ]
      });
    }

    // 基于机会的建议
    opportunities.forEach(opportunity => {
      recommendations.push({
        type: 'opportunity_based',
        title: `Implement: ${opportunity.title}`,
        description: opportunity.description,
        priority: opportunity.priority,
        impact: opportunity.impact,
        effort: opportunity.effort,
        actions: this.getActionsForOpportunity(opportunity)
      });
    });

    return recommendations;
  }

  /**
   * 获取改进机会的具体行动
   */
  getActionsForOpportunity(opportunity) {
    const actionMap = {
      'Reduce Task Blocking Rate': [
        'Implement better problem detection',
        'Improve issue resolution processes',
        'Add more frequent status checks'
      ],
      'Improve Task Completion Rate': [
        'Better task estimation and planning',
        'Reduce task complexity',
        'Improve resource allocation'
      ],
      'Improve Code Coverage': [
        'Add unit tests for uncovered code',
        'Implement test-driven development',
        'Set coverage targets in CI/CD'
      ]
    };

    return actionMap[opportunity.title] || ['Define specific actions for this improvement'];
  }

  /**
   * 创建改进项目
   */
  createImprovement(improvementData) {
    const improvement = {
      id: Date.now().toString(),
      ...improvementData,
      status: IMPROVEMENT_STATUS.IDENTIFIED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.improvements.push(improvement);
    this.saveImprovements();

    console.log(`✅ Created improvement: ${improvement.title}`);
    return improvement;
  }

  /**
   * 更新改进状态
   */
  updateImprovementStatus(improvementId, status, notes = '') {
    const improvement = this.improvements.find(i => i.id === improvementId);
    
    if (!improvement) {
      console.error(`❌ Improvement not found: ${improvementId}`);
      return null;
    }

    improvement.status = status;
    improvement.updatedAt = new Date().toISOString();
    
    if (notes) {
      if (!improvement.notes) improvement.notes = [];
      improvement.notes.push({
        timestamp: new Date().toISOString(),
        note: notes
      });
    }

    this.saveImprovements();
    console.log(`✅ Updated improvement ${improvementId} to status: ${status}`);
    
    return improvement;
  }

  /**
   * 保存改进记录
   */
  saveImprovements() {
    const improvementsDir = path.join(process.cwd(), 'docs', 'improvements');
    if (!fs.existsSync(improvementsDir)) {
      fs.mkdirSync(improvementsDir, { recursive: true });
    }

    const improvementsFile = path.join(improvementsDir, 'improvements.json');
    fs.writeFileSync(improvementsFile, JSON.stringify(this.improvements, null, 2));
  }

  /**
   * 保存指标数据
   */
  saveMetrics() {
    const metricsDir = path.join(process.cwd(), 'docs', 'metrics');
    if (!fs.existsSync(metricsDir)) {
      fs.mkdirSync(metricsDir, { recursive: true });
    }

    const metricsFile = path.join(metricsDir, 'historical-metrics.json');
    fs.writeFileSync(metricsFile, JSON.stringify(this.metrics, null, 2));
  }

  /**
   * 保存分析结果
   */
  saveAnalysis(analysis) {
    const analysisDir = path.join(process.cwd(), 'docs', 'analysis');
    if (!fs.existsSync(analysisDir)) {
      fs.mkdirSync(analysisDir, { recursive: true });
    }

    const analysisFile = path.join(analysisDir, `analysis-${Date.now()}.json`);
    fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));
    
    console.log(`📊 Analysis saved: ${analysisFile}`);
  }

  /**
   * 生成改进报告
   */
  generateImprovementReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalImprovements: this.improvements.length,
        byStatus: {},
        byType: {}
      },
      activeImprovements: this.improvements.filter(i => 
        i.status !== IMPROVEMENT_STATUS.CLOSED
      ),
      recentlyCompleted: this.improvements.filter(i => 
        i.status === IMPROVEMENT_STATUS.IMPLEMENTED || 
        i.status === IMPROVEMENT_STATUS.VALIDATED
      ).slice(-5),
      currentData: this.collectCurrentData(),
      analysis: this.analyzeAndIdentifyImprovements()
    };

    // 统计数据
    Object.values(IMPROVEMENT_STATUS).forEach(status => {
      report.summary.byStatus[status] = this.improvements.filter(i => i.status === status).length;
    });

    Object.values(IMPROVEMENT_TYPES).forEach(type => {
      report.summary.byType[type] = this.improvements.filter(i => i.type === type).length;
    });

    // 保存报告
    const reportFile = path.join(process.cwd(), 'docs', 'reports', `improvement-report-${Date.now()}.json`);
    const reportDir = path.dirname(reportFile);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`📋 Improvement Report Generated`);
    console.log(`📊 Total Improvements: ${report.summary.totalImprovements}`);
    console.log(`🔄 Active Improvements: ${report.activeImprovements.length}`);
    console.log(`✅ Recently Completed: ${report.recentlyCompleted.length}`);
    console.log(`📈 New Opportunities: ${report.analysis.opportunities.length}`);
    console.log(`💡 Recommendations: ${report.analysis.recommendations.length}`);
    console.log(`📄 Report saved: ${reportFile}`);

    return report;
  }
}

// 命令行接口
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const tracker = new ImprovementTracker();

  switch (command) {
    case 'collect':
      console.log('📊 Collecting current data...');
      const data = tracker.collectCurrentData();
      console.log('✅ Data collection completed');
      console.log(JSON.stringify(data, null, 2));
      break;

    case 'analyze':
      console.log('🔍 Analyzing trends and identifying opportunities...');
      const analysis = tracker.analyzeAndIdentifyImprovements();
      console.log('✅ Analysis completed');
      console.log(`📈 Opportunities found: ${analysis.opportunities.length}`);
      console.log(`💡 Recommendations: ${analysis.recommendations.length}`);
      break;

    case 'create':
      const improvement = tracker.createImprovement({
        title: args[1] || 'Sample Improvement',
        description: args[2] || 'Sample improvement description',
        type: args[3] || IMPROVEMENT_TYPES.PROCESS,
        priority: args[4] || 'medium',
        impact: args[5] || 'medium',
        effort: args[6] || 'medium'
      });
      break;

    case 'update':
      tracker.updateImprovementStatus(args[1], args[2], args[3]);
      break;

    case 'report':
      tracker.generateImprovementReport();
      break;

    case 'list':
      console.log('📋 Current Improvements:');
      tracker.improvements.forEach(improvement => {
        console.log(`${improvement.id}: ${improvement.title} [${improvement.status}]`);
      });
      break;

    default:
      console.log('Usage: node improvement-tracker.js <command> [args...]');
      console.log('Commands:');
      console.log('  collect                     - Collect current project data');
      console.log('  analyze                     - Analyze trends and identify opportunities');
      console.log('  create <title> <desc> <type> <priority> <impact> <effort> - Create improvement');
      console.log('  update <id> <status> [notes] - Update improvement status');
      console.log('  report                      - Generate comprehensive report');
      console.log('  list                        - List all improvements');
  }
}

module.exports = ImprovementTracker;