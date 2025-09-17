#!/usr/bin/env node

/**
 * 项目清理脚本 - 清理冗余和临时文件
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 开始清理项目冗余文件...\n');

// 需要清理的临时文件和目录
const filesToClean = [
  // 测试报告文件
  'COMPREHENSIVE_TEST_REPORT.json',
  'SELF_TEST_REPORT.json',
  
  // 临时测试文件
  'test-p0-apis.js',
  'test-p0-tasks.js',
  'run-unit-tests.js',
  
  // 重复的完成报告
  'P0_COMPLETION_REPORT.md',
  
  // 设计图片文件（应该移到docs目录）
  'design-system-create.png',
  'design-system-homepage.png',
  
  // 临时配置文件
  'compatibility.config.js',
];

const directoriesToClean = [
  // 构建缓存目录
  '.next',
  '.swc',
  
  // 测试结果目录
  'test-results',
  'playwright-report',
  
  // 报告目录中的临时文件
  'reports',
];

let cleanedFiles = 0;
let cleanedDirs = 0;

// 清理文件
filesToClean.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ 删除文件: ${file}`);
      cleanedFiles++;
    } catch (error) {
      console.log(`❌ 删除失败: ${file} - ${error.message}`);
    }
  }
});

// 清理目录
directoriesToClean.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ 删除目录: ${dir}`);
      cleanedDirs++;
    } catch (error) {
      console.log(`❌ 删除失败: ${dir} - ${error.message}`);
    }
  }
});

// 清理node_modules中的缓存
const nodeModulesCaches = [
  'node_modules/.cache',
  'node_modules/.vite',
];

nodeModulesCaches.forEach(cache => {
  const cachePath = path.join(__dirname, '..', cache);
  if (fs.existsSync(cachePath)) {
    try {
      fs.rmSync(cachePath, { recursive: true, force: true });
      console.log(`✅ 清理缓存: ${cache}`);
      cleanedDirs++;
    } catch (error) {
      console.log(`❌ 清理失败: ${cache} - ${error.message}`);
    }
  }
});

// 整理文档文件
const docsDir = path.join(__dirname, '..', 'docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
  console.log('✅ 创建docs目录');
}

// 移动设计图片到docs目录
const designImages = ['design-system-create.png', 'design-system-homepage.png'];
designImages.forEach(image => {
  const srcPath = path.join(__dirname, '..', image);
  const destPath = path.join(docsDir, image);
  if (fs.existsSync(srcPath)) {
    try {
      fs.renameSync(srcPath, destPath);
      console.log(`✅ 移动文件: ${image} → docs/`);
    } catch (error) {
      console.log(`❌ 移动失败: ${image} - ${error.message}`);
    }
  }
});

// 创建.gitignore条目确保临时文件不被提交
const gitignorePath = path.join(__dirname, '..', '.gitignore');
const additionalIgnores = `
# 测试报告和临时文件
*_TEST_REPORT.json
*_REPORT.json
test-*.js
run-*.js

# 构建和缓存目录
.next/
.swc/
test-results/
playwright-report/
reports/*.json

# IDE和编辑器文件
.vscode/settings.json
.idea/
*.swp
*.swo

# 临时文件
*.tmp
*.temp
.DS_Store
Thumbs.db
`;

if (fs.existsSync(gitignorePath)) {
  const currentContent = fs.readFileSync(gitignorePath, 'utf8');
  if (!currentContent.includes('# 测试报告和临时文件')) {
    fs.appendFileSync(gitignorePath, additionalIgnores);
    console.log('✅ 更新.gitignore文件');
  }
}

console.log(`\n📊 清理完成:`);
console.log(`✅ 删除文件: ${cleanedFiles}个`);
console.log(`✅ 删除目录: ${cleanedDirs}个`);
console.log(`🎯 项目已清理完成，准备进行集成测试\n`);