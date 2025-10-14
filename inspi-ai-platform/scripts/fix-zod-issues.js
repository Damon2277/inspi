#!/usr/bin/env node

/**
 * 修复Zod验证库相关的问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 修复Zod验证库问题...');

/**
 * 修复单个文件的Zod问题
 */
function fixZodIssues(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // 修复 errorMap 语法
  const errorMapPattern = /errorMap:\s*\(\)\s*=>\s*\(\s*{\s*message:\s*([^}]+)\s*}\s*\)/g;
  const newContent1 = content.replace(errorMapPattern, 'message: $1');
  if (newContent1 !== content) {
    content = newContent1;
    modified = true;
  }
  
  // 修复 validation.error.errors -> validation.error.issues
  const errorsPattern = /validation\.error\.errors/g;
  const newContent2 = content.replace(errorsPattern, 'validation.error.issues');
  if (newContent2 !== content) {
    content = newContent2;
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ 修复Zod问题: ${filePath}`);
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
      if (fixZodIssues(relativePath)) {
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
  const srcPath = path.join(process.cwd(), 'src');
  const fixedCount = fixAllFiles(srcPath);
  
  console.log(`\\n✅ Zod问题修复完成，共修复 ${fixedCount} 个文件`);
}

if (require.main === module) {
  main();
}

module.exports = { fixZodIssues };