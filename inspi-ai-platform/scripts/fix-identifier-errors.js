#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 修复所有标识符错误...\n');

// 需要修复的文件列表
const filesToFix = [
  'src/components/contribution/Leaderboard.tsx',
  'src/core/graph/data-manager.ts',
  'src/core/quality/code-review-automation.ts',
  'src/lib/cdn/config.ts',
  'src/lib/invitation/async/AsyncTaskProcessor.ts',
  'src/lib/models/KnowledgeGraph.ts',
  'src/lib/performance/alerts.ts',
  'src/lib/quota/quota-checker.ts',
  'src/lib/services/graphAnalysisService.ts',
  'src/lib/services/workMountService.ts',
  'src/lib/testing/integration-test.ts',
  'src/shared/hooks/useKeyboardNavigation.ts',
  'src/shared/hooks/useSubscription.ts',
];

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  文件不存在: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 修复各种标识符错误模式
  const patterns = [
    // 修复 (Model.method as any)( 为 (Model as any).method(
    {
      from: /\((\w+)\.(\w+)\s+as\s+any\)\(/g,
      to: '($1 as any).$2('
    },
    // 修复 this.(method as any)( 为 (this as any).method(
    {
      from: /this\.\((\w+)\s+as\s+any\)\(/g,
      to: '(this as any).$1('
    },
    // 修复 object.(property.method as any)( 
    {
      from: /(\w+)\.\((\w+)\.(\w+)\s+as\s+any\)\(/g,
      to: '($1 as any).$2.$3('
    },
    // 修复 this.(property.method as any)(
    {
      from: /this\.\((\w+)\.(\w+)\s+as\s+any\)\(/g,
      to: '(this as any).$1.$2('
    },
    // 修复 return (Model.method as any)( 为 return (Model as any).method(
    {
      from: /return\s+\((\w+)\.(\w+)\s+as\s+any\)\(/g,
      to: 'return ($1 as any).$2('
    },
    // 修复 await (Model.method as any)( 为 await (Model as any).method(
    {
      from: /await\s+\((\w+)\.(\w+)\s+as\s+any\)\(/g,
      to: 'await ($1 as any).$2('
    },
    // 修复 const x = (Model.method as any)(
    {
      from: /=\s*\((\w+)\.(\w+)\s+as\s+any\)\(/g,
      to: '= ($1 as any).$2('
    },
  ];

  patterns.forEach(pattern => {
    if (content.match(pattern.from)) {
      content = content.replace(pattern.from, pattern.to);
      modified = true;
    }
  });

  // 特殊处理 KnowledgeGraph.ts 中的错误
  if (filePath.includes('KnowledgeGraph')) {
    content = content.replace(/this\.\(edges\.find\s+as\s+any\)/g, '(this.edges as any).find');
    content = content.replace(/this\.\(nodes\.find\s+as\s+any\)/g, '(this.nodes as any).find');
    modified = true;
  }

  // 特殊处理 AsyncTaskProcessor.ts
  if (filePath.includes('AsyncTaskProcessor')) {
    content = content.replace(/this\.\(taskQueue\.find\s+as\s+any\)/g,
      '(this.taskQueue as any).find');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// 主函数
function main() {
  console.log('🚀 开始修复标识符错误...\n');
  
  let fixedCount = 0;
  
  filesToFix.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    console.log(`📝 检查 ${file}...`);
    if (fixFile(filePath)) {
      console.log(`✅ 修复了 ${file}`);
      fixedCount++;
    }
  });

  console.log(`\n✅ 修复完成！共修复 ${fixedCount} 个文件`);
  
  // 验证结果
  console.log('\n📊 验证修复结果...');
  const { execSync } = require('child_process');
  
  try {
    const tsErrors = execSync('npm run type-check 2>&1 | grep "error TS" | wc -
      l', { encoding: 'utf8' });
    console.log(`剩余 TypeScript 错误: ${tsErrors.trim()}`);
  } catch (e) {
    // 忽略
  }
}

// 运行
main();