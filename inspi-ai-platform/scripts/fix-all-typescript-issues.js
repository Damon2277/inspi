#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取所有TypeScript和TSX文件
function getAllTsFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

// 修复常见的TypeScript问题
function fixTypeScriptIssues(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // 修复 setState 回调函数的隐式 any 类型
  const setStatePattern = /(\w+)\(prev => \(/g;
  if (setStatePattern.test(content)) {
    content = content.replace(/(\w+)\(prev => \(/g, '$1((prev: any) => (');
    modified = true;
  }
  
  // 修复 loading 属性引用
  if (content.includes('loading') && !content.includes('isLoading')) {
    content = content.replace(/disabled={loading}/g, 'disabled={isLoading}');
    content = content.replace(/{loading \?/g, '{isLoading ?');
    content = content.replace(/const { ([^}]*),
      loading ([^}]*) } = useAuth\(\)/g, 'const { $1, isLoading $2 } = useAuth()');
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
  const srcDir = path.join(__dirname, '../src');
  const files = getAllTsFiles(srcDir);
  
  let fixedCount = 0;
  
  for (const file of files) {
    if (fixTypeScriptIssues(file)) {
      console.log(`✅ 修复了 ${path.relative(srcDir, file)}`);
      fixedCount++;
    }
  }
  
  console.log(`\n总共修复了 ${fixedCount} 个文件`);
}

main();