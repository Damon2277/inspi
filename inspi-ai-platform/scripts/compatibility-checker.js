#!/usr/bin/env node

/**
 * 版本兼容性检查器
 * 实现API变更检测、破坏性变更提醒和兼容性报告生成
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CompatibilityChecker {
  constructor() {
    this.projectRoot = process.cwd();
    this.packageJsonPath = path.join(this.projectRoot, 'package.json');
    this.apiDocsPath = path.join(this.projectRoot, 'src/app/api');
    this.typesPath = path.join(this.projectRoot, 'src/types');
    this.reportsDir = path.join(this.projectRoot, 'reports');
  }

  /**
   * 获取当前版本信息
   */
  getCurrentVersion() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      return packageJson.version;
    } catch (error) {
      throw new Error(`无法读取当前版本: ${error.message}`);
    }
  }

  /**
   * 获取上一个版本的标签
   */
  getPreviousVersion() {
    try {
      const tags = execSync('git tag --sort=-version:refname', { encoding: 'utf8' })
        .trim()
        .split('\n')
        .filter(tag => tag.startsWith('v'));
      
      return tags.length > 0 ? tags[0] : null;
    } catch (error) {
      console.warn('无法获取上一个版本标签:', error.message);
      return null;
    }
  }

  /**
   * 检测API文件变更
   */
  detectAPIChanges(fromVersion = null) {
    const changes = {
      added: [],
      modified: [],
      removed: [],
      breaking: []
    };

    try {
      // 如果没有指定版本，使用上一个标签
      const compareFrom = fromVersion ? `v${fromVersion}` : this.getPreviousVersion();
      
      if (!compareFrom) {
        console.log('没有找到可比较的版本，跳过API变更检测');
        return changes;
      }

      // 获取API文件变更
      const gitDiff = execSync(
        `git diff --name-status ${compareFrom}..HEAD -- src/app/api/ src/types/`,
        { encoding: 'utf8' }
      ).trim();

      if (!gitDiff) {
        console.log('没有检测到API相关文件变更');
        return changes;
      }

      const lines = gitDiff.split('\n');
      
      for (const line of lines) {
        const [status, filePath] = line.split('\t');
        
        switch (status) {
          case 'A':
            changes.added.push(filePath);
            break;
          case 'M':
            changes.modified.push(filePath);
            // 检查是否为破坏性变更
            if (this.isBreakingChange(filePath, compareFrom)) {
              changes.breaking.push({
                file: filePath,
                type: 'modification',
                description: '检测到可能的破坏性API变更'
              });
            }
            break;
          case 'D':
            changes.removed.push(filePath);
            changes.breaking.push({
              file: filePath,
              type: 'removal',
              description: 'API文件被删除，可能导致破坏性变更'
            });
            break;
        }
      }

    } catch (error) {
      console.warn('检测API变更时出错:', error.message);
    }

    return changes;
  }

  /**
   * 检查文件是否包含破坏性变更
   */
  isBreakingChange(filePath, compareFrom) {
    try {
      // 获取文件的具体变更内容
      const diff = execSync(
        `git diff ${compareFrom}..HEAD -- ${filePath}`,
        { encoding: 'utf8' }
      );

      // 检查破坏性变更的模式
      const breakingPatterns = [
        /^-.*export.*function/m,  // 删除导出的函数
        /^-.*export.*interface/m, // 删除导出的接口
        /^-.*export.*type/m,      // 删除导出的类型
        /^-.*export.*class/m,     // 删除导出的类
        /^-.*\..*:/m,             // 删除对象属性
        /BREAKING CHANGE/i,       // 明确标记的破坏性变更
        /^-.*required/m,          // 删除必需属性
      ];

      return breakingPatterns.some(pattern => pattern.test(diff));
    } catch (error) {
      console.warn(`检查文件 ${filePath} 的破坏性变更时出错:`, error.message);
      return false;
    }
  }

  /**
   * 分析提交信息中的破坏性变更
   */
  analyzeCommitBreakingChanges(fromVersion = null) {
    const breakingChanges = [];

    try {
      const compareFrom = fromVersion ? `v${fromVersion}` : this.getPreviousVersion();
      
      if (!compareFrom) {
        return breakingChanges;
      }

      // 获取提交历史
      const commits = execSync(
        `git log ${compareFrom}..HEAD --oneline --no-merges`,
        { encoding: 'utf8' }
      ).trim();

      if (!commits) {
        return breakingChanges;
      }

      const commitLines = commits.split('\n');
      
      for (const commit of commitLines) {
        const [hash, ...messageParts] = commit.split(' ');
        const message = messageParts.join(' ');

        // 检查破坏性变更标记
        if (message.includes('BREAKING CHANGE') || message.includes('!:')) {
          breakingChanges.push({
            hash: hash,
            message: message,
            type: 'commit',
            description: '提交信息中标记的破坏性变更'
          });
        }

        // 检查可能的破坏性变更关键词
        const breakingKeywords = [
          'remove', 'delete', 'drop', 'deprecate',
          '删除', '移除', '废弃', '不兼容'
        ];

        if (breakingKeywords.some(keyword => 
          message.toLowerCase().includes(keyword.toLowerCase())
        )) {
          breakingChanges.push({
            hash: hash,
            message: message,
            type: 'potential',
            description: '可能包含破坏性变更的提交'
          });
        }
      }

    } catch (error) {
      console.warn('分析提交破坏性变更时出错:', error.message);
    }

    return breakingChanges;
  }

  /**
   * 检查版本号是否符合语义化版本规范
   */
  validateVersionBump(currentVersion, newVersion, hasBreakingChanges) {
    const current = this.parseVersion(currentVersion);
    const next = this.parseVersion(newVersion);

    const warnings = [];
    const errors = [];

    // 检查破坏性变更是否需要主版本升级
    if (hasBreakingChanges && next.major === current.major) {
      errors.push({
        type: 'version_mismatch',
        message: '检测到破坏性变更，但主版本号未升级',
        suggestion: `建议升级到 ${current.major + 1}.0.0`
      });
    }

    // 检查版本号递增是否合理
    if (next.major > current.major) {
      if (next.minor !== 0 || next.patch !== 0) {
        warnings.push({
          type: 'version_format',
          message: '主版本升级时，次版本和修订版本应重置为0',
          suggestion: `建议使用 ${next.major}.0.0`
        });
      }
    } else if (next.minor > current.minor) {
      if (next.patch !== 0) {
        warnings.push({
          type: 'version_format',
          message: '次版本升级时，修订版本应重置为0',
          suggestion: `建议使用 ${next.major}.${next.minor}.0`
        });
      }
    }

    return { warnings, errors };
  }

  /**
   * 解析版本号
   */
  parseVersion(version) {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) {
      throw new Error(`无效的版本号格式: ${version}`);
    }
    
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4] || null
    };
  }

  /**
   * 生成兼容性报告
   */
  generateCompatibilityReport(apiChanges, commitBreakingChanges, versionValidation) {
    const report = {
      timestamp: new Date().toISOString(),
      version: this.getCurrentVersion(),
      previousVersion: this.getPreviousVersion(),
      summary: {
        hasBreakingChanges: false,
        riskLevel: 'low', // low, medium, high
        recommendedAction: 'proceed'
      },
      apiChanges: apiChanges,
      breakingChanges: {
        fromCommits: commitBreakingChanges,
        fromAPI: apiChanges.breaking
      },
      versionValidation: versionValidation,
      recommendations: [],
      migrationGuide: []
    };

    // 计算风险级别
    const totalBreaking = commitBreakingChanges.length + apiChanges.breaking.length;
    const hasErrors = versionValidation.errors.length > 0;

    if (totalBreaking > 0 || hasErrors) {
      report.summary.hasBreakingChanges = true;
      
      if (hasErrors || totalBreaking > 3) {
        report.summary.riskLevel = 'high';
        report.summary.recommendedAction = 'review_required';
      } else if (totalBreaking > 1) {
        report.summary.riskLevel = 'medium';
        report.summary.recommendedAction = 'caution';
      }
    }

    // 生成建议
    if (report.summary.hasBreakingChanges) {
      report.recommendations.push('检测到破坏性变更，建议仔细审查变更内容');
      report.recommendations.push('确保版本号符合语义化版本规范');
      report.recommendations.push('为用户提供详细的迁移指南');
    }

    if (versionValidation.errors.length > 0) {
      report.recommendations.push('修复版本号验证错误后再发布');
    }

    if (apiChanges.removed.length > 0) {
      report.recommendations.push('API文件被删除，请确认这是预期的变更');
    }

    // 生成迁移指南
    if (apiChanges.breaking.length > 0) {
      report.migrationGuide.push('## API变更迁移指南');
      apiChanges.breaking.forEach(change => {
        report.migrationGuide.push(`- **${change.file}**: ${change.description}`);
      });
    }

    if (commitBreakingChanges.length > 0) {
      report.migrationGuide.push('## 破坏性变更详情');
      commitBreakingChanges.forEach(change => {
        report.migrationGuide.push(`- **${change.hash}**: ${change.message}`);
      });
    }

    return report;
  }

  /**
   * 保存兼容性报告
   */
  saveCompatibilityReport(report) {
    try {
      // 确保报告目录存在
      if (!fs.existsSync(this.reportsDir)) {
        fs.mkdirSync(this.reportsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `compatibility-report-${report.version}-${timestamp}.json`;
      const filePath = path.join(this.reportsDir, fileName);

      fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
      console.log(`✅ 兼容性报告已保存: ${fileName}`);

      // 同时生成可读的Markdown报告
      this.generateMarkdownReport(report);

      return filePath;
    } catch (error) {
      throw new Error(`保存兼容性报告失败: ${error.message}`);
    }
  }

  /**
   * 生成Markdown格式的兼容性报告
   */
  generateMarkdownReport(report) {
    let markdown = `# 版本兼容性报告\n\n`;
    markdown += `**版本**: ${report.version}\n`;
    markdown += `**上一版本**: ${report.previousVersion || 'N/A'}\n`;
    markdown += `**生成时间**: ${new Date(report.timestamp).toLocaleString('zh-CN')}\n`;
    markdown += `**风险级别**: ${report.summary.riskLevel.toUpperCase()}\n\n`;

    // 摘要
    markdown += `## 📊 兼容性摘要\n\n`;
    markdown += `- **破坏性变更**: ${report.summary.hasBreakingChanges ? '是' : '否'}\n`;
    markdown += `- **建议操作**: ${report.summary.recommendedAction}\n`;
    markdown += `- **API文件变更**: ${report.apiChanges.added.length +
      report.apiChanges.modified.length + report.apiChanges.removed.length} 个\n`;
    markdown += `- **破坏性变更数量**:
      ${report.breakingChanges.fromCommits.length + report.breakingChanges.fromAPI.length} 个\n\n`;

    // API变更详情
    if (report.apiChanges.added.length > 0 ||
      report.apiChanges.modified.length > 0 || report.apiChanges.removed.length > 0) {
      markdown += `## 🔄 API变更详情\n\n`;
      
      if (report.apiChanges.added.length > 0) {
        markdown += `### ✅ 新增文件\n`;
        report.apiChanges.added.forEach(file => {
          markdown += `- ${file}\n`;
        });
        markdown += '\n';
      }

      if (report.apiChanges.modified.length > 0) {
        markdown += `### 📝 修改文件\n`;
        report.apiChanges.modified.forEach(file => {
          markdown += `- ${file}\n`;
        });
        markdown += '\n';
      }

      if (report.apiChanges.removed.length > 0) {
        markdown += `### ❌ 删除文件\n`;
        report.apiChanges.removed.forEach(file => {
          markdown += `- ${file}\n`;
        });
        markdown += '\n';
      }
    }

    // 破坏性变更
    if (report.summary.hasBreakingChanges) {
      markdown += `## ⚠️ 破坏性变更\n\n`;
      
      if (report.breakingChanges.fromAPI.length > 0) {
        markdown += `### API层面的破坏性变更\n`;
        report.breakingChanges.fromAPI.forEach(change => {
          markdown += `- **${change.file}**: ${change.description}\n`;
        });
        markdown += '\n';
      }

      if (report.breakingChanges.fromCommits.length > 0) {
        markdown += `### 提交中的破坏性变更\n`;
        report.breakingChanges.fromCommits.forEach(change => {
          markdown += `- **${change.hash}**: ${change.message}\n`;
        });
        markdown += '\n';
      }
    }

    // 版本验证结果
    if (report.versionValidation.errors.length > 0 ||
      report.versionValidation.warnings.length > 0) {
      markdown += `## 🔍 版本验证结果\n\n`;
      
      if (report.versionValidation.errors.length > 0) {
        markdown += `### ❌ 错误\n`;
        report.versionValidation.errors.forEach(error => {
          markdown += `- **${error.type}**: ${error.message}\n`;
          if (error.suggestion) {
            markdown += `  - 建议: ${error.suggestion}\n`;
          }
        });
        markdown += '\n';
      }

      if (report.versionValidation.warnings.length > 0) {
        markdown += `### ⚠️ 警告\n`;
        report.versionValidation.warnings.forEach(warning => {
          markdown += `- **${warning.type}**: ${warning.message}\n`;
          if (warning.suggestion) {
            markdown += `  - 建议: ${warning.suggestion}\n`;
          }
        });
        markdown += '\n';
      }
    }

    // 建议
    if (report.recommendations.length > 0) {
      markdown += `## 💡 建议\n\n`;
      report.recommendations.forEach(rec => {
        markdown += `- ${rec}\n`;
      });
      markdown += '\n';
    }

    // 迁移指南
    if (report.migrationGuide.length > 0) {
      markdown += `## 📋 迁移指南\n\n`;
      report.migrationGuide.forEach(guide => {
        markdown += `${guide}\n`;
      });
      markdown += '\n';
    }

    // 保存Markdown报告
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `compatibility-report-${report.version}-${timestamp}.md`;
    const filePath = path.join(this.reportsDir, fileName);
    
    fs.writeFileSync(filePath, markdown);
    console.log(`✅ Markdown报告已保存: ${fileName}`);
  }

  /**
   * 执行完整的兼容性检查
   */
  async checkCompatibility(options = {}) {
    console.log('🔍 开始版本兼容性检查...\n');

    try {
      const currentVersion = this.getCurrentVersion();
      const previousVersion = this.getPreviousVersion();

      console.log(`当前版本: ${currentVersion}`);
      console.log(`上一版本: ${previousVersion || 'N/A'}\n`);

      // 1. 检测API变更
      console.log('1. 检测API文件变更...');
      const apiChanges = this.detectAPIChanges(options.fromVersion);
      console.log(`   新增: ${apiChanges.added.length} 个文件`);
      console.log(`   修改: ${apiChanges.modified.length} 个文件`);
      console.log(`   删除: ${apiChanges.removed.length} 个文件`);
      console.log(`   破坏性变更: ${apiChanges.breaking.length} 个\n`);

      // 2. 分析提交中的破坏性变更
      console.log('2. 分析提交中的破坏性变更...');
      const commitBreakingChanges = this.analyzeCommitBreakingChanges(options.fromVersion);
      console.log(`   发现: ${commitBreakingChanges.length} 个潜在破坏性变更\n`);

      // 3. 验证版本号
      console.log('3. 验证版本号规范...');
      const hasBreaking = apiChanges.breaking.length > 0 || 
                         commitBreakingChanges.some(c => c.type === 'commit');
      const versionValidation = options.newVersion ? 
        this.validateVersionBump(currentVersion, options.newVersion, hasBreaking) :
        { warnings: [], errors: [] };
      
      console.log(`   警告: ${versionValidation.warnings.length} 个`);
      console.log(`   错误: ${versionValidation.errors.length} 个\n`);

      // 4. 生成兼容性报告
      console.log('4. 生成兼容性报告...');
      const report = this.generateCompatibilityReport(
        apiChanges,
        commitBreakingChanges,
        versionValidation
      );

      // 5. 保存报告
      const reportPath = this.saveCompatibilityReport(report);

      // 6. 显示结果摘要
      console.log('\n📋 兼容性检查结果:');
      console.log(`   风险级别: ${report.summary.riskLevel.toUpperCase()}`);
      console.log(`   破坏性变更: ${report.summary.hasBreakingChanges ? '是' : '否'}`);
      console.log(`   建议操作: ${report.summary.recommendedAction}`);

      if (report.summary.hasBreakingChanges) {
        console.log('\n⚠️  检测到破坏性变更，请仔细审查！');
        if (report.recommendations.length > 0) {
          console.log('\n💡 建议:');
          report.recommendations.forEach(rec => {
            console.log(`   - ${rec}`);
          });
        }
      } else {
        console.log('\n✅ 未检测到破坏性变更，可以安全发布');
      }

      return report;

    } catch (error) {
      console.error('\n❌ 兼容性检查失败:', error.message);
      throw error;
    }
  }
}

// 命令行接口
function main() {
  const args = process.argv.slice(2);
  const checker = new CompatibilityChecker();

  const options = {};
  
  // 解析命令行参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--from-version':
        options.fromVersion = args[++i];
        break;
      case '--new-version':
        options.newVersion = args[++i];
        break;
      case '--help':
        console.log('📋 版本兼容性检查器使用说明:\n');
        console.log('基本用法:');
        console.log('  node scripts/compatibility-checker.js\n');
        console.log('选项:');
        console.log('  --from-version <version>  指定比较的起始版本');
        console.log('  --new-version <version>   指定新版本号进行验证');
        console.log('  --help                    显示帮助信息\n');
        console.log('示例:');
        console.log('  node scripts/compatibility-checker.js --from-
          version 1.0.0 --new-version 2.0.0');
        return;
    }
  }

  // 执行兼容性检查
  checker.checkCompatibility(options)
    .then(report => {
      // 根据风险级别设置退出码
      if (report.summary.riskLevel === 'high' || report.versionValidation.errors.length > 0) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('兼容性检查失败:', error.message);
      process.exit(1);
    });
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = CompatibilityChecker;