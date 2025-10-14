#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 查找所有API路由文件
function findApiRoutes() {
  return glob.sync('src/app/api/**/route.ts', { cwd: process.cwd() });
}

// 修复单个文件的路由参数
function fixRouteParams(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;
    let hasChanges = false;

    // 修复 params 类型定义
    const paramTypeRegex = /\{\s*params\s*\}:\s*\{\s*params:\s*\{([^}]+)\}\s*\}/g;
    if (paramTypeRegex.test(content)) {
      updatedContent = updatedContent.replace(
        paramTypeRegex,
        '{ params }: { params: Promise<{$1}> }'
      );
      hasChanges = true;
    }

    // 修复 params 使用
    const paramUsageRegex = /const\s+(\w+)\s*=\s*params\.(\w+)/g;
    const matches = [...content.matchAll(paramUsageRegex)];
    
    if (matches.length > 0) {
      // 添加 await params 解构
      const firstMatch = matches[0];
      const paramNames = matches.map(match => match[2]);
      const destructuring = `const { ${paramNames.join(', ')} } = await params`;
      
      // 替换第一个使用
      updatedContent = updatedContent.replace(
        firstMatch[0],
        destructuring
      );
      
      // 移除其他重复的 params 使用
      for (let i = 1; i < matches.length; i++) {
        updatedContent = updatedContent.replace(matches[i][0], '');
      }
      
      hasChanges = true;
    }

    if (hasChanges) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// 主函数
function main() {
  console.log('🚀 Starting API route params fix...\n');
  
  const files = findApiRoutes();
  console.log(`📁 Found ${files.length} API route files\n`);
  
  let fixedCount = 0;
  
  files.forEach(file => {
    if (fixRouteParams(file)) {
      fixedCount++;
    }
  });
  
  console.log('\n📊 Summary:');
  console.log(`✅ Files fixed: ${fixedCount}`);
  console.log(`📁 Total files checked: ${files.length}`);
  
  if (fixedCount > 0) {
    console.log('\n🎉 API route params fix completed!');
  } else {
    console.log('\n✨ No fixes needed.');
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { fixRouteParams };