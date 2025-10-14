#!/usr/bin/env node

/**
 * 目录结构重组执行脚本
 * 自动执行目录重组计划
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 开始执行目录结构重组...');

// 重组计划
const plan = {
  "lib/models": "shared/models",
  "lib/database": "core/database",
  "lib/email": "core/email",
  "lib/security": "core/security",
  "lib/cache": "core/cache",
  "lib/api": "shared/api",
  "lib/utils": "shared/utils",
  "lib/errors": "shared/errors",
  "lib/monitoring": "core/monitoring",
  "lib/performance": "core/performance",
  "lib/testing": "shared/testing",
  "lib/services": "core/services",
  "components/auth": "features/auth/components",
  "components/admin": "features/admin/components",
  "components/community": "features/community/components",
  "components/subscription": "features/subscription/components",
  "components/knowledge-graph": "features/knowledge-graph/components",
  "components/ui": "shared/components/ui",
  "components/common": "shared/components/common",
  "hooks": "shared/hooks",
  "types": "shared/types",
  "utils": "shared/utils",
  "config": "shared/config",
  "contexts": "shared/contexts",
  "stores": "shared/stores"
};

// 执行重组
function executeReorganization() {
  Object.entries(plan).forEach(([source, target]) => {
    const sourcePath = path.join(process.cwd(), 'src', source);
    const targetPath = path.join(process.cwd(), 'src', target);
    
    if (fs.existsSync(sourcePath)) {
      console.log(`📁 移动 ${source} -> ${target}`);
      
      // 创建目标目录
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // 移动文件/目录
      try {
        fs.renameSync(sourcePath, targetPath);
        console.log(`✅ 成功移动 ${source}`);
      } catch (error) {
        console.error(`❌ 移动失败 ${source}:`, error.message);
      }
    } else {
      console.log(`⚠️ 源路径不存在: ${source}`);
    }
  });
}

// 更新导入路径
function updateImportPaths() {
  console.log('🔄 更新导入路径...');
  
  // 这里需要实现导入路径更新逻辑
  // 扫描所有.ts/.tsx文件，更新import语句
}

// 执行重组
executeReorganization();
updateImportPaths();

console.log('✅ 目录结构重组完成');
