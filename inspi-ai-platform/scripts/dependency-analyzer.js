#!/usr/bin/env node
/**
 * 依赖关系分析器
 * 扫描项目中的依赖问题并生成修复建议
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DependencyAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.issues = [];
    this.fixes = [];
  }

  /**
   * 运行完整的依赖分析
   */
  async analyze() {
    console.log('🔍 开始依赖关系分析...\n');

    // 1. 检查package.json
    this.analyzePackageJson();

    // 2. 扫描导入语句
    this.scanImports();

    // 3. 检查构建错误
    await this.checkBuildErrors();

    // 4. 生成报告
    this.generateReport();

    // 5. 应用修复
    this.applyFixes();
  }

  /**
   * 分析package.json
   */
  analyzePackageJson() {
    console.log('📦 分析package.json...');
    
    const packagePath = path.join(this.projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    // 检查缺失的依赖
    const requiredDeps = [
      '@heroicons/react',
      'next-auth',
      '@types/next-auth'
    ];

    requiredDeps.forEach(dep => {
      if (!packageJson.dependencies[dep] && !packageJson.devDependencies[dep]) {
        this.issues.push({
          type: 'missing_dependency',
          message: `缺失依赖: ${dep}`,
          fix: `npm install ${dep}`
        });
      }
    });

    console.log(`✓ package.json分析完成，发现 ${this.issues.length} 个问题\n`);
  }

  /**
   * 扫描导入语句
   */
  scanImports() {
    console.log('🔎 扫描导入语句...');
    
    const srcDir = path.join(this.projectRoot, 'src');
    const files = this.getAllTsFiles(srcDir);
    
    let importIssues = 0;

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // 检查默认导入vs命名导入问题
        if (line.includes('import AuthService from')) {
          this.issues.push({
            type: 'import_error',
            file: file.replace(this.projectRoot, ''),
            line: index + 1,
            message: 'AuthService应该使用命名导入',
            fix: 'import { AuthService } from'
          });
          importIssues++;
        }

        // 检查params Promise问题
        if (line.includes('params.id') && !line.includes('await params')) {
          this.issues.push({
            type: 'params_error',
            file: file.replace(this.projectRoot, ''),
            line: index + 1,
            message: 'Next.js 15中params是Promise，需要await',
            fix: 'const { id } = await params'
          });
          importIssues++;
        }
      });
    });

    console.log(`✓ 导入扫描完成，发现 ${importIssues} 个导入问题\n`);
  }

  /**
   * 检查构建错误
   */
  async checkBuildErrors() {
    console.log('🏗️ 检查构建错误...');
    
    try {
      // 尝试类型检查
      execSync('npx tsc --noEmit', { 
        cwd: this.projectRoot,
        stdio: 'pipe'
      });
      console.log('✓ TypeScript类型检查通过\n');
    } catch (error) {
      const output = error.stdout?.toString() || error.stderr?.toString() || '';
      this.parseBuildErrors(output);
      console.log(`⚠️ 发现 ${this.issues.filter(i => i.type === 'build_error').length} 个构建错误\n`);
    }
  }

  /**
   * 解析构建错误
   */
  parseBuildErrors(output) {
    const lines = output.split('\n');
    
    lines.forEach(line => {
      if (line.includes('error TS')) {
        // TypeScript错误
        const match = line.match(/(.+\.tsx?)\((\d+),(\d+)\): error TS\d+: (.+)/);
        if (match) {
          this.issues.push({
            type: 'build_error',
            file: match[1],
            line: match[2],
            column: match[3],
            message: match[4],
            fix: this.suggestFix(match[4])
          });
        }
      }
    });
  }

  /**
   * 建议修复方案
   */
  suggestFix(errorMessage) {
    if (errorMessage.includes('implicitly has an \'any\' type')) {
      return '添加明确的类型注解';
    }
    if (errorMessage.includes('Cannot find module')) {
      return '检查模块路径或安装缺失的依赖';
    }
    if (errorMessage.includes('Property does not exist')) {
      return '检查属性名称或类型定义';
    }
    return '请手动检查并修复';
  }

  /**
   * 获取所有TypeScript文件
   */
  getAllTsFiles(dir) {
    const files = [];
    
    const scan = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scan(fullPath);
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
          files.push(fullPath);
        }
      });
    };
    
    scan(dir);
    return files;
  }

  /**
   * 生成分析报告
   */
  generateReport() {
    console.log('📊 生成依赖分析报告...\n');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: this.issues.length,
        byType: this.groupIssuesByType()
      },
      issues: this.issues,
      recommendations: this.generateRecommendations()
    };

    // 保存报告
    const reportPath = path.join(this.projectRoot, 'dependency-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // 打印摘要
    console.log('📋 分析摘要:');
    console.log(`   总问题数: ${report.summary.totalIssues}`);
    Object.entries(report.summary.byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}个`);
    });
    console.log(`\n📄 详细报告已保存到: ${reportPath}\n`);
  }

  /**
   * 按类型分组问题
   */
  groupIssuesByType() {
    const groups = {};
    this.issues.forEach(issue => {
      groups[issue.type] = (groups[issue.type] || 0) + 1;
    });
    return groups;
  }

  /**
   * 生成修复建议
   */
  generateRecommendations() {
    const recommendations = [];

    // 依赖问题建议
    const missingDeps = this.issues.filter(i => i.type === 'missing_dependency');
    if (missingDeps.length > 0) {
      recommendations.push({
        priority: 'high',
        title: '安装缺失的依赖',
        description: '项目缺少必要的依赖包，需要立即安装',
        commands: missingDeps.map(dep => dep.fix)
      });
    }

    // 导入问题建议
    const importErrors = this.issues.filter(i => i.type === 'import_error');
    if (importErrors.length > 0) {
      recommendations.push({
        priority: 'medium',
        title: '修复导入语句',
        description: '存在导入语句错误，需要手动修复',
        files: [...new Set(importErrors.map(e => e.file))]
      });
    }

    // 构建问题建议
    const buildErrors = this.issues.filter(i => i.type === 'build_error');
    if (buildErrors.length > 0) {
      recommendations.push({
        priority: 'high',
        title: '修复构建错误',
        description: '存在TypeScript构建错误，阻止项目编译',
        files: [...new Set(buildErrors.map(e => e.file))]
      });
    }

    return recommendations;
  }

  /**
   * 应用自动修复
   */
  applyFixes() {
    console.log('🔧 应用自动修复...\n');

    let fixedCount = 0;

    // 安装缺失的依赖
    const missingDeps = this.issues.filter(i => i.type === 'missing_dependency');
    if (missingDeps.length > 0) {
      console.log('📦 安装缺失的依赖...');
      const depsToInstall = missingDeps.map(dep => 
        dep.message.replace('缺失依赖: ', '')
      );
      
      try {
        execSync(`npm install ${depsToInstall.join(' ')}`, {
          cwd: this.projectRoot,
          stdio: 'inherit'
        });
        fixedCount += missingDeps.length;
        console.log(`✓ 已安装 ${depsToInstall.length} 个依赖\n`);
      } catch (error) {
        console.log(`❌ 依赖安装失败: ${error.message}\n`);
      }
    }

    // 修复简单的导入问题
    const importErrors = this.issues.filter(i => i.type === 'import_error');
    importErrors.forEach(issue => {
      if (issue.message.includes('AuthService应该使用命名导入')) {
        this.fixAuthServiceImport(issue.file);
        fixedCount++;
      }
    });

    console.log(`✅ 自动修复完成，共修复 ${fixedCount} 个问题\n`);
    
    if (fixedCount < this.issues.length) {
      console.log(`⚠️ 还有 ${this.issues.length - fixedCount} 个问题需要手动修复`);
      console.log('请查看生成的报告文件获取详细信息\n');
    }
  }

  /**
   * 修复AuthService导入
   */
  fixAuthServiceImport(filePath) {
    const fullPath = path.join(this.projectRoot, filePath);
    if (!fs.existsSync(fullPath)) return;

    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(
      /import AuthService from '@\/core\/auth\/auth-service'/g,
      "import { AuthService } from '@/core/auth/auth-service'"
    );
    
    fs.writeFileSync(fullPath, content);
    console.log(`✓ 修复了 ${filePath} 中的AuthService导入`);
  }
}

// 运行分析器
if (require.main === module) {
  const analyzer = new DependencyAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = DependencyAnalyzer;