#!/usr/bin/env node

/**
 * 修复变量作用域问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 修复变量作用域问题...');

/**
 * 修复特定文件的变量作用域问题
 */
function fixVariableScope() {
  const fixes = [
    // 修复 activityId 变量
    {
      pattern: /logger\.error\([^,]+,\s*{\s*error,\s*activityId\s*}\)/g,
      replacement: (match, file) => {
        if (file.includes('/activities/[id]/')) {
          return match.replace('activityId', 'activityId: id');
        }
        return match;
      }
    },
    // 修复 userId 变量
    {
      pattern: /logger\.error\([^,]+,\s*{\s*error,\s*activityId,\s*userId\s*}\)/g,
      replacement: (match, file) => {
        if (file.includes('/[userId]/')) {
          return match.replace('userId', 'userId: userId');
        }
        return match;
      }
    }
  ];

  // 获取所有需要修复的文件
  const filesToFix = [
    'src/app/api/activities/[id]/progress/[userId]/route.ts',
    'src/app/api/activities/[id]/rewards/[userId]/claim/route.ts',
    'src/app/api/activities/[id]/rewards/[userId]/route.ts',
    'src/app/api/activities/[id]/results/[userId]/route.ts',
    'src/app/api/activities/[id]/route.ts',
    'src/app/api/admin/activities/[id]/complete/route.ts',
    'src/app/api/admin/activities/[id]/leaderboard/route.ts',
    'src/app/api/admin/activities/[id]/route.ts',
    'src/app/api/admin/activities/[id]/stats/route.ts'
  ];

  filesToFix.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // 通用修复：activityId -> activityId: id
      if (content.includes('{ error, activityId }')) {
        content = content.replace(/{\s*error,\s*activityId\s*}/g, '{ error, activityId: id }');
        modified = true;
      }

      // 修复包含userId的情况
      if (content.includes('{ error, activityId, userId }')) {
        content = content.replace(/{\s*error,\s*activityId,\s*userId\s*}/g,
          '{ error, activityId: id, userId }');
        modified = true;
      }

      // 修复只有userId的情况
      if (content.includes('{ error, userId }') && filePath.includes('[userId]')) {
        // 需要检查userId变量是否存在
        if (content.includes('const resolvedParams = await params;') &&
          content.includes('userId = resolvedParams.userId;')) {
          // userId变量存在，不需要修改
        } else if (content.includes('userId: resolvedParams.userId')) {
          content = content.replace(/{\s*error,\s*userId\s*}/g, '{ error,
            userId: resolvedParams.userId }');
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ 修复变量作用域: ${filePath}`);
      }
    }
  });
}

/**
 * 主执行函数
 */
function main() {
  fixVariableScope();
  console.log('\\n🎉 变量作用域问题修复完成！');
}

if (require.main === module) {
  main();
}

module.exports = { fixVariableScope };