#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function runBaselineTests() {
  console.log('🔍 开始基准测试...');
  
  try {
    // 检查当前项目状态
    const currentFiles = {
      'inspi-ai-platform/src/app/page.tsx': fs.existsSync('inspi-ai-platform/src/app/page.tsx'),
      'inspi-ai-platform/src/app/create/page.tsx': fs.existsSync('inspi-ai-platform/src/app/create/page.tsx'),
      'inspi-ai-platform/src/app/layout.tsx': fs.existsSync('inspi-ai-platform/src/app/layout.tsx'),
      'inspi-ai-platform/src/app/globals.css': fs.existsSync('inspi-ai-platform/src/app/globals.css')
    };
    
    // 记录当前文件状态
    const baseline = {
      timestamp: new Date().toISOString(),
      files: currentFiles,
      projectStructure: {
        hasComponents: fs.existsSync('inspi-ai-platform/src/components'),
        hasStyles: fs.existsSync('inspi-ai-platform/src/styles'),
        hasTests: fs.existsSync('inspi-ai-platform/__tests__')
      },
      notes: '设计系统实施前的基准状态'
    };
    
    // 保存基准数据
    fs.writeFileSync('baseline-state.json', JSON.stringify(baseline, null, 2));
    
    console.log('✅ 基准测试完成');
    console.log('📊 当前项目状态:');
    Object.entries(currentFiles).forEach(([file, exists]) => {
      console.log(`  ${exists ? '✅' : '❌'} ${file}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ 基准测试失败:', error.message);
    return false;
  }
}

if (require.main === module) {
  runBaselineTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runBaselineTests };