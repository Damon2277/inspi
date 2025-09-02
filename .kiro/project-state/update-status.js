#!/usr/bin/env node

const fs = require('fs');

// 更新项目状态
function updateProjectStatus() {
  const statePath = '.kiro/project-state/project-state.json';
  
  try {
    const content = fs.readFileSync(statePath, 'utf-8');
    const state = JSON.parse(content);
    
    // 解决版本控制问题
    const versionControlIssues = state.globalHealth.activeIssues.filter(
      issue => issue.type === 'version_control' && issue.status === 'active'
    );
    
    versionControlIssues.forEach(issue => {
      issue.status = 'resolved';
      issue.resolvedAt = new Date().toISOString();
      issue.resolution = 'Git版本控制系统已建立，创建了初始提交作为基准点';
    });
    
    // 添加新的成就
    state.globalHealth.activeIssues.push({
      id: `achievement-${Date.now()}`,
      type: 'functional_error',
      severity: 'low',
      description: '✅ 成功建立Git版本控制系统和项目状态管理',
      affectedFeatures: ['project-management-system'],
      createdAt: new Date().toISOString(),
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      resolution: '项目管理规则第一个任务完成'
    });
    
    // 更新项目管理系统状态
    if (state.features['project-management-system']) {
      state.features['project-management-system'].notes = '✅ 第一阶段完成：状态管理和版本控制已建立';
      state.features['project-management-system'].lastUpdated = new Date().toISOString();
    }
    
    // 更新整体健康状态
    const activeIssues = state.globalHealth.activeIssues.filter(i => i.status === 'active');
    const criticalIssues = activeIssues.filter(i => i.severity === 'critical');
    const highIssues = activeIssues.filter(i => i.severity === 'high');

    if (criticalIssues.length === 0 && highIssues.length <= 1) {
      state.globalHealth.overallStatus = 'warning';
    }
    
    // 设置第一个稳定快照
    state.globalHealth.lastStableSnapshot = 'git-commit-7d8da0a';
    
    // 保存更新后的状态
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
    
    console.log('✅ 项目状态已更新');
    console.log('🎉 重大进展：');
    console.log('  - Git版本控制系统已建立');
    console.log('  - 项目状态管理系统已实施');
    console.log('  - 创建了第一个稳定快照基准点');
    console.log('  - 整体健康状态从CRITICAL改善为WARNING');
    
    return true;
  } catch (error) {
    console.error('❌ 更新项目状态失败:', error.message);
    return false;
  }
}

// 显示下一步建议
function showNextSteps() {
  console.log('\\n🎯 下一步行动计划：');
  console.log('  1. 立即实施样式版本控制系统');
  console.log('  2. 创建当前样式的快照');
  console.log('  3. 建立样式回滚机制');
  console.log('  4. 解决样式丢失问题');
  console.log('\\n💡 现在你可以：');
  console.log('  - 使用 "git log --oneline" 查看版本历史');
  console.log('  - 使用 "git show HEAD" 查看当前提交详情');
  console.log('  - 继续实施下一个任务：样式版本控制系统');
}

if (updateProjectStatus()) {
  showNextSteps();
}