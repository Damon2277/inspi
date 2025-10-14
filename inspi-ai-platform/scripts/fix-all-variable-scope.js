#!/usr/bin/env node

/**
 * 智能修复所有变量作用域问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 智能修复所有变量作用域问题...');

/**
 * 分析文件中的变量定义
 */
function analyzeVariables(content) {
  const variables = new Set();
  
  // 查找 let/const 变量定义
  const letConstMatches = content.match(/(?:let|const)\s+(\w+)\s*[:=]/g);
  if (letConstMatches) {
    letConstMatches.forEach(match => {
      const varName = match.match(/(?:let|const)\s+(\w+)/)[1];
      variables.add(varName);
    });
  }
  
  // 查找解构赋值中的变量
  const destructureMatches = content.match(/(\w+)\s*=\s*resolvedParams\.(\w+)/g);
  if (destructureMatches) {
    destructureMatches.forEach(match => {
      const varName = match.match(/(\w+)\s*=/)[1];
      variables.add(varName);
    });
  }
  
  return variables;
}

/**
 * 修复单个文件的变量作用域问题
 */
function fixFileVariableScope(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const variables = analyzeVariables(content);
  let modified = false;
  
  // 查找logger.error调用中的变量引用问题
  const loggerErrorPattern = /logger\.error\([^,]+,\s*{\s*([^}]+)\s*}\)/g;
  
  content = content.replace(loggerErrorPattern, (match, params) => {
    const paramList = params.split(',').map(p => p.trim());
    const fixedParams = paramList.map(param => {
      // 如果参数包含冒号，说明已经是key:value格式，不需要修改
      if (param.includes(':')) {
        return param;
      }
      
      // 检查变量是否存在
      if (!variables.has(param)) {
        // 尝试常见的映射
        if (param === 'activityId' && variables.has('id')) {
          modified = true;
          return 'activityId: id';
        }
        if (param === 'userId' && !variables.has('userId')) {
          // 如果userId不存在，可能需要从resolvedParams获取
          if (content.includes('resolvedParams.userId')) {
            modified = true;
            return 'userId: resolvedParams.userId';
          }
        }
      }
      
      return param;
    });
    
    return match.replace(params, fixedParams.join(', '));
  });
  
  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ 修复变量作用域: ${filePath}`);
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
      if (fixFileVariableScope(relativePath)) {
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
  
  console.log(`\\n✅ 变量作用域修复完成，共修复 ${fixedCount} 个文件`);
}

if (require.main === module) {
  main();
}

module.exports = { fixFileVariableScope, analyzeVariables };