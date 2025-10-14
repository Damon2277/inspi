#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 修复所有剩余的params Promise问题...');

// 需要修复的文件列表
const filesToFix = [
  'src/app/api/activities/[id]/results/[userId]/route.ts',
  'src/app/api/activities/[id]/rewards/[userId]/claim/route.ts',
  'src/app/api/activities/[id]/rewards/[userId]/route.ts',
  'src/app/case/[id]/page.tsx',
  'src/app/share/card/[id]/page.tsx'
];

function fixParamsInFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ 文件不存在: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // 修复模式1: const { id } = params
  const pattern1 = /const\s+{\s*id\s*}\s*=\s*params/g;
  if (pattern1.test(content)) {
    content = content.replace(pattern1, 'const { id } = await params');
    modified = true;
  }

  // 修复模式2: const { id: activityId } = params
  const pattern2 = /const\s+{\s*id:\s*(\w+)\s*}\s*=\s*params/g;
  if (pattern2.test(content)) {
    content = content.replace(pattern2, 'const { id: $1 } = await params');
    modified = true;
  }

  // 修复模式3: const { id: activityId, userId } = params
  const pattern3 = /const\s+{\s*id:\s*(\w+),\s*(\w+)\s*}\s*=\s*params/g;
  if (pattern3.test(content)) {
    content = content.replace(pattern3, 'const { id: $1, $2 } = await params');
    modified = true;
  }

  // 修复模式4: const { id, userId } = params
  const pattern4 = /const\s+{\s*id,\s*(\w+)\s*}\s*=\s*params/g;
  if (pattern4.test(content)) {
    content = content.replace(pattern4, 'const { id, $1 } = await params');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ 修复完成: ${filePath}`);
    return true;
  }

  return false;
}

let fixedCount = 0;

filesToFix.forEach(filePath => {
  if (fixParamsInFile(filePath)) {
    fixedCount++;
  }
});

console.log(`\n✅ 修复完成，共处理 ${fixedCount} 个文件`);