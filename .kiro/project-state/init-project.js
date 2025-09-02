#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 简化的项目状态管理器（JavaScript版本，立即可用）
class SimpleProjectStateManager {
  constructor() {
    this.statePath = '.kiro/project-state/project-state.json';
    this.ensureDirectories();
  }

  ensureDirectories() {
    const stateDir = path.dirname(this.statePath);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
  }

  getCurrentState() {
    try {
      if (fs.existsSync(this.statePath)) {
        const content = fs.readFileSync(this.statePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('Failed to read project state:', error.message);
    }
    return this.getDefaultState();
  }

  saveState(state) {
    try {
      state.lastUpdated = new Date().toISOString();
      const content = JSON.stringify(state, null, 2);
      fs.writeFileSync(this.statePath, content, 'utf-8');
      return true;
    } catch (error) {
      console.error('Failed to save project state:', error.message);
      return false;
    }
  }

  getDefaultState() {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      features: {},
      globalHealth: {
        overallStatus: 'stable',
        lastStableSnapshot: null,
        activeIssues: []
      }
    };
  }

  addFeature(name, feature) {
    const state = this.getCurrentState();
    state.features[name] = {
      status: 'not_started',
      lastUpdated: new Date().toISOString(),
      completionCriteria: [],
      dependencies: [],
      riskLevel: 'medium',
      ...feature
    };
    return this.saveState(state);
  }

  addIssue(issue) {
    const state = this.getCurrentState();
    const issueId = `${issue.type}-${Date.now()}`;
    
    const newIssue = {
      ...issue,
      id: issueId,
      createdAt: new Date().toISOString()
    };

    state.globalHealth.activeIssues.push(newIssue);
    this.updateOverallStatus(state);
    this.saveState(state);
    return issueId;
  }

  updateOverallStatus(state) {
    const activeIssues = state.globalHealth.activeIssues.filter(i => i.status === 'active');
    const criticalIssues = activeIssues.filter(i => i.severity === 'critical');
    const highIssues = activeIssues.filter(i => i.severity === 'high');

    if (criticalIssues.length > 0) {
      state.globalHealth.overallStatus = 'critical';
    } else if (highIssues.length > 0 || activeIssues.length > 3) {
      state.globalHealth.overallStatus = 'warning';
    } else {
      state.globalHealth.overallStatus = 'stable';
    }
  }

  showStatus() {
    const state = this.getCurrentState();
    
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

  getStatusEmoji(status) {
    switch (status) {
      case 'stable': return '🟢';
      case 'warning': return '🟡';
      case 'critical': return '🔴';
      default: return '⚪';
    }
  }

  getFeatureStatusEmoji(status) {
    switch (status) {
      case 'not_started': return '⚪';
      case 'in_progress': return '🟡';
      case 'testing': return '🟠';
      case 'completed': return '🟢';
      case 'deployed': return '🚀';
      default: return '❓';
    }
  }

  getRiskEmoji(risk) {
    switch (risk) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🔴';
      default: return '⚪';
    }
  }

  getSeverityEmoji(severity) {
    switch (severity) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🟠';
      case 'critical': return '🔴';
      default: return '⚪';
    }
  }
}

// 初始化项目状态
function initializeProject() {
  console.log('🚀 Initializing project state management...');
  
  const stateManager = new SimpleProjectStateManager();
  
  // 添加当前项目的功能
  stateManager.addFeature('homepage', {
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

  stateManager.addFeature('create-page', {
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

  stateManager.addFeature('project-management-system', {
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
  stateManager.addIssue({
    type: 'style_regression',
    severity: 'high',
    description: '样式丢失，无法回滚到48小时前的稳定版本',
    affectedFeatures: ['homepage'],
    status: 'active'
  });

  stateManager.addIssue({
    type: 'version_control',
    severity: 'critical',
    description: '缺乏版本控制系统，无法追踪历史变更',
    affectedFeatures: ['homepage', 'create-page'],
    status: 'active'
  });

  console.log('✅ Project state management initialized');
  
  // 显示当前状态
  stateManager.showStatus();
  
  console.log('\\n💡 Next Steps:');
  console.log('  1. Run "node .kiro/project-state/init-project.js status" to check status');
  console.log('  2. Start implementing the next task: Style Version Control System');
  console.log('  3. Create git repository to enable version control');
}

// 处理命令行参数
const args = process.argv.slice(2);
const command = args[0];

if (command === 'status') {
  const stateManager = new SimpleProjectStateManager();
  stateManager.showStatus();
} else {
  initializeProject();
}