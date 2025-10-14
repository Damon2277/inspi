#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 修复JSON语法错误...');

// 需要修复的文件列表
const filesToFix = [
  'src/app/api/activities/[id]/join/route.ts',
  'src/app/api/activities/[id]/leaderboard/route.ts',
  'src/app/api/activities/[id]/progress/[userId]/route.ts',
  'src/app/api/activities/[id]/rewards/[userId]/claim/route.ts',
  'src/app/api/activities/[id]/rewards/[userId]/route.ts',
  'src/app/api/activities/[id]/route.ts',
  'src/app/api/admin/activities/[id]/complete/route.ts',
  'src/app/api/admin/activities/[id]/leaderboard/route.ts',
  'src/app/api/admin/activities/[id]/route.ts',
  'src/app/api/admin/activities/[id]/stats/route.ts',
  'src/app/api/payment/cancel/[id]/route.ts',
  'src/app/api/payment/retry/[id]/route.ts',
  'src/app/api/subscription/plans/[id]/route.ts'
];

function fixJsonSyntax(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ 文件不存在: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // 修复错误的JSON语法
  const fixes = [
    // 修复 error instanceof Error ? error.message : '...' 后缺少逗号的问题
    {
      from: /(error instanceof Error \? error\.message : '[^']+')(\s*}\s*,
        \s*{\s*status:\s*\d+\s*}\s*\))/g,
      to: '$1\n    }$2'
    },
    // 修复对象属性语法错误
    {
      from: /(\w+):\s*\1\b/g,
      to: '$1'
    },
    // 修复 claimedAt ? new Date(claimedAt) : undefined 的语法
    {
      from: /claimedAt \? new Date\(claimedAt\) : undefined,/g,
      to: 'claimedAt: claimedAt ? new Date(claimedAt) : undefined,'
    }
  ];

  fixes.forEach(fix => {
    const newContent = content.replace(fix.from, fix.to);
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

let fixedCount = 0;

filesToFix.forEach(filePath => {
  if (fixJsonSyntax(filePath)) {
    fixedCount++;
  }
});

console.log(`\n✅ 修复完成，共处理 ${fixedCount} 个文件`);