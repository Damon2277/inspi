#!/usr/bin/env node

/**
 * 修复错误对象属性名问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 修复错误对象属性名问题...');

/**
 * 修复特定文件的错误属性名
 */
function fixErrorProperties() {
  const filesToFix = [
    'src/app/api/activities/[id]/progress/[userId]/route.ts',
    'src/app/api/activities/[id]/rewards/[userId]/claim/route.ts',
    'src/app/api/activities/[id]/route.ts',
    'src/app/api/admin/activities/[id]/complete/route.ts',
    'src/app/api/admin/activities/[id]/leaderboard/route.ts',
    'src/app/api/admin/activities/[id]/route.ts',
    'src/app/api/admin/activities/[id]/stats/route.ts',
    'src/app/api/payment/cancel/[id]/route.ts',
    'src/app/api/payment/retry/[id]/route.ts',
    'src/app/api/subscription/plans/[id]/route.ts'
  ];

  filesToFix.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // 修复 error instanceof Error ? error.message : '...' -> error: error instanceof Error ? error.message : '...'
      const pattern = /(\s+success:\s*false,
        \s*\n\s+)(error instanceof Error \? error\.message : '[^']+')(\s*\n\s*})/g;
      const newContent = content.replace(pattern, '$1error: $2$3');
      
      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`✅ 修复错误属性: ${filePath}`);
      }
    }
  });
}

/**
 * 主执行函数
 */
function main() {
  fixErrorProperties();
  console.log('\\n🎉 错误属性名修复完成！');
}

if (require.main === module) {
  main();
}

module.exports = { fixErrorProperties };