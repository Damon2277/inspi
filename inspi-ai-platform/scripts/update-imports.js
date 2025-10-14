#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 路径映射规则
const pathMappings = {
  // Types
  '@/types/': '@/shared/types/',
  
  // Utils
  '@/utils/': '@/shared/utils/',
  
  // Hooks
  '@/hooks/': '@/shared/hooks/',
  
  // Core services
  '@/lib/ai/': '@/core/ai/',
  '@/lib/auth/': '@/core/auth/',
  '@/lib/payment/': '@/core/subscription/',
  '@/lib/subscription/': '@/core/subscription/',
  '@/lib/graph-visualization/': '@/core/graph/',
  
  // Components
  '@/components/ui/': '@/shared/components/',
  '@/components/common/': '@/shared/components/',
  '@/components/shared/': '@/shared/components/',
  '@/components/magic/': '@/features/magic/',
  '@/components/square/': '@/features/square/',
  '@/components/subscription/': '@/features/subscription/',
  '@/components/payment/': '@/features/subscription/',
  '@/components/knowledge-graph/': '@/core/graph/',
};

// 获取所有需要更新的文件
function getAllFiles() {
  const patterns = [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/node_modules/**',
    '!src/**/*.d.ts'
  ];
  
  let files = [];
  patterns.forEach(pattern => {
    if (pattern.startsWith('!')) {
      // 排除模式暂时跳过，glob会处理
      return;
    }
    const matches = glob.sync(pattern, { cwd: process.cwd() });
    files = files.concat(matches);
  });
  
  return [...new Set(files)]; // 去重
}

// 更新单个文件的import路径
function updateFileImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;
    let hasChanges = false;
    
    // 遍历所有映射规则
    Object.entries(pathMappings).forEach(([oldPath, newPath]) => {
      const regex = new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (regex.test(updatedContent)) {
        updatedContent = updatedContent.replace(regex, newPath);
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// 主函数
function main() {
  console.log('🚀 Starting import path updates...\n');
  
  const files = getAllFiles();
  console.log(`📁 Found ${files.length} files to check\n`);
  
  let updatedCount = 0;
  let errorCount = 0;
  
  files.forEach(file => {
    try {
      if (updateFileImports(file)) {
        updatedCount++;
      }
    } catch (error) {
      console.error(`❌ Failed to process ${file}:`, error.message);
      errorCount++;
    }
  });
  
  console.log('\n📊 Summary:');
  console.log(`✅ Files updated: ${updatedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📁 Total files checked: ${files.length}`);
  
  if (updatedCount > 0) {
    console.log('\n🎉 Import path updates completed!');
  } else {
    console.log('\n✨ No updates needed.');
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { updateFileImports, pathMappings };