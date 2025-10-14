#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 修复error属性语法错误...');

// 查找所有包含错误模式的文件
function findFilesWithErrorPattern() {
  try {
    const result = execSync('find src -name "*.ts" | xargs grep -
      l "error instanceof Error" 2>/dev/null || true', { encoding: 'utf8' });
    return result.split('\n').filter(line => line.trim());
  } catch (error) {
    return [];
  }
}

function fixErrorProperty(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // 修复 error instanceof Error ? error.message : '...' 语法
  const patterns = [
    // 模式1: error instanceof Error ? error.message : '...'
    {
      from: /(\s+)(error instanceof Error \? error\.message : '[^']+')(\s*}\s*},
        \s*{\s*status:\s*\d+\s*}\s*\))/g,
      to: '$1error: $2$3'
    },
    // 模式2: 修复多余的换行和括号
    {
      from: /(\s+)(error instanceof Error \?
        error\.message : '[^']+')(\s*}\s*\n\s*},\s*{\s*status:\s*\d+\s*}\s*\))/g,
      to: '$1error: $2\n    }, { status: 500 })'
    }
  ];

  patterns.forEach(pattern => {
    const newContent = content.replace(pattern.from, pattern.to);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ 修复完成: ${filePath}`);
    return true;
  }

  return false;
}

const files = findFilesWithErrorPattern();
let fixedCount = 0;

files.forEach(filePath => {
  if (fixErrorProperty(filePath)) {
    fixedCount++;
  }
});

console.log(`\n✅ 修复完成，共处理 ${fixedCount} 个文件`);