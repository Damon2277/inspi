#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 修复catch块中的变量引用问题...');

// 查找所有包含params Promise的文件
function findFilesWithParams() {
  try {
    const result = execSync('find src -name "*.ts" -o -
      name "*.tsx" | xargs grep -l "params: Promise" 2>/dev/null || true', { encoding: 'utf8' });
    return result.split('\n').filter(line => line.trim());
  } catch (error) {
    return [];
  }
}

function fixCatchBlockVars(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // 查找并修复catch块中的变量引用问题
  const patterns = [
    // activityId: id -> activityId
    { from: /activityId:\s*id\b/g, to: 'activityId' },
    // userId: userId -> userId  
    { from: /userId:\s*userId\b/g, to: 'userId' },
    // 其他类似模式
    { from: /(\w+):\s*\1\b/g, to: '$1' }
  ];

  patterns.forEach(pattern => {
    if (pattern.from.test(content)) {
      content = content.replace(pattern.from, pattern.to);
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

const files = findFilesWithParams();
let fixedCount = 0;

files.forEach(filePath => {
  if (fixCatchBlockVars(filePath)) {
    fixedCount++;
  }
});

console.log(`\n✅ 修复完成，共处理 ${fixedCount} 个文件`);