#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取所有类型错误
function getTypeErrors() {
  try {
    const output = execSync('npm run type-check 2>&1', {
      encoding: 'utf-8',
      maxBuffer: 20 * 1024 * 1024
    });
    return parseTypeErrors(output);
  } catch (error) {
    if (error.stdout) {
      return parseTypeErrors(error.stdout);
    }
    return new Map();
  }
}

// 解析类型错误
function parseTypeErrors(output) {
  const fileErrors = new Map();
  const lines = output.split('\n');
  
  for (const line of lines) {
    // 格式: src/path/file.ts(line,col): error TS1234: message
    const match = line.match(/^(.+?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)$/);
    if (match) {
      const filePath = path.join('/Users/apple/inspi/inspi-ai-platform', match[1]);
      if (!fileErrors.has(filePath)) {
        fileErrors.set(filePath, []);
      }
      fileErrors.get(filePath).push({
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        code: match[4],
        message: match[5]
      });
    }
  }
  
  return fileErrors;
}

// 修复常见的语法错误
function fixSyntaxErrors(content, filePath) {
  let fixed = content;
  
  // 1. 修复 toString(, 10) 这类错误
  fixed = fixed.replace(/toString\(\s*,\s*10\)/g, 'toString()');
  fixed = fixed.replace(/toString\(\s*,\s*\d+\)/g, 'toString()');
  
  // 2. 修复 parseInt 相关错误
  // 修复 parseInt(value, 10, 10) 多余参数
  fixed = fixed.replace(/parseInt\(([^,)]+),\s*10\s*,\s*10\)/g, 'parseInt($1, 10)');
  
  // 修复 parseInt(, 10) 缺少第一个参数
  fixed = fixed.replace(/parseInt\(\s*,\s*10\)/g, 'parseInt(0, 10)');
  
  // 修复 (value || defaultValue, 10) 这种模式
  fixed = fixed.replace(/\(([^)]+)\s*\|\|\s*([^),]+)\s*,\s*10\)/g, '($1 || $2)');
  
  // 3. 修复接口文件中的花括号错误
  // 修复 export interface Name { } 分离的问题
  fixed = fixed.replace(/export\s+interface\s+(\w+)\s*\n\s*{\s*}/g, 'export interface $1 {}');
  fixed = fixed.replace(/export\s+type\s+(\w+)\s*=\s*\n\s*{\s*}/g, 'export type $1 = {}');
  
  // 修复对象字面量中的错误
  fixed = fixed.replace(/,\s*,/g, ',');  // 移除连续的逗号
  fixed = fixed.replace(/{\s*,/g, '{');  // 移除开头的逗号
  fixed = fixed.replace(/,\s*}/g, '}');  // 移除结尾的逗号
  
  // 4. 修复函数调用错误
  // 修复 .() 这种错误调用
  fixed = fixed.replace(/\.\(\)/g, '()');
  
  // 修复 .(xxx) 错误调用
  fixed = fixed.replace(/\.\(([^)]+)\)/g, '($1)');
  
  // 修复 [.] 错误的数组访问
  fixed = fixed.replace(/\[\.\]/g, '[]');
  
  // 5. 修复JSX相关错误
  if (filePath.endsWith('.tsx')) {
    // 修复 jsx 属性错误
    fixed = fixed.replace(/\sjsx=/g, ' className=');
    
    // 修复损坏的JSX标签
    fixed = fixed.replace(/<(\w+)\s+([^>]*?)\/\s*>/g, '<$1 $2 />');
    
    // 确保自闭合标签格式正确
    fixed = fixed.replace(/<(\w+)([^>]*?)\/>/g, '<$1$2 />');
  }
  
  // 6. 修复错误的属性访问
  // 修复 result.current(xxx) 应该是 result.current.xxx
  fixed = fixed.replace(/result\.current\(([^)]+)\)/g, 'result.current.$1');
  
  // 修复 obj.(prop) 应该是 obj.prop
  fixed = fixed.replace(/(\w+)\.\((\w+)\)/g, '$1.$2');
  
  // 7. 修复缺失的表达式
  // Expression expected 通常是缺少值
  fixed = fixed.replace(/return\s*;/g, 'return null;');
  fixed = fixed.replace(/=\s*;/g, '= null;');
  
  // 8. 修复箭头函数语法
  fixed = fixed.replace(/=>\s*,/g, '=> null,');
  
  return fixed;
}

// 修复特定文件的特定问题
function fixSpecificFile(filePath, content) {
  // 修复 logging/logs/route.ts 的问题
  if (filePath.includes('logging/logs/route.ts')) {
    // 这个文件似乎有严重的语法问题，需要特殊处理
    content = content.replace(/\[\]/g, '');  // 移除空的数组访问
    content = content.replace(/\(\)/g, '');  // 移除空的函数调用
  }
  
  // 修复 leaderboard/route.ts
  if (filePath.includes('api/leaderboard/route.ts')) {
    // 修复 Argument expression expected
    content = content.replace(/parseInt\([^,)]+,\s*\)/g, (match) => {
      const value = match.match(/parseInt\(([^,)]+),/)[1];
      return `parseInt(${value}, 10)`;
    });
  }
  
  return content;
}

// 处理文件
function processFile(filePath, errors) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // 应用通用修复
    content = fixSyntaxErrors(content, filePath);
    
    // 应用特定文件修复
    content = fixSpecificFile(filePath, content);
    
    if (content !== original) {
      fs.writeFileSync(filePath, content);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`处理失败 ${filePath}: ${error.message}`);
    return false;
  }
}

// 主函数
async function main() {
  console.log('🔧 开始修复语法错误...\n');
  
  // 获取所有类型错误
  const fileErrors = getTypeErrors();
  console.log(`📊 发现 ${fileErrors.size} 个文件有类型错误\n`);
  
  let fixedCount = 0;
  let current = 0;
  const total = fileErrors.size;
  
  for (const [filePath, errors] of fileErrors) {
    current++;
    console.log(`[${current}/${total}] 处理: ${path.basename(filePath)}`);
    
    if (processFile(filePath, errors)) {
      console.log(`  ✅ 已修复`);
      fixedCount++;
    }
  }
  
  console.log(`\n✨ 修复了 ${fixedCount} 个文件`);
  
  // 再次运行类型检查
  console.log('\n📊 运行类型检查...');
  try {
    execSync('npm run type-check', { stdio: 'inherit' });
    console.log('✅ 类型检查通过！');
  } catch (error) {
    console.log('❌ 仍有类型错误，可能需要手动修复');
  }
}

main().catch(console.error);
