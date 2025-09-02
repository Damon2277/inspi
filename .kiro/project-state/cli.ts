#!/usr/bin/env node

import { ProjectStateManager } from './state-manager';
import { FeatureStatus } from './types';

class ProjectStateCLI {
  private stateManager: ProjectStateManager;

  constructor() {
    this.stateManager = new ProjectStateManager();
  }

  public run(args: string[]): void {
    const command = args[0];

    switch (command) {
      case 'status':
        this.showStatus();
        break;
      case 'health':
        this.showHealth();
        break;
      case 'update':
        this.updateFeature(args[1], args[2] as FeatureStatus, args[3] || 'Manual update');
        break;
      case 'add':
        this.addFeature(args[1]);
        break;
      case 'issue':
        this.addIssue(args[1], args[2], args[3]);
        break;
      case 'resolve':
        this.resolveIssue(args[1], args[2] || 'Resolved');
        break;
      case 'init':
        this.initializeProject();
        break;
      default:
        this.showHelp();
    }
  }

  private showStatus(): void {
    const state = this.stateManager.getCurrentState();
    
    console.log('\\n📊 Project Status Report');
    console.log('========================');
    console.log(`Last Updated: ${new Date(state.lastUpdated).toLocaleString()}`);
    console.log(`Overall Health: ${this.getStatusEmoji(state.globalHealth.overallStatus)} ${state.globalHealth.overallStatus.toUpperCase()}`);
    
    console.log('\\n🎯 Features:');
    Object.entries(state.features).forEach(([name, feature]) => {
      const statusEmoji = this.getFeatureStatusEmoji(feature.status);
      const riskEmoji = this.getRiskEmoji(feature.riskLevel);
      console.log(`  ${statusEmoji} ${name} (${feature.status}) ${riskEmoji}`);
      if (feature.notes) {
        console.log(`    📝 ${feature.notes}`);
      }
    });

    if (state.globalHealth.activeIssues.length > 0) {
      console.log('\\n⚠️  Active Issues:');
      state.globalHealth.activeIssues
        .filter(issue => issue.status === 'active')
        .forEach(issue => {
          const severityEmoji = this.getSeverityEmoji(issue.severity);
          console.log(`  ${severityEmoji} ${issue.description}`);
        });
    }
  }

  private showHealth(): void {
    const report = this.stateManager.getHealthReport();
    
    console.log('\\n🏥 Project Health Report');
    console.log('=========================');
    console.log(`Overall Status: ${this.getStatusEmoji(report.overallStatus)} ${report.overallStatus.toUpperCase()}`);
    console.log(`Features: ${report.completedFeatures}/${report.totalFeatures} completed`);
    console.log(`In Progress: ${report.inProgressFeatures}`);
    console.log(`Active Issues: ${report.activeIssues} (${report.criticalIssues} critical)`);
    
    if (report.recommendations.length > 0) {
      console.log('\\n💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }
  }

  private updateFeature(name: string, status: FeatureStatus, reason: string): void {
    if (!name || !status) {
      console.error('❌ Usage: update <feature-name> <status> [reason]');
      return;
    }

    const result = this.stateManager.updateFeatureStatus(name, status, reason, 'cli-user');
    
    if (result.isValid) {
      console.log(`✅ Feature '${name}' updated to '${status}'`);
      
      if (result.warnings.length > 0) {
        console.log('\\n⚠️  Warnings:');
        result.warnings.forEach(warning => console.log(`  • ${warning}`));
      }
      
      if (result.suggestions.length > 0) {
        console.log('\\n💡 Suggestions:');
        result.suggestions.forEach(suggestion => console.log(`  • ${suggestion}`));
      }
    } else {
      console.error('❌ Failed to update feature:');
      result.errors.forEach(error => console.error(`  • ${error}`));
    }
  }

  private addFeature(name: string): void {
    if (!name) {
      console.error('❌ Usage: add <feature-name>');
      return;
    }

    this.stateManager.addFeature(name, {
      status: 'not_started',
      completionCriteria: [],
      dependencies: [],
      riskLevel: 'medium'
    });

    console.log(`✅ Feature '${name}' added`);
  }

  private addIssue(type: string, severity: string, description: string): void {
    if (!type || !severity || !description) {
      console.error('❌ Usage: issue <type> <severity> <description>');
      return;
    }

    const issueId = this.stateManager.addIssue({
      type: type as any,
      severity: severity as any,
      description,
      affectedFeatures: [],
      status: 'active'
    });

    console.log(`✅ Issue created with ID: ${issueId}`);
  }

  private resolveIssue(issueId: string, resolution: string): void {
    if (!issueId) {
      console.error('❌ Usage: resolve <issue-id> [resolution]');
      return;
    }

    const success = this.stateManager.resolveIssue(issueId, resolution);
    
    if (success) {
      console.log(`✅ Issue ${issueId} resolved`);
    } else {
      console.error(`❌ Issue ${issueId} not found`);
    }
  }

  private initializeProject(): void {
    console.log('🚀 Initializing project state management...');
    
    // 创建当前项目的初始状态
    this.stateManager.addFeature('homepage', {
      status: 'completed',
      completionCriteria: [
        'UI样式完整',
        '响应式设计正常',
        '所有链接可用',
        '无控制台错误'
      ],
      dependencies: [],
      riskLevel: 'medium',
      notes: '当前样式存在问题，需要恢复到稳定版本'
    });

    this.stateManager.addFeature('create-page', {
      status: 'completed',
      completionCriteria: [
        '页面正常显示',
        '功能开发中状态显示',
        '返回首页链接正常'
      ],
      dependencies: ['homepage'],
      riskLevel: 'low',
      notes: '基础功能完成'
    });

    this.stateManager.addFeature('project-management-system', {
      status: 'in_progress',
      completionCriteria: [
        '项目状态管理系统',
        '样式版本控制系统',
        '开发流程规范引擎',
        '自动化质量检查',
        '项目恢复系统'
      ],
      dependencies: [],
      riskLevel: 'high',
      notes: '正在实施中，解决48小时内的开发问题'
    });

    // 添加当前的关键问题
    this.stateManager.addIssue({
      type: 'style_regression',
      severity: 'high',
      description: '样式丢失，无法回滚到48小时前的稳定版本',
      affectedFeatures: ['homepage'],
      status: 'active'
    });

    this.stateManager.addIssue({
      type: 'version_control',
      severity: 'critical',
      description: '缺乏版本控制系统，无法追踪历史变更',
      affectedFeatures: ['homepage', 'create-page'],
      status: 'active'
    });

    console.log('✅ Project state management initialized');
    console.log('\\n📊 Run "npm run state status" to see current status');
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'stable': return '🟢';
      case 'warning': return '🟡';
      case 'critical': return '🔴';
      default: return '⚪';
    }
  }

  private getFeatureStatusEmoji(status: FeatureStatus): string {
    switch (status) {
      case 'not_started': return '⚪';
      case 'in_progress': return '🟡';
      case 'testing': return '🟠';
      case 'completed': return '🟢';
      case 'deployed': return '🚀';
      default: return '❓';
    }
  }

  private getRiskEmoji(risk: string): string {
    switch (risk) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🔴';
      default: return '⚪';
    }
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🟠';
      case 'critical': return '🔴';
      default: return '⚪';
    }
  }

  private showHelp(): void {
    console.log('\\n🛠️  Project State Management CLI');
    console.log('================================');
    console.log('Commands:');
    console.log('  status                           - Show project status');
    console.log('  health                           - Show health report');
    console.log('  update <feature> <status> [reason] - Update feature status');
    console.log('  add <feature>                    - Add new feature');
    console.log('  issue <type> <severity> <desc>   - Add new issue');
    console.log('  resolve <issue-id> [resolution]  - Resolve issue');
    console.log('  init                             - Initialize project');
    console.log('\\nStatus values: not_started, in_progress, testing, completed, deployed');
    console.log('Risk levels: low, medium, high');
    console.log('Issue types: style_regression, version_control, functional_error, dependency_conflict');
    console.log('Severities: low, medium, high, critical');
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const cli = new ProjectStateCLI();
  const args = process.argv.slice(2);
  cli.run(args);
}

export { ProjectStateCLI };