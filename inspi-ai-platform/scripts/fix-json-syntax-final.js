#!/usr/bin/env node

/**
 * 修复剩余的JSON语法错误
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 修复剩余的JSON语法错误...');

/**
 * 修复特定文件的JSON语法错误
 */
function fixSpecificFiles() {
  const fixes = [
    // 修复 }, { { status: 500 }) -> }, { status: 500 })
    {
      pattern: /},\s*{\s*{\s*status:\s*500\s*\)\s*}/g,
      replacement: '}, { status: 500 })'
    },
    // 修复 }, { \n { status: 500 } -> }, { status: 500 }
    {
      pattern: /},\s*{\s*\n\s*{\s*status:\s*500\s*}\s*\)/g,
      replacement: '}, { status: 500 })'
    },
    // 修复 async handlePaymentNotification( -> async handlePaymentNotification(
    {
      pattern: /async\s+handlePaymentNotification\(/g,
      replacement: 'async handlePaymentNotification('
    },
    // 修复 }; -> }
    {
      pattern: /details:\s*{\s*error:\s*error\s+instanceof\s+Error\s*\?
        \s*error\.message\s*:\s*'[^']*'\s*};\s*}/g,
      replacement: (match) => match.replace(/};/, '}')
    }
  ];

  // 获取所有需要修复的文件
  const filesToFix = [
    'src/app/api/activities/[id]/leaderboard/route.ts',
    'src/app/api/activities/[id]/progress/[userId]/route.ts',
    'src/app/api/activities/[id]/rewards/[userId]/claim/route.ts',
    'src/app/api/activities/[id]/route.ts',
    'src/app/api/admin/activities/[id]/complete/route.ts',
    'src/app/api/admin/activities/[id]/leaderboard/route.ts',
    'src/app/api/admin/activities/[id]/route.ts',
    'src/app/api/admin/activities/[id]/stats/route.ts',
    'src/app/api/payment/cancel/[id]/route.ts',
    'src/app/api/payment/retry/[id]/route.ts',
    'src/app/api/subscription/plans/[id]/route.ts',
    'src/core/subscription/payment-service.ts',
    'src/lib/logging/logger.ts'
  ];

  filesToFix.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // 应用所有修复
      fixes.forEach(fix => {
        const newContent = content.replace(fix.pattern, fix.replacement);
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      });

      // 手动修复特定的错误模式
      // 修复 }, { { status: 500 }) 模式
      content = content.replace(/},\s*{\s*{\s*status:\s*(\d+)\s*\)\s*}/g, '}, { status: $1 })');
      
      // 修复 }, {\n      { status: 500 } 模式
      content = content.replace(/},\s*{\s*\n\s*{\s*status:\s*(\d+)\s*}\s*\)/g,
        '}, { status: $1 })');

      // 修复 logger.ts 中的 }; 问题
      if (filePath.includes('logger.ts')) {
        content = content.replace(
          /details:\s*{\s*error:\s*error\s+instanceof\s+Error\s*\?
            \s*error\.message\s*:\s*'[^']*'\s*};\s*}/g,
          (match) => match.replace(/};/, '}')
        );
      }

      if (content !== fs.readFileSync(fullPath, 'utf8')) {
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ 修复JSON语法: ${filePath}`);
      }
    }
  });
}

/**
 * 主执行函数
 */
function main() {
  fixSpecificFiles();
  console.log('\\n🎉 JSON语法错误修复完成！');
}

if (require.main === module) {
  main();
}

module.exports = { fixSpecificFiles };