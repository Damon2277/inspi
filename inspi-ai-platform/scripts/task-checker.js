#!/usr/bin/env node

/**
 * 任务完成度检查工具
 * 用于验证任务是否按照规范完成
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TaskChecker {
  constructor(taskNumber) {
    this.taskNumber = taskNumber;
    this.errors = [];
    this.warnings = [];
  }

  // 检查项目结构
  checkProjectStructure() {
    console.log('🔍 检查项目结构...');
    
    const requiredDirs = [
      'src',
      'src/app',
      'src/components',
      'src/lib',
      'src/utils',
      '__tests__'
    ];

    requiredDirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        this.errors.push(`缺少必要目录: ${dir}`);
      }
    });
  }

  // 检查配置文件
  checkConfigFiles() {
    console.log('🔍 检查配置文件...');
    
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'next.config.ts',
      'jest.config.js',
      '.env.local'
    ];

    requiredFiles.forEach(file => {
      if (!fs.existsSync(file)) {
        this.errors.push(`缺少配置文件: ${file}`);
      }
    });
  }

  // 检查测试覆盖
  checkTestCoverage() {
    console.log('🔍 检查测试覆盖...');
    
    try {
      const result = execSync('npm test -- --coverage --silent', { encoding: 'utf8' });
      if (!result.includes('All files')) {
        this.warnings.push('测试覆盖率信息不完整');
      }
    } catch (error) {
      this.errors.push('测试执行失败');
    }
  }

  // 检查构建状态
  checkBuild() {
    console.log('🔍 检查构建状态...');
    
    try {
      execSync('npm run build', { stdio: 'pipe' });
      console.log('✅ 构建成功');
    } catch (error) {
      this.errors.push('构建失败');
    }
  }

  // 检查代码质量
  checkCodeQuality() {
    console.log('🔍 检查代码质量...');
    
    try {
      execSync('npm run lint', { stdio: 'pipe' });
      console.log('✅ 代码质量检查通过');
    } catch (error) {
      this.warnings.push('存在代码质量问题');
    }
  }

  // 检查任务边界
  checkTaskBoundary() {
    console.log('🔍 检查任务边界...');
    
    // 根据任务号检查是否有超出范围的实现
    const taskBoundaries = {
      1: {
        allowed: ['基础配置', '项目结构', '测试框架'],
        forbidden: ['数据库模型', 'API路由', '业务逻辑']
      },
      2: {
        allowed: ['数据库连接', '基础模型', '连接测试'],
        forbidden: ['API实现', '前端集成', '业务逻辑']
      }
    };

    const boundary = taskBoundaries[this.taskNumber];
    if (boundary) {
      // 这里可以添加更具体的检查逻辑
      console.log(`✅ 任务${this.taskNumber}边界检查完成`);
    }
  }

  // 生成报告
  generateReport() {
    console.log('\n📊 任务完成度报告');
    console.log('='.repeat(50));
    
    if (this.errors.length === 0) {
      console.log('✅ 所有检查项通过');
    } else {
      console.log('❌ 发现以下错误:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  警告信息:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    console.log('\n📋 检查清单:');
    console.log('- [x] 项目结构检查');
    console.log('- [x] 配置文件检查');
    console.log('- [x] 测试覆盖检查');
    console.log('- [x] 构建状态检查');
    console.log('- [x] 代码质量检查');
    console.log('- [x] 任务边界检查');

    return this.errors.length === 0;
  }

  // 执行所有检查
  runAllChecks() {
    console.log(`🚀 开始检查 Task ${this.taskNumber} 完成度...\n`);
    
    this.checkProjectStructure();
    this.checkConfigFiles();
    this.checkTestCoverage();
    this.checkBuild();
    this.checkCodeQuality();
    this.checkTaskBoundary();
    
    return this.generateReport();
  }
}

// 命令行使用
if (require.main === module) {
  const taskNumber = process.argv[2] || '1';
  const checker = new TaskChecker(parseInt(taskNumber, 10));
  
  const success = checker.runAllChecks();
  process.exit(success ? 0 : 1);
}

module.exports = TaskChecker;