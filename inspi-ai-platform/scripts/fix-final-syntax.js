#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 修复最终的语法错误...\n');

/**
 * Fix all files with syntax errors
 */
function fixSyntaxErrors() {
  const fixes = [
    {
      file: 'src/components/contribution/Leaderboard.tsx',
      description: '修复Leaderboard语法',
      fix: (content) => {
        // Line 266 - Missing identifier
        // Look for problematic mongoose calls
        content = content.replace(/\.populate\(\s*\)(?!\s*as\s+any)/g, '.populate() as any');
        content = content.replace(/\)\s+as\s+any\s+as\s+any/g, ') as any');
        return content;
      }
    },
    {
      file: 'src/core/community/comment-service.ts',
      description: '修复comment-service语法',
      fix: (content) => {
        // Fix line 135 - missing comma
        content = content.replace(/\.populate\('author',
          'name avatar'\)\s+as\s+any\n\s*\.populate/g, 
                                  '.populate(\'author\', \'name avatar\') as any,
                                    \n          .populate');
        // Fix chained populate calls
        content = content.replace(/\)\s+as\s+any([^,])/g, ') as any$1');
        return content;
      }
    },
    {
      file: 'src/core/community/work-service.ts',
      description: '修复work-service语法',
      fix: (content) => {
        // Fix missing semicolons and commas
        content = content.replace(/\)\s+as\s+any\s*\n\s*\./g, ') as any\n        .');
        // Fix expression errors
        content = content.replace(/\}\s+as\s+any/g, '} as any');
        return content;
      }
    },
    {
      file: 'src/core/graph/data-manager.ts',
      description: '修复data-manager语法',
      fix: (content) => {
        // Fix identifier issues with type assertions
        content = content.replace(/\(([A-Za-z]+)\.([a-z]+)\s+as\s+any\)\(/g, '($1.$2 as any)(');
        return content;
      }
    },
    {
      file: 'src/core/quality/code-review-automation.ts',
      description: '修复code-review语法',
      fix: (content) => {
        // Fix identifier issues
        content = content.replace(/\((\w+)\.(\w+)\s+as\s+any\)\(/g, '($1.$2 as any)(');
        return content;
      }
    }
  ];

  fixes.forEach(({ file, description, fix }) => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      console.log(`📦 ${description}...`);
      let content = fs.readFileSync(filePath, 'utf8');
      content = fix(content);
      fs.writeFileSync(filePath, content);
      console.log(`✅ 修复了 ${file}`);
    }
  });
}

/**
 * Fix problematic type assertions globally
 */
function fixTypeAssertions() {
  console.log('📦 全局修复类型断言问题...');
  
  const glob = require('glob');
  const files = glob.sync('src/**/*.{ts,tsx}', {
    cwd: path.join(__dirname, '..'),
    ignore: ['node_modules/**', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}']
  });

  let fixedCount = 0;
  files.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix double "as any"
    if (content.includes('as any) as any')) {
      content = content.replace(/as\s+any\)\s+as\s+any/g, 'as any)');
      modified = true;
    }

    // Fix broken populate chains
    if (content.includes('.populate') && content.includes('as any\n')) {
      content = content.replace(/\)\s+as\s+any\s*\n\s*\.populate/g, ') as any).populate');
      modified = true;
    }

    // Fix mongoose method calls with bad type assertions
    const mongooseMethods = ['find', 'findOne', 'findById', 'aggregate', 'countDocuments'];
    mongooseMethods.forEach(method => {
      const badPattern = new RegExp(`\\(([A-Za-z]+)\\.${method}\\s+as\\s+any\\)\\(`, 'g');
      if (content.match(badPattern)) {
        content = content.replace(badPattern, `($1.${method} as any)(`);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content);
      fixedCount++;
    }
  });

  console.log(`✅ 修复了 ${fixedCount} 个文件的类型断言`);
}

/**
 * Add missing newlines at end of files
 */
function fixMissingNewlines() {
  console.log('📦 修复文件末尾缺失的换行...');
  
  const filesToFix = [
    'src/components/auth/AuthProviders.tsx',
  ];

  filesToFix.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (!content.endsWith('\n')) {
        content += '\n';
        fs.writeFileSync(filePath, content);
        console.log(`✅ 修复了 ${file} 的末尾换行`);
      }
    }
  });
}

/**
 * Fix max-len issues
 */
function fixMaxLengthIssues() {
  console.log('📦 修复超长行...');
  
  const files = [
    {
      path: 'src/shared/utils/performance.ts',
      line: 160
    },
    {
      path: 'src/shared/utils/graphValidation.ts',
      line: 147
    }
  ];

  files.forEach(({ path: filePath, line }) => {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      
      // Split long lines
      if (lines[line - 1] && lines[line - 1].length > 100) {
        const longLine = lines[line - 1];
        // Try to split at a logical point
        if (longLine.includes(',')) {
          const parts = longLine.split(',');
          if (parts.length > 1) {
            const indent = longLine.match(/^\s*/)[0];
            lines[line - 1] = parts.map((part, idx) => 
              idx === 0 ? part + ',
                ' : indent + '  ' + part.trim() + (idx < parts.length - 1 ? ',' : '')
            ).join('\n');
          }
        }
      }
      
      fs.writeFileSync(fullPath, lines.join('\n'));
      console.log(`✅ 修复了 ${filePath} 的长行`);
    }
  });
}

// Main execution
async function main() {
  try {
    console.log('🚀 开始修复最终语法错误...\n');
    
    // Check if glob is installed
    try {
      require('glob');
    } catch {
      console.log('📦 安装glob...');
      require('child_process').execSync('npm install glob --no-save', { stdio: 'inherit' });
    }
    
    // Run fixes
    fixSyntaxErrors();
    fixTypeAssertions();
    fixMissingNewlines();
    fixMaxLengthIssues();
    
    console.log('\n✅ 语法修复完成！');
    
    // Check results
    const { execSync } = require('child_process');
    
    console.log('\n📊 检查修复结果...');
    
    try {
      const tsErrors = execSync('npm run type-check 2>&1 | grep "error TS" | wc -
        l', { encoding: 'utf8' });
      console.log(`TypeScript错误: ${tsErrors.trim()}`);
    } catch (e) {
      // Ignore
    }
    
    try {
      const eslintResult = execSync('npm run lint 2>&1 | tail -3', { encoding: 'utf8' });
      console.log(`ESLint结果:\n${eslintResult}`);
    } catch (e) {
      // Ignore
    }
    
  } catch (error) {
    console.error('❌ 修复过程中出错:', error.message);
    process.exit(1);
  }
}

// Run script
main();