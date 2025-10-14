#!/usr/bin/env node

/**
 * 目录结构重组计划
 * 按照四层架构重新组织项目结构
 */

const fs = require('fs');
const path = require('path');

console.log('📋 生成目录结构重组计划...');

// 四层架构定义
const architectureLayers = {
  core: {
    description: '核心业务逻辑层',
    subdirectories: [
      'ai',           // AI服务
      'auth',         // 认证授权
      'community',    // 社区功能
      'graph',        // 知识图谱
      'subscription', // 订阅系统
      'monitoring',   // 监控系统
      'performance',  // 性能优化
      'quality'       // 代码质量
    ]
  },
  shared: {
    description: '共享资源层',
    subdirectories: [
      'components',   // 通用组件
      'hooks',        // 通用Hooks
      'types',        // 类型定义
      'utils',        // 工具函数
      'constants',    // 常量定义
      'config'        // 配置文件
    ]
  },
  features: {
    description: '功能特性层',
    subdirectories: [
      'dashboard',    // 仪表板
      'workspace',    // 工作空间
      'collaboration',// 协作功能
      'analytics',    // 分析功能
      'admin'         // 管理功能
    ]
  },
  app: {
    description: 'Next.js应用层',
    subdirectories: [
      'api',          // API路由
      'pages',        // 页面组件
      'layout',       // 布局组件
      'middleware'    // 中间件
    ]
  }
};

// 需要重组的目录映射
const reorganizationPlan = {
  // lib目录下的内容需要重新分配
  'lib/models': 'shared/models',
  'lib/database': 'core/database',
  'lib/email': 'core/email',
  'lib/security': 'core/security',
  'lib/cache': 'core/cache',
  'lib/api': 'shared/api',
  'lib/utils': 'shared/utils',
  'lib/errors': 'shared/errors',
  'lib/monitoring': 'core/monitoring',
  'lib/performance': 'core/performance',
  'lib/testing': 'shared/testing',
  'lib/services': 'core/services',
  
  // components目录需要分类
  'components/auth': 'features/auth/components',
  'components/admin': 'features/admin/components',
  'components/community': 'features/community/components',
  'components/subscription': 'features/subscription/components',
  'components/knowledge-graph': 'features/knowledge-graph/components',
  'components/ui': 'shared/components/ui',
  'components/common': 'shared/components/common',
  
  // hooks目录整合
  'hooks': 'shared/hooks',
  
  // types目录整合
  'types': 'shared/types',
  
  // utils目录整合
  'utils': 'shared/utils',
  
  // config目录整合
  'config': 'shared/config',
  
  // contexts目录重组
  'contexts': 'shared/contexts',
  
  // stores目录重组
  'stores': 'shared/stores'
};

// 重复功能合并计划
const duplicateConsolidation = {
  // 日志功能合并
  logging: {
    target: 'core/monitoring/logger.ts',
    sources: [
      'lib/logging/',
      'lib/utils/logger.ts',
      'shared/utils/logger.ts'
    ]
  },
  
  // 错误处理合并
  errorHandling: {
    target: 'shared/errors/',
    sources: [
      'lib/errors/',
      'lib/error/',
      'lib/utils/errorHandler.ts',
      'shared/utils/errorHandler.ts'
    ]
  },
  
  // 性能监控合并
  performance: {
    target: 'core/performance/',
    sources: [
      'lib/performance/',
      'lib/monitoring/performance.ts',
      'shared/hooks/usePerformanceMonitor.ts'
    ]
  },
  
  // 工具函数合并
  utils: {
    target: 'shared/utils/',
    sources: [
      'lib/utils/',
      'utils/',
      'shared/utils/'
    ]
  }
};

// 生成重组报告
function generateReorganizationReport() {
  const report = {
    timestamp: new Date().toISOString(),
    architecture: architectureLayers,
    reorganizationPlan,
    duplicateConsolidation,
    recommendations: [
      {
        priority: 'high',
        title: '合并重复功能',
        description: '将分散在不同目录的相同功能合并到统一位置',
        impact: '减少代码重复，提高维护性'
      },
      {
        priority: 'high',
        title: '统一导入路径',
        description: '更新所有import语句以反映新的目录结构',
        impact: '确保代码能够正常编译和运行'
      },
      {
        priority: 'medium',
        title: '清理空目录',
        description: '删除重组后的空目录和无用文件',
        impact: '保持项目结构清洁'
      },
      {
        priority: 'medium',
        title: '更新配置文件',
        description: '更新tsconfig.json、jest.config.js等配置文件的路径映射',
        impact: '确保工具链正常工作'
      },
      {
        priority: 'low',
        title: '文档更新',
        description: '更新README和其他文档以反映新的项目结构',
        impact: '帮助开发者理解新的架构'
      }
    ],
    estimatedEffort: {
      planning: '2小时',
      implementation: '6-8小时',
      testing: '2-3小时',
      documentation: '1小时'
    }
  };

  return report;
}

// 检查当前目录结构
function analyzeCurrentStructure() {
  const srcPath = path.join(process.cwd(), 'src');
  const analysis = {
    totalDirectories: 0,
    totalFiles: 0,
    layerDistribution: {},
    duplicatePatterns: []
  };

  function scanDirectory(dirPath, relativePath = '') {
    try {
      const items = fs.readdirSync(dirPath);
      
      items.forEach(item => {
        const fullPath = path.join(dirPath, item);
        const relativeItemPath = path.join(relativePath, item);
        
        if (fs.statSync(fullPath).isDirectory()) {
          analysis.totalDirectories++;
          
          // 分析层级分布
          const topLevel = relativePath.split('/')[0] || item;
          analysis.layerDistribution[topLevel] = (analysis.layerDistribution[topLevel] || 0) + 1;
          
          scanDirectory(fullPath, relativeItemPath);
        } else {
          analysis.totalFiles++;
        }
      });
    } catch (error) {
      console.warn(`无法扫描目录 ${dirPath}:`, error.message);
    }
  }

  scanDirectory(srcPath);
  return analysis;
}

// 生成执行脚本
function generateExecutionScript() {
  return `#!/usr/bin/env node

/**
 * 目录结构重组执行脚本
 * 自动执行目录重组计划
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 开始执行目录结构重组...');

// 重组计划
const plan = ${JSON.stringify(reorganizationPlan, null, 2)};

// 执行重组
function executeReorganization() {
  Object.entries(plan).forEach(([source, target]) => {
    const sourcePath = path.join(process.cwd(), 'src', source);
    const targetPath = path.join(process.cwd(), 'src', target);
    
    if (fs.existsSync(sourcePath)) {
      console.log(\`📁 移动 \${source} -> \${target}\`);
      
      // 创建目标目录
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // 移动文件/目录
      try {
        fs.renameSync(sourcePath, targetPath);
        console.log(\`✅ 成功移动 \${source}\`);
      } catch (error) {
        console.error(\`❌ 移动失败 \${source}:\`, error.message);
      }
    } else {
      console.log(\`⚠️ 源路径不存在: \${source}\`);
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
`;
}

// 主执行函数
function main() {
  const currentStructure = analyzeCurrentStructure();
  const report = generateReorganizationReport();
  const executionScript = generateExecutionScript();

  // 保存分析报告
  const reportPath = path.join(process.cwd(), 'directory-reorganization-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    currentStructure,
    ...report
  }, null, 2));

  // 保存执行脚本
  const scriptPath = path.join(process.cwd(), 'scripts', 'execute-reorganization.js');
  fs.writeFileSync(scriptPath, executionScript);
  fs.chmodSync(scriptPath, '755');

  console.log('📊 当前结构分析:');
  console.log(`   总目录数: ${currentStructure.totalDirectories}`);
  console.log(`   总文件数: ${currentStructure.totalFiles}`);
  console.log('   层级分布:', currentStructure.layerDistribution);

  console.log('\\n📋 重组计划已生成:');
  console.log(`   报告文件: ${reportPath}`);
  console.log(`   执行脚本: ${scriptPath}`);

  console.log('\\n🎯 建议的重组步骤:');
  report.recommendations.forEach((rec, index) => {
    console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
    console.log(`      ${rec.description}`);
  });

  console.log('\\n⏱️ 预估工作量:');
  Object.entries(report.estimatedEffort).forEach(([phase, time]) => {
    console.log(`   ${phase}: ${time}`);
  });
}

if (require.main === module) {
  main();
}

module.exports = {
  architectureLayers,
  reorganizationPlan,
  duplicateConsolidation,
  generateReorganizationReport,
  analyzeCurrentStructure
};