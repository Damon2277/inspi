#!/usr/bin/env node

/**
 * 修复CustomError调用的参数顺序问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 修复CustomError调用...');

/**
 * 修复单个文件的CustomError调用
 */
function fixCustomErrorCalls(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // 修复 new CustomError('message', ErrorCode.XXX) -> new CustomError(ErrorCode.XXX, 'message')
  const pattern = /new\\s+CustomError\\s*\\(\\s*'([^']+)'\\s*,\\s*(ErrorCode\\.[A-Z_]+)\\s*\\)/g;
  const newContent = content.replace(pattern, 'new CustomError($2, \'$1\')');
  
  if (newContent !== content) {
    content = newContent;
    modified = true;
  }
  
  // 修复 ErrorCode.VALIDATION_ERROR -> ErrorCode.VALIDATION_FAILED
  const errorCodePattern = /ErrorCode\\.VALIDATION_ERROR/g;
  const newContent2 = content.replace(errorCodePattern, 'ErrorCode.VALIDATION_FAILED');
  
  if (newContent2 !== content) {
    content = newContent2;
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ 修复CustomError调用: ${filePath}`);
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
      if (fixCustomErrorCalls(relativePath)) {
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
  
  console.log(`\\n✅ CustomError调用修复完成，共修复 ${fixedCount} 个文件`);
}

if (require.main === module) {
  main();
}

module.exports = { fixCustomErrorCalls };