#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取所有TypeScript和TSX文件
function getAllTsFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    try {
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
    } catch (error) {
      // 忽略权限错误
    }
  }
  
  traverse(dir);
  return files;
}

// 修复TypeScript问题
function fixTypeScriptIssues(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // 修复 setState((prev: any) => ({ ...prev, ... })) 模式
  const setStatePattern = /(\w+)\(\(prev: any\) => \(\{\s*\.\.\.prev,\s*([^}]+)\s*\}\)\)/g;
  if (setStatePattern.test(content)) {
    content = content.replace(setStatePattern, (match, setterName, updates) => {
      // 提取状态名称（去掉set前缀）
      const stateName = setterName.replace(/^set/, '').toLowerCase();
      return `${setterName}({ ...${stateName}, ${updates} })`;
    });
    modified = true;
  }
  
  // 修复简单的 setState(prev => prev + 1) 模式
  const simpleSetStatePattern = /(\w+)\(prev => prev \+ 1\)/g;
  if (simpleSetStatePattern.test(content)) {
    content = content.replace(simpleSetStatePattern, (match, setterName) => {
      const stateName = setterName.replace(/^set/, '').toLowerCase();
      return `${setterName}(${stateName} + 1)`;
    });
    modified = true;
  }
  
  // 修复 setState(prev => [...prev, ...items]) 模式
  const arraySetStatePattern = /(\w+)\(prev => \[\.\.\.prev, \.\.\.([^)]+)\]\)/g;
  if (arraySetStatePattern.test(content)) {
    content = content.replace(arraySetStatePattern, (match, setterName, items) => {
      const stateName = setterName.replace(/^set/, '').toLowerCase();
      return `${setterName}([...${stateName}, ...${items}])`;
    });
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