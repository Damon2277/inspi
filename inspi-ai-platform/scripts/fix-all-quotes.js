#!/usr/bin/env node

/**
 * 全面修复所有引号问题
 * 修复各种引号格式错误和JSON语法错误
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 全面修复所有引号问题...');

/**
 * 修复文件中的所有引号问题
 */
function fixAllQuotesInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const originalContent = content;

    // 1. 修复各种引号不匹配问题
    const quoteFixes = [
      // 修复 "@/xxx' -> '@/xxx'
      {
        from: /from\s+"(@\/[^']+)'/g,
        to: "from '$1'"
      },
      // 修复 import { xxx } from "@/xxx' -> import { xxx } from '@/xxx'
      {
        from: /import\s*{[^}]*}\s*from\s+"(@\/[^']+)'/g,
        to: (match) => match.replace(/"/g, "'")
      },
      // 修复 import xxx from "@/xxx' -> import xxx from '@/xxx'
      {
        from: /import\s+\w+\s+from\s+"(@\/[^']+)'/g,
        to: (match) => match.replace(/"/g, "'")
      },
      // 修复所有 "@/xxx' 模式
      {
        from: /"(@\/[^']+)'/g,
        to: "'$1'"
      }
    ];

    quoteFixes.forEach(fix => {
      if (typeof fix.to === 'function') {
        content = content.replace(fix.from, fix.to);
      } else {
        content = content.replace(fix.from, fix.to);
      }
    });

    // 2. 修复JSON语法错误
    const jsonFixes = [
      // 修复 error instanceof Error ? error.message : '...' } -> error instanceof Error ? error.message : '...' },
      {
        from: /(error instanceof Error \? error\.message : '[^']+')(\s*}\s*},)/g,
        to: '$1\n    }, {'
      },
      // 修复缺少逗号的情况
      {
        from: /(\s+error instanceof Error \? error\.message : '[^']+')(\s*}\s*})/g,
        to: '$1\n    }'
      }
    ];

    jsonFixes.forEach(fix => {
      const newContent = content.replace(fix.from, fix.to);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });

    // 3. 检查是否有修改
    if (content !== originalContent) {
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ 修复引号: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ 修复文件失败 ${filePath}:`, error.message);
    return false;
  }
}

/**
 * 递归修复目录中的文件
 */
function fixAllQuotesInDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  let fixedCount = 0;

  items.forEach(item => {
    const fullPath = path.join(dirPath, item);

    if (fs.statSync(fullPath).isDirectory()) {
      // 跳过 node_modules 和 .git 目录
      if (item !== 'node_modules' && item !== '.git' && item !== '.next') {
        fixedCount += fixAllQuotesInDirectory(fullPath);
      }
    } else if (item.endsWith('.ts') || item.endsWith('.tsx') ||
      item.endsWith('.js') || item.endsWith('.jsx')) {
      if (fixAllQuotesInFile(fullPath)) {
        fixedCount++;
      }
    }
  });

  return fixedCount;
}

/**
 * 修复特定的JSON语法错误文件
 */
function fixSpecificJsonErrors() {
  console.log('\\n🔧 修复特定的JSON语法错误...');
  
  const specificFixes = [
    {
      file: 'src/app/api/payment/cancel/[id]/route.ts',
      fixes: [
        {
          from: /(\s+error instanceof Error \? error\.message : '取消支付失败')(\s+}\s+},)/g,
          to: '$1\\n    }, {'
        }
      ]
    },
    {
      file: 'src/app/api/payment/retry/[id]/route.ts',
      fixes: [
        {
          from: /(\s+error instanceof Error \? error\.message : '重试支付失败')(\s+}\s+},)/g,
          to: '$1\\n    }, {'
        }
      ]
    },
    {
      file: 'src/app/api/subscription/plans/[id]/route.ts',
      fixes: [
        {
          from: /(\s+error instanceof Error \? error\.message : '更新套餐失败')(\s+}\s+},)/g,
          to: '$1\\n    }, {'
        }
      ]
    }
  ];

  specificFixes.forEach(({ file, fixes }) => {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      fixes.forEach(fix => {
        const newContent = content.replace(fix.from, fix.to);
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ 修复特定JSON语法: ${file}`);
      }
    }
  });
}

/**
 * 主执行函数
 */
function main() {
  const srcPath = path.join(process.cwd(), 'src');
  const fixedCount = fixAllQuotesInDirectory(srcPath);

  console.log(`\\n✅ 引号修复完成，共修复 ${fixedCount} 个文件`);

  // 修复特定的JSON语法错误
  fixSpecificJsonErrors();

  console.log('\\n🎉 所有引号和语法问题修复完成！');
}

if (require.main === module) {
  main();
}

module.exports = { fixAllQuotesInFile, fixAllQuotesInDirectory };