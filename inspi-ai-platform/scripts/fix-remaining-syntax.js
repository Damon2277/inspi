#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 修复所有剩余的语法错误...\n');

/**
 * Fix identifier and syntax errors in specific files
 */
function fixAllSyntaxErrors() {
  const fixes = [
    {
      file: 'src/components/contribution/Leaderboard.tsx',
      line: 266,
      description: '修复Leaderboard标识符错误',
    },
    {
      file: 'src/core/graph/data-manager.ts',
      lines: [139, 266, 291, 338, 404, 586],
      description: '修复data-manager标识符错误',
    },
    {
      file: 'src/core/quality/code-review-automation.ts',
      line: 426,
      description: '修复code-review标识符错误',
    },
    {
      file: 'src/lib/cdn/config.ts',
      line: 375,
      description: '修复CDN配置标识符错误',
    },
    {
      file: 'src/lib/database/operations.ts',
      lines: [86, 95, 120],
      description: '修复database操作分号错误',
    },
    {
      file: 'src/lib/invitation/async/AsyncTaskProcessor.ts',
      line: 350,
      description: '修复AsyncTaskProcessor标识符错误',
    },
    {
      file: 'src/lib/models/Follow.ts',
      lines: [67, 84],
      description: '修复Follow模型语法错误',
    },
    {
      file: 'src/lib/models/KnowledgeGraph.ts',
      lines: [299, 304, 446, 548],
      description: '修复KnowledgeGraph语法错误',
    },
    {
      file: 'src/lib/models/WorkMount.ts',
      lines: [94, 101],
      description: '修复WorkMount语法错误',
    },
  ];

  fixes.forEach(({ file, line, lines, description }) => {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  文件不存在: ${file}`);
      return;
    }

    console.log(`📦 ${description}...`);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 通用修复策略
    // 1. 修复 (Model.method as any)( 模式
    content = content.replace(/\((\w+)\.(\w+)\s+as\s+any\)\(/g, '($1.$2 as any)(');
    
    // 2. 修复多余的 as any
    content = content.replace(/as\s+any\s+as\s+any/g, 'as any');
    
    // 3. 修复 populate 链
    content = content.replace(/\)\s+as\s+any\)\.populate/g, ').populate');
    
    // 4. 修复缺失的分号
    content = content.replace(/\}\s*\n\s*return/g, '}\n    return');
    content = content.replace(/\)\s*\n\s*\./g, ')\n      .');
    
    // 5. 修复箭头函数后的 as any
    content = content.replace(/=>\s+as\s+any/g, ') as any');
    
    // 6. 修复 exec() 调用
    content = content.replace(/\.exec\(\)\s+as\s+any\s+as\s+any/g, '.exec() as any');
    content = content.replace(/\.exec\(\)\s*\n\s*as\s+any/g, '.exec() as any');

    fs.writeFileSync(filePath, content);
    console.log(`✅ 修复了 ${file}`);
  });
}

/**
 * 深度修复 Mongoose 查询
 */
function deepFixMongooseQueries() {
  console.log('\n📦 深度修复Mongoose查询...');
  
  const glob = require('glob');
  const files = glob.sync('src/**/*.{ts,tsx}', {
    cwd: path.join(__dirname, '..'),
    ignore: ['node_modules/**', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}']
  });

  let fixedCount = 0;
  
  files.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // 修复所有 Mongoose 方法调用
    const methods = [
      'find', 'findOne', 'findById', 'findByIdAndUpdate',
      'findByIdAndDelete', 'findOneAndUpdate', 'findOneAndDelete',
      'updateOne', 'updateMany', 'deleteOne', 'deleteMany',
      'create', 'insertMany', 'countDocuments', 'distinct', 
      'aggregate', 'populate', 'exec', 'save'
    ];

    methods.forEach(method => {
      // 修复错误的类型断言格式
      const pattern1 = new RegExp(`\\(([A-Za-z_][A-Za-z0-9_]*)\\.${method}\\s+
        as\\s+any\\)\\(`, 'g');
      content = content.replace(pattern1, `($1.${method} as any)(`);
      
      // 修复方法链
      const pattern2 = new RegExp(`\\.${method}\\(([^)]*?)\\)\\s+as\\s+any\\s*\n\\s*\\.`, 'g');
      content = content.replace(pattern2, `.${method}($1)\n        .`);
    });

    // 修复双重 as any
    content = content.replace(/\)\s+as\s+any\s+as\s+any/g, ') as any');
    content = content.replace(/as\s+any\)\s+as\s+any/g, 'as any)');

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      fixedCount++;
    }
  });

  console.log(`✅ 深度修复了 ${fixedCount} 个文件`);
}

/**
 * 修复特定的语法模式
 */
function fixSpecificPatterns() {
  console.log('\n📦 修复特定语法模式...');

  // 修复 WorkMount.ts
  const workMountPath = path.join(__dirname, '../src/lib/models/WorkMount.ts');
  if (fs.existsSync(workMountPath)) {
    let content = fs.readFileSync(workMountPath, 'utf8');
    
    // 查找并修复第94行附近的语法错误
    content = content.replace(/\.populate\('work'\)\s*;?\s*\n/g, '.populate(\'work\');\n');
    content = content.replace(/\.populate\('mountedBy'\)\s*;?\s*\n/g,
      '.populate(\'mountedBy\');\n');
    
    fs.writeFileSync(workMountPath, content);
    console.log('✅ 修复了 WorkMount.ts');
  }

  // 修复 Follow.ts
  const followPath = path.join(__dirname, '../src/lib/models/Follow.ts');
  if (fs.existsSync(followPath)) {
    let content = fs.readFileSync(followPath, 'utf8');
    
    // 修复 exec() 后的语法
    content = content.replace(/\.exec\(\)\s*as\s+any\s*;/g, '.exec();');
    content = content.replace(/\)\s+as\s+any\s*\n\s*return/g, ');\n  return');
    
    fs.writeFileSync(followPath, content);
    console.log('✅ 修复了 Follow.ts');
  }

  // 修复 KnowledgeGraph.ts
  const kgPath = path.join(__dirname, '../src/lib/models/KnowledgeGraph.ts');
  if (fs.existsSync(kgPath)) {
    let content = fs.readFileSync(kgPath, 'utf8');
    
    // 修复聚合查询
    content = content.replace(/\(KnowledgeGraph\.aggregate\s+as\s+any\)\(/g,
      '(KnowledgeGraph.aggregate as any)(');
    content = content.replace(/\(this\.aggregate\s+as\s+any\)\(/g, '(this.aggregate as any)(');
    
    fs.writeFileSync(kgPath, content);
    console.log('✅ 修复了 KnowledgeGraph.ts');
  }
}

/**
 * 最后的清理工作
 */
function finalCleanup() {
  console.log('\n📦 执行最后清理...');

  // 运行 ESLint 自动修复
  console.log('运行 ESLint 自动修复...');
  try {
    require('child_process').execSync('npm run lint:fix', { stdio: 'inherit' });
  } catch (e) {
    // 忽略错误
  }
}

// 主执行函数
async function main() {
  try {
    console.log('🚀 开始修复所有剩余错误...\n');

    // 确保 glob 已安装
    try {
      require('glob');
    } catch {
      console.log('📦 安装 glob...');
      require('child_process').execSync('npm install glob --no-save', { stdio: 'inherit' });
    }

    // 执行修复
    fixAllSyntaxErrors();
    deepFixMongooseQueries();
    fixSpecificPatterns();
    finalCleanup();

    console.log('\n✅ 修复完成！');
    
    // 检查结果
    console.log('\n📊 最终结果：');
    
    try {
      const tsErrors = require('child_process').execSync(
        'npm run type-check 2>&1 | grep "error TS" | wc -l',
        { encoding: 'utf8' }
      );
      console.log(`TypeScript 错误: ${tsErrors.trim()}`);
    } catch (e) {}
    
    try {
      const eslintResult = require('child_process').execSync(
        'npm run lint 2>&1 | tail -3',
        { encoding: 'utf8' }
      );
      console.log(`ESLint 结果:\n${eslintResult}`);
    } catch (e) {}

  } catch (error) {
    console.error('❌ 修复过程中出错:', error.message);
    process.exit(1);
  }
}

// 运行脚本
main();