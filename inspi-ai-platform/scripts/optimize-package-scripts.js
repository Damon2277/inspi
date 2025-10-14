#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 读取当前的 package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 定义优化后的脚本
const optimizedScripts = {
  // 核心开发脚本
  "dev": "next dev --turbopack --port 3000",
  "build": "next build --turbopack",
  "build:analyze": "ANALYZE=true next build --turbopack",
  "start": "next start",
  "start:prod": "NODE_ENV=production next start",
  
  // 代码质量
  "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
  "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "type-check": "tsc --noEmit",
  "type-check:watch": "tsc --noEmit --watch",
  
  // 清理
  "clean": "rm -rf .next out dist coverage",
  "clean:all": "npm run clean && rm -rf node_modules && npm install",
  
  // 验证
  "validate": "npm run type-check && npm run lint && npm run format:check",
  "pre-commit": "npm run validate && npm run test:unit",
  
  // 测试 - 简化版本
  "test": "jest",
  "test:unit": "jest --config jest.config.unit.js",
  "test:integration": "jest --config jest.config.integration.js",
  "test:e2e": "playwright test",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e",
  "test:ci": "npm run test:all --ci --coverage --watchAll=false",
  
  // 构建验证
  "build:verify": "npm run validate && npm run build",
  "build:production": "npm run validate && npm run test:unit && npm run build",
  
  // 开发工具
  "dev:check": "npm run type-check && npm run lint",
  "dev:test": "npm run test:watch",
  
  // 版本管理 - 保留核心功能
  "version:bump": "node scripts/bump-version.js",
  "version:major": "node scripts/bump-version.js major",
  "version:minor": "node scripts/bump-version.js minor",
  "version:patch": "node scripts/bump-version.js patch",
  
  // 发布
  "release": "npm run build:production && npm run version:bump",
  "release:patch": "npm run build:production && npm run version:patch",
  "release:minor": "npm run build:production && npm run version:minor",
  "release:major": "npm run build:production && npm run version:major",
  
  // 依赖分析
  "deps:analyze": "node scripts/analyze-dependencies.js",
  "deps:update": "npm update && npm audit fix",
  
  // Git 提交助手
  "commit:feat": "git add . && git commit -m 'feat: '",
  "commit:fix": "git add . && git commit -m 'fix: '",
  "commit:docs": "git add . && git commit -m 'docs: '",
  "commit:refactor": "git add . && git commit -m 'refactor: '",
  "commit:test": "git add . && git commit -m 'test: '",
  "commit:chore": "git add . && git commit -m 'chore: '"
};

// 备份原始文件
const backupPath = packageJsonPath + '.backup';
fs.writeFileSync(backupPath, JSON.stringify(packageJson, null, 2));

// 更新脚本
packageJson.scripts = optimizedScripts;

// 写入优化后的 package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('✅ Package.json 脚本已优化!');
console.log(`📦 原始文件已备份到: ${backupPath}`);
console.log(`🔧 脚本数量: ${Object.keys(packageJson.scripts).length} (原来:
  ${Object.keys(JSON.parse(fs.readFileSync(backupPath, 'utf8')).scripts).length})`);
console.log('\n主要变更:');
console.log('- 移除了重复和过于复杂的测试脚本');
console.log('- 简化了版本管理脚本');
console.log('- 保留了核心开发和构建脚本');
console.log('- 添加了依赖分析脚本');
console.log('- 优化了 Git 提交助手');

module.exports = { optimizedScripts };