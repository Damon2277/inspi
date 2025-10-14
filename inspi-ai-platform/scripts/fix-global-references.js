#!/usr/bin/env node

/**
 * 修复global对象引用的TypeScript类型问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 修复global对象引用...');

/**
 * 修复单个文件的global引用
 */
function fixGlobalReferences(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // 修复所有 global.xxx 为 (global as any).xxx
  const globalPattern = /(?<!as any\)\.|\(global as any\)\.)global\.(\w+)/g;
  const newContent = content.replace(globalPattern, '(global as any).$1');
  
  if (newContent !== content) {
    fs.writeFileSync(fullPath, newContent);
    console.log(`✅ 修复global引用: ${filePath}`);
    modified = true;
  }
  
  return modified;
}

/**
 * 主执行函数
 */
function main() {
  const filesToFix = [
    'src/app/api/analytics/events/route.ts',
    'src/app/api/logging/logs/route.ts',
    'src/app/api/monitoring/alerts/route.ts',
    'src/app/api/monitoring/errors/route.ts',
    'src/app/api/monitoring/metrics/route.ts'
  ];
  
  let fixedCount = 0;
  filesToFix.forEach(filePath => {
    if (fixGlobalReferences(filePath)) {
      fixedCount++;
    }
  });
  
  console.log(`\\n✅ global引用修复完成，共修复 ${fixedCount} 个文件`);
}

if (require.main === module) {
  main();
}

module.exports = { fixGlobalReferences };