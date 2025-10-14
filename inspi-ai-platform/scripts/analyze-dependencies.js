#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 读取 package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

// 获取所有源文件
function getAllFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  let files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files = files.concat(getAllFiles(fullPath, extensions));
    } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// 分析依赖使用情况
function analyzeDependencies() {
  const sourceFiles = getAllFiles('src');
  const configFiles = ['next.config.ts', 'tailwind.config.js', 'jest.config.js'];
  const allFiles = [...sourceFiles, ...configFiles.filter(f => fs.existsSync(f))];
  
  const usedDependencies = new Set();
  const unusedDependencies = [];
  const potentiallyUnused = [];
  
  // 读取所有文件内容
  let allContent = '';
  for (const file of allFiles) {
    try {
      allContent += fs.readFileSync(file, 'utf8') + '\n';
    } catch (err) {
      console.warn(`Warning: Could not read ${file}`);
    }
  }
  
  // 检查每个依赖是否被使用
  for (const [depName, version] of Object.entries(dependencies)) {
    const patterns = [
      new RegExp(`import.*from\\s+['"]${depName}['"]`, 'g'),
      new RegExp(`import\\s+['"]${depName}['"]`, 'g'),
      new RegExp(`require\\s*\\(\\s*['"]${depName}['"]\\s*\\)`, 'g'),
      new RegExp(`from\\s+['"]${depName}/`, 'g'),
      new RegExp(`import.*from\\s+['"]${depName}/`, 'g'),
    ];
    
    const isUsed = patterns.some(pattern => pattern.test(allContent));
    
    if (isUsed) {
      usedDependencies.add(depName);
    } else {
      // 特殊检查一些可能间接使用的包
      const specialChecks = {
        '@types/': depName.startsWith('@types/'),
        'eslint': allContent.includes('eslint') || fs.existsSync('.eslintrc') ||
          fs.existsSync('eslint.config.mjs'),
        'prettier': allContent.includes('prettier') || fs.existsSync('.prettierrc'),
        'jest': allContent.includes('jest') || fs.existsSync('jest.config.js'),
        'playwright': allContent.includes('playwright') || allContent.includes('@playwright'),
        'tailwindcss': allContent.includes('tailwind') || fs.existsSync('tailwind.config.js'),
        'typescript': fs.existsSync('tsconfig.json'),
        'next': allContent.includes('next/') || depName === 'next',
        'react': allContent.includes('React') || allContent.includes('jsx') || depName === 'react',
        'mongodb-memory-server': allContent.includes('MongoMemoryServer'),
        'supertest': allContent.includes('supertest'),
        'msw': allContent.includes('msw'),
      };
      
      const isSpecialCase = Object.entries(specialChecks).some(([key, condition]) => 
        depName.includes(key) && condition
      );
      
      if (isSpecialCase) {
        usedDependencies.add(depName);
      } else {
        unusedDependencies.push(depName);
      }
    }
  }
  
  return {
    used: Array.from(usedDependencies).sort(),
    unused: unusedDependencies.sort(),
    total: Object.keys(dependencies).length
  };
}

// 检查过时的依赖
function checkOutdatedDependencies() {
  try {
    const result = execSync('npm outdated --json', { encoding: 'utf8' });
    return JSON.parse(result);
  } catch (err) {
    // npm outdated 返回非零退出码当有过时依赖时
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout);
      } catch (parseErr) {
        return {};
      }
    }
    return {};
  }
}

// 主函数
function main() {
  console.log('🔍 分析项目依赖...\n');
  
  const analysis = analyzeDependencies();
  const outdated = checkOutdatedDependencies();
  
  console.log(`📊 依赖统计:`);
  console.log(`   总依赖数: ${analysis.total}`);
  console.log(`   使用中: ${analysis.used.length}`);
  console.log(`   可能未使用: ${analysis.unused.length}`);
  console.log(`   过时依赖: ${Object.keys(outdated).length}\n`);
  
  if (analysis.unused.length > 0) {
    console.log('🚨 可能未使用的依赖:');
    analysis.unused.forEach(dep => {
      const version = packageJson.dependencies[dep] || packageJson.devDependencies[dep];
      console.log(`   - ${dep}@${version}`);
    });
    console.log();
  }
  
  if (Object.keys(outdated).length > 0) {
    console.log('⚠️  过时的依赖:');
    Object.entries(outdated).forEach(([name, info]) => {
      console.log(`   - ${name}: ${info.current} → ${info.latest}`);
    });
    console.log();
  }
  
  // 检查 extraneous 包
  try {
    const lsResult = execSync('npm ls --depth=0 --json', { encoding: 'utf8' });
    const lsData = JSON.parse(lsResult);
    const extraneous = Object.keys(lsData.dependencies || {}).filter(name => 
      lsData.dependencies[name].extraneous
    );
    
    if (extraneous.length > 0) {
      console.log('🔧 多余的包 (extraneous):');
      extraneous.forEach(dep => {
        console.log(`   - ${dep}`);
      });
      console.log();
    }
  } catch (err) {
    // 忽略错误
  }
  
  console.log('✅ 分析完成!');
}

if (require.main === module) {
  main();
}

module.exports = { analyzeDependencies, checkOutdatedDependencies };