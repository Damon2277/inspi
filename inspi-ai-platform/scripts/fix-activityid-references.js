#!/usr/bin/env node

/**
 * 修复activityId引用问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 修复activityId引用问题...');

/**
 * 修复单个文件的activityId引用
 */
function fixActivityIdReferences(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // 检查文件中是否定义了activityId变量
  const hasActivityIdVar = content.includes('activityId = resolvedParams.id') || 
                          content.includes('let activityId') || 
                          content.includes('const activityId');
  
  if (hasActivityIdVar) {
    // 如果有activityId变量，将activityId: id替换为activityId
    const newContent = content.replace(/activityId:\s*id\b/g, 'activityId');
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  } else {
    // 如果没有activityId变量，检查是否有id变量
    const hasIdVar = content.includes('id = resolvedParams.id') || 
                     content.includes('let id') || 
                     content.includes('const id');
    
    if (hasIdVar) {
      // 如果有id变量，将activityId替换为activityId: id
      const newContent =
        content.replace(/(\{\s*[^}]*\s*)activityId(\s*[^}]*\})/g, '$1activityId: id$2');
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ 修复activityId引用: ${filePath}`);
    return true;
  }
  
  return false;
}

/**
 * 主执行函数
 */
function main() {
  // 需要修复的文件列表
  const filesToFix = [
    'src/app/api/activities/[id]/rewards/[userId]/claim/route.ts',
    'src/app/api/activities/[id]/rewards/[userId]/route.ts',
    'src/app/api/admin/activities/[id]/complete/route.ts',
    'src/app/api/admin/activities/[id]/leaderboard/route.ts',
    'src/app/api/admin/activities/[id]/route.ts',
    'src/app/api/admin/activities/[id]/stats/route.ts'
  ];
  
  let fixedCount = 0;
  filesToFix.forEach(filePath => {
    if (fixActivityIdReferences(filePath)) {
      fixedCount++;
    }
  });
  
  console.log(`\\n✅ activityId引用修复完成，共修复 ${fixedCount} 个文件`);
}

if (require.main === module) {
  main();
}

module.exports = { fixActivityIdReferences };