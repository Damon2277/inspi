#!/usr/bin/env node

const fs = require('fs');

function updateProjectStateForDesignSystem() {
  const statePath = '.kiro/project-state/project-state.json';
  
  try {
    const content = fs.readFileSync(statePath, 'utf-8');
    const state = JSON.parse(content);
    
    // 添加设计系统功能
    state.features['design-system'] = {
      status: 'completed',
      lastUpdated: new Date().toISOString(),
      completionCriteria: [
        'UI设计规范文档完成',
        'CSS设计系统实现',
        '组件演示页面创建',
        '实施指南编写完成',
        '响应式设计支持',
        '浏览器兼容性处理'
      ],
      dependencies: [],
      riskLevel: 'low',
      notes: '✅ 完整的轻盈未来科技感设计系统已建立',
      completionDate: new Date().toISOString()
    };
    
    // 添加设计系统成就
    state.globalHealth.activeIssues.push({
      id: `design-system-achievement-${Date.now()}`,
      type: 'functional_error',
      severity: 'low',
      description: '🎨 成功建立完整的UI设计系统 - 轻盈的未来科技感',
      affectedFeatures: ['design-system'],
      createdAt: new Date().toISOString(),
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      resolution: '设计系统包含：规范文档、CSS实现、演示页面、实施指南'
    });
    
    // 更新项目管理系统进度
    if (state.features['project-management-system']) {
      state.features['project-management-system'].notes = '✅ 阶段性成果：状态管理、版本控制、设计系统已完成';
    }
    
    // 更新整体健康状态
    const activeIssues = state.globalHealth.activeIssues.filter(i => i.status === 'active');
    const criticalIssues = activeIssues.filter(i => i.severity === 'critical');
    
    if (criticalIssues.length === 0) {
      state.globalHealth.overallStatus = 'warning'; // 还有样式问题待解决
    }
    
    // 保存状态
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
    
    console.log('🎨 设计系统创建完成！');
    console.log('');
    console.log('📋 已创建的文件：');
    console.log('  ├── .kiro/design-system/UI_DESIGN_SPECIFICATION.md');
    console.log('  ├── .kiro/design-system/design-system.css');
    console.log('  ├── .kiro/design-system/design-system-demo.html');
    console.log('  └── .kiro/design-system/IMPLEMENTATION_GUIDE.md');
    console.log('');
    console.log('🌟 设计系统特性：');
    console.log('  • 轻盈的未来科技感设计理念');
    console.log('  • Glassmorphism (玻璃拟态) 效果');
    console.log('  • 品牌标志性渐变系统');
    console.log('  • 完整的组件库');
    console.log('  • 响应式设计支持');
    console.log('  • 浏览器兼容性处理');
    console.log('');
    console.log('🚀 下一步建议：');
    console.log('  1. 在浏览器中打开 design-system-demo.html 查看效果');
    console.log('  2. 将设计系统应用到现有页面');
    console.log('  3. 解决样式丢失问题');
    console.log('  4. 继续实施项目管理规则的其他任务');
    
    return true;
  } catch (error) {
    console.error('❌ 更新项目状态失败:', error.message);
    return false;
  }
}

if (updateProjectStateForDesignSystem()) {
  console.log('');
  console.log('💡 使用提示：');
  console.log('  • 查看状态: node .kiro/project-state/init-project.js status');
  console.log('  • 查看演示: 在浏览器中打开 .kiro/design-system/design-system-demo.html');
  console.log('  • 阅读指南: 查看 .kiro/design-system/IMPLEMENTATION_GUIDE.md');
}