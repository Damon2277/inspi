#!/usr/bin/env node

/**
 * 任务阻断自动化脚本
 * 用于自动检测和处理任务阻断情况
 */

const fs = require('fs');
const path = require('path');

// 问题严重程度定义
const SEVERITY_LEVELS = {
  CRITICAL: 'critical',
  HIGH: 'high', 
  MEDIUM: 'medium',
  LOW: 'low'
};

// 阻断状态定义
const BLOCKING_STATUSES = ['[!]', '[R]', '[~]', '[P]'];

class TaskBlocker {
  constructor() {
    this.issues = [];
    this.blockedTasks = [];
  }

  /**
   * 检查任务文件中的阻断状态
   */
  checkTaskStatus(taskFilePath) {
    try {
      const content = fs.readFileSync(taskFilePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        BLOCKING_STATUSES.forEach(status => {
          if (line.includes(status)) {
            this.blockedTasks.push({
              file: taskFilePath,
              line: index + 1,
              status: status,
              content: line.trim()
            });
          }
        });
      });
    } catch (error) {
      console.error(`Error reading task file: ${error.message}`);
    }
  }

  /**
   * 记录问题详情
   */
  recordIssue(issue) {
    const issueRecord = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      severity: issue.severity || SEVERITY_LEVELS.MEDIUM,
      description: issue.description,
      affectedTasks: issue.affectedTasks || [],
      reporter: issue.reporter || 'system',
      status: 'open'
    };

    this.issues.push(issueRecord);
    this.saveIssueRecord(issueRecord);
    this.notifyTeam(issueRecord);
  }

  /**
   * 保存问题记录
   */
  saveIssueRecord(issue) {
    const issuesDir = path.join(process.cwd(), 'docs', 'issues');
    if (!fs.existsSync(issuesDir)) {
      fs.mkdirSync(issuesDir, { recursive: true });
    }

    const issueFile = path.join(issuesDir, `issue-${issue.id}.json`);
    fs.writeFileSync(issueFile, JSON.stringify(issue, null, 2));
  }

  /**
   * 通知团队成员
   */
  notifyTeam(issue) {
    console.log(`🚨 TASK BLOCKED - ${issue.severity.toUpperCase()}`);
    console.log(`Description: ${issue.description}`);
    console.log(`Affected Tasks: ${issue.affectedTasks.join(', ')}`);
    console.log(`Time: ${issue.timestamp}`);
    console.log(`Issue ID: ${issue.id}`);
    console.log('---');
  }

  /**
   * 生成阻断报告
   */
  generateBlockingReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalBlockedTasks: this.blockedTasks.length,
      totalIssues: this.issues.length,
      blockedTasks: this.blockedTasks,
      issues: this.issues,
      summary: {
        critical: this.issues.filter(i => i.severity === SEVERITY_LEVELS.CRITICAL).length,
        high: this.issues.filter(i => i.severity === SEVERITY_LEVELS.HIGH).length,
        medium: this.issues.filter(i => i.severity === SEVERITY_LEVELS.MEDIUM).length,
        low: this.issues.filter(i => i.severity === SEVERITY_LEVELS.LOW).length
      }
    };

    const reportFile = path.join(process.cwd(), 'docs', 'reports', `blocking-report-${Date.now()}.json`);
    const reportDir = path.dirname(reportFile);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`📊 Blocking report generated: ${reportFile}`);
    
    return report;
  }

  /**
   * 检查质量门禁
   */
  checkQualityGates() {
    const qualityIssues = [];

    // 检查测试覆盖率
    try {
      const coverageFile = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
      if (fs.existsSync(coverageFile)) {
        const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
        const totalCoverage = coverage.total.lines.pct;
        
        if (totalCoverage < 70) {
          qualityIssues.push({
            type: 'coverage',
            severity: SEVERITY_LEVELS.HIGH,
            description: `Code coverage ${totalCoverage}% is below minimum threshold of 70%`,
            affectedTasks: ['current-task']
          });
        }
      }
    } catch (error) {
      console.warn('Could not check coverage:', error.message);
    }

    // 记录质量问题
    qualityIssues.forEach(issue => this.recordIssue(issue));
    
    return qualityIssues.length === 0;
  }

  /**
   * 主执行函数
   */
  run() {
    console.log('🔍 Starting task blocking check...');

    // 检查任务文件
    const taskFiles = [
      '.kiro/specs/inspi-ai-platform/tasks.md',
      '.kiro/specs/project-management-rules-enhancement/tasks.md'
    ];

    taskFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.checkTaskStatus(file);
      }
    });

    // 检查质量门禁
    const qualityPassed = this.checkQualityGates();

    // 生成报告
    const report = this.generateBlockingReport();

    // 输出结果
    if (this.blockedTasks.length > 0 || !qualityPassed) {
      console.log(`❌ Found ${this.blockedTasks.length} blocked tasks and ${this.issues.length} issues`);
      process.exit(1);
    } else {
      console.log('✅ No blocking issues found');
      process.exit(0);
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const blocker = new TaskBlocker();
  blocker.run();
}

module.exports = TaskBlocker;