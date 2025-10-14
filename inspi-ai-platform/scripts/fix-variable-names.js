#!/usr/bin/env node

/**
 * 修复变量名不匹配问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 修复变量名不匹配问题...');

/**
 * 修复单个文件的变量名问题
 */
function fixVariableNames(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // 检查文件中定义的变量
  const hasIdVar = content.includes('let id: string') || content.includes('const { id }');
  const hasActivityIdVar = content.includes('let activityId: string') ||
    content.includes('activityId = resolvedParams.id');
  
  if (hasIdVar && !hasActivityIdVar) {
    // 如果只有id变量，将所有activityId替换为id
    const newContent = content.replace(/\\bactivityId\\b/g, 'id');
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  } else if (hasActivityIdVar && !hasIdVar) {
    // 如果只有activityId变量，将所有id替换为activityId（除了参数定义）
    const newContent = content.replace(/(?<!resolvedParams\\.)\\bid\\b(?!\\s*:)/g, 'activityId');
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ 修复变量名: ${filePath}`);
    return true;
  }
  
  return false;
}

/**
 * 递归查找并修复所有TypeScript文件
 */
function fixAllFiles(dirPath) {
  const items = fs.readdirSync(dirPath);
  let fixedCount = 0;
  
  items.forEach(item => {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // 跳过 node_modules 和 .git 目录
      if (item !== 'node_modules' && item !== '.git' && item !== '.next') {
        fixedCount += fixAllFiles(fullPath);
      }
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      const relativePath = path.relative(process.cwd(), fullPath);
      if (fixVariableNames(relativePath)) {
        fixedCount++;
      }
    }
  });
  
  return fixedCount;
}

/**
 * 主执行函数
 */
function main() {
  const srcPath = path.join(process.cwd(), 'src/app/api');
  const fixedCount = fixAllFiles(srcPath);
  
  console.log(`\\n✅ 变量名修复完成，共修复 ${fixedCount} 个文件`);
}

if (require.main === module) {
  main();
}

module.exports = { fixVariableNames };