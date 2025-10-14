#!/usr/bin/env node

/**
 * 合并重复功能脚本
 * 将分散在不同目录的相同功能合并到统一位置
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 开始合并重复功能...');

// 重复功能合并计划
const consolidationPlan = {
  // 1. 合并工具函数
  utils: {
    target: 'src/shared/utils/',
    sources: [
      'src/lib/utils/',
      'src/utils/',
    ],
    action: 'merge'
  },
  
  // 2. 合并错误处理
  errors: {
    target: 'src/shared/errors/',
    sources: [
      'src/lib/errors/',
      'src/lib/error/'
    ],
    action: 'merge'
  },
  
  // 3. 合并类型定义
  types: {
    target: 'src/shared/types/',
    sources: [
      'src/types/'
    ],
    action: 'merge'
  },
  
  // 4. 合并Hooks
  hooks: {
    target: 'src/shared/hooks/',
    sources: [
      'src/hooks/'
    ],
    action: 'merge'
  },
  
  // 5. 合并配置文件
  config: {
    target: 'src/shared/config/',
    sources: [
      'src/config/'
    ],
    action: 'merge'
  },
  
  // 6. 合并上下文
  contexts: {
    target: 'src/shared/contexts/',
    sources: [
      'src/contexts/'
    ],
    action: 'merge'
  },
  
  // 7. 合并状态管理
  stores: {
    target: 'src/shared/stores/',
    sources: [
      'src/stores/'
    ],
    action: 'merge'
  }
};

// 需要更新的导入路径映射
const importPathMappings = {
  // 工具函数路径更新
  'from [\'"]@/lib/utils/': 'from "@/shared/utils/',
  'from [\'"]@/utils/': 'from "@/shared/utils/',
  
  // 错误处理路径更新
  'from [\'"]@/lib/errors/': 'from "@/shared/errors/',
  'from [\'"]@/lib/error/': 'from "@/shared/errors/',
  
  // 类型定义路径更新
  'from [\'"]@/types/': 'from "@/shared/types/',
  
  // Hooks路径更新
  'from [\'"]@/hooks/': 'from "@/shared/hooks/',
  
  // 配置文件路径更新
  'from [\'"]@/config/': 'from "@/shared/config/',
  
  // 上下文路径更新
  'from [\'"]@/contexts/': 'from "@/shared/contexts/',
  
  // 状态管理路径更新
  'from [\'"]@/stores/': 'from "@/shared/stores/'
};

/**
 * 合并目录内容
 */
function mergeDirectories(sources, target) {
  const targetPath = path.join(process.cwd(), target);
  
  // 确保目标目录存在
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
    console.log(`📁 创建目标目录: ${target}`);
  }
  
  sources.forEach(source => {
    const sourcePath = path.join(process.cwd(), source);
    
    if (fs.existsSync(sourcePath)) {
      console.log(`📦 合并 ${source} -> ${target}`);
      
      try {
        // 递归复制文件
        copyDirectoryRecursive(sourcePath, targetPath);
        console.log(`✅ 成功合并 ${source}`);
      } catch (error) {
        console.error(`❌ 合并失败 ${source}:`, error.message);
      }
    } else {
      console.log(`⚠️ 源目录不存在: ${source}`);
    }
  });
}

/**
 * 递归复制目录
 */
function copyDirectoryRecursive(source, target) {
  const items = fs.readdirSync(source);
  
  items.forEach(item => {
    const sourcePath = path.join(source, item);
    const targetPath = path.join(target, item);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      copyDirectoryRecursive(sourcePath, targetPath);
    } else {
      // 检查目标文件是否已存在
      if (fs.existsSync(targetPath)) {
        console.log(`⚠️ 文件已存在，跳过: ${targetPath}`);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  });
}

/**
 * 更新导入路径
 */
function updateImportPaths() {
  console.log('🔄 更新导入路径...');
  
  const srcPath = path.join(process.cwd(), 'src');
  updateImportsInDirectory(srcPath);
}

/**
 * 递归更新目录中的导入路径
 */
function updateImportsInDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  
  items.forEach(item => {
    const fullPath = path.join(dirPath, item);
    
    if (fs.statSync(fullPath).isDirectory()) {
      updateImportsInDirectory(fullPath);
    } else if (item.endsWith('.ts') || item.endsWith('.tsx') ||
      item.endsWith('.js') || item.endsWith('.jsx')) {
      updateImportsInFile(fullPath);
    }
  });
}

/**
 * 更新单个文件中的导入路径
 */
function updateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    Object.entries(importPathMappings).forEach(([oldPattern, newPath]) => {
      const regex = new RegExp(oldPattern, 'g');
      if (regex.test(content)) {
        content = content.replace(regex, newPath);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ 更新导入路径: ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (error) {
    console.error(`❌ 更新文件失败 ${filePath}:`, error.message);
  }
}

/**
 * 清理空目录
 */
function cleanupEmptyDirectories() {
  console.log('🧹 清理空目录...');
  
  const directoriesToCheck = [
    'src/lib/utils',
    'src/lib/errors',
    'src/lib/error',
    'src/utils',
    'src/types',
    'src/hooks',
    'src/config',
    'src/contexts',
    'src/stores'
  ];
  
  directoriesToCheck.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath) && isDirectoryEmpty(dirPath)) {
      try {
        fs.rmdirSync(dirPath);
        console.log(`🗑️ 删除空目录: ${dir}`);
      } catch (error) {
        console.warn(`⚠️ 无法删除目录 ${dir}:`, error.message);
      }
    }
  });
}

/**
 * 检查目录是否为空
 */
function isDirectoryEmpty(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    return items.length === 0;
  } catch (error) {
    return false;
  }
}

/**
 * 生成合并报告
 */
function generateConsolidationReport() {
  const report = {
    timestamp: new Date().toISOString(),
    consolidatedItems: [],
    updatedFiles: [],
    cleanedDirectories: [],
    summary: {
      totalConsolidations: 0,
      totalFileUpdates: 0,
      totalCleanups: 0
    }
  };
  
  // 保存报告
  const reportPath = path.join(process.cwd(), 'consolidation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📊 合并报告已保存: ${reportPath}`);
  return report;
}

/**
 * 主执行函数
 */
function main() {
  console.log('🚀 开始目录结构优化...');
  
  // 1. 合并重复功能
  Object.entries(consolidationPlan).forEach(([name, config]) => {
    console.log(`\\n📦 合并 ${name}...`);
    mergeDirectories(config.sources, config.target);
  });
  
  // 2. 更新导入路径
  console.log('\\n🔄 更新导入路径...');
  updateImportPaths();
  
  // 3. 清理空目录
  console.log('\\n🧹 清理空目录...');
  cleanupEmptyDirectories();
  
  // 4. 生成报告
  console.log('\\n📊 生成合并报告...');
  generateConsolidationReport();
  
  console.log('\\n✅ 目录结构优化完成！');
  console.log('\\n📋 后续步骤:');
  console.log('   1. 运行 npm run build 检查构建是否正常');
  console.log('   2. 运行测试确保功能正常');
  console.log('   3. 更新 tsconfig.json 路径映射');
  console.log('   4. 更新文档和README');
}

if (require.main === module) {
  main();
}

module.exports = {
  consolidationPlan,
  importPathMappings,
  mergeDirectories,
  updateImportPaths,
  cleanupEmptyDirectories
};