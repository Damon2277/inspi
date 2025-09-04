#!/usr/bin/env node

/**
 * 简化的版本管理脚本
 * 支持语义化版本控制和自动化发布流程
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 版本类型定义
const VERSION_TYPES = {
  major: 'major',
  minor: 'minor', 
  patch: 'patch',
  prerelease: 'prerelease'
};

// 提交类型映射到版本升级类型
const COMMIT_TYPE_TO_VERSION = {
  'feat': 'minor',
  'fix': 'patch',
  'perf': 'patch',
  'refactor': 'patch',
  'docs': 'patch',
  'style': 'patch',
  'test': 'patch',
  'chore': 'patch',
  'BREAKING CHANGE': 'major'
};

class VersionManager {
  constructor() {
    this.packageJsonPath = path.join(process.cwd(), 'package.json');
    this.releaseNotesDir = path.join(process.cwd(), '..');
  }

  /**
   * 读取当前版本
   */
  getCurrentVersion() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      return packageJson.version;
    } catch (error) {
      throw new Error(`无法读取package.json: ${error.message}`);
    }
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
      major: parseInt(match[1]),
      minor: parseInt(match[2]),
      patch: parseInt(match[3]),
      prerelease: match[4] || null
    };
  }

  /**
   * 升级版本号
   */
  bumpVersion(currentVersion, type) {
    const parsed = this.parseVersion(currentVersion);
    
    switch (type) {
      case VERSION_TYPES.major:
        return `${parsed.major + 1}.0.0`;
      case VERSION_TYPES.minor:
        return `${parsed.major}.${parsed.minor + 1}.0`;
      case VERSION_TYPES.patch:
        return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
      case VERSION_TYPES.prerelease:
        if (parsed.prerelease) {
          const prereleaseMatch = parsed.prerelease.match(/^(.+)\.(\d+)$/);
          if (prereleaseMatch) {
            const identifier = prereleaseMatch[1];
            const number = parseInt(prereleaseMatch[2]) + 1;
            return `${parsed.major}.${parsed.minor}.${parsed.patch}-${identifier}.${number}`;
          }
        }
        return `${parsed.major}.${parsed.minor}.${parsed.patch}-beta.1`;
      default:
        throw new Error(`不支持的版本类型: ${type}`);
    }
  }

  /**
   * 更新package.json版本号
   */
  updatePackageJson(newVersion) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      packageJson.version = newVersion;
      fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`✅ 已更新package.json版本号为: ${newVersion}`);
    } catch (error) {
      throw new Error(`更新package.json失败: ${error.message}`);
    }
  }

  /**
   * 获取Git提交历史
   */
  getCommitsSinceLastTag() {
    try {
      // 获取最后一个标签
      let lastTag;
      try {
        lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
      } catch {
        // 如果没有标签，获取所有提交
        lastTag = '';
      }

      // 获取提交历史
      const command = lastTag 
        ? `git log ${lastTag}..HEAD --oneline --no-merges`
        : 'git log --oneline --no-merges';
      
      const commits = execSync(command, { encoding: 'utf8' }).trim();
      return commits ? commits.split('\n') : [];
    } catch (error) {
      console.warn(`获取提交历史失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 分析提交类型确定版本升级类型
   */
  analyzeCommitsForVersionType(commits) {
    let hasBreaking = false;
    let hasFeature = false;
    let hasFix = false;

    for (const commit of commits) {
      const message = commit.toLowerCase();
      
      if (message.includes('breaking change') || message.includes('!:')) {
        hasBreaking = true;
        break;
      }
      
      if (message.startsWith('feat')) {
        hasFeature = true;
      } else if (message.startsWith('fix')) {
        hasFix = true;
      }
    }

    if (hasBreaking) return VERSION_TYPES.major;
    if (hasFeature) return VERSION_TYPES.minor;
    if (hasFix) return VERSION_TYPES.patch;
    
    return VERSION_TYPES.patch; // 默认为patch
  }

  /**
   * 创建Git标签
   */
  createGitTag(version, message) {
    try {
      const tagName = `v${version}`;
      execSync(`git tag -a ${tagName} -m "${message}"`, { stdio: 'inherit' });
      console.log(`✅ 已创建Git标签: ${tagName}`);
      return tagName;
    } catch (error) {
      throw new Error(`创建Git标签失败: ${error.message}`);
    }
  }

  /**
   * 生成发布说明
   */
  generateReleaseNotes(version, commits) {
    const date = new Date().toISOString().split('T')[0];
    const tagName = `v${version}`;
    
    // 分类提交
    const features = [];
    const fixes = [];
    const others = [];
    
    commits.forEach(commit => {
      const message = commit.replace(/^[a-f0-9]+\s/, ''); // 移除commit hash
      
      if (message.toLowerCase().startsWith('feat')) {
        features.push(message);
      } else if (message.toLowerCase().startsWith('fix')) {
        fixes.push(message);
      } else {
        others.push(message);
      }
    });

    // 生成发布说明内容
    let releaseNotes = `# Release Notes ${tagName}\n\n`;
    releaseNotes += `**发布日期:** ${date}\n\n`;
    releaseNotes += `## 版本概述\n\n`;
    releaseNotes += `本版本包含 ${commits.length} 个提交，主要包括功能增强、问题修复和代码优化。\n\n`;

    if (features.length > 0) {
      releaseNotes += `## 🚀 新功能\n\n`;
      features.forEach(feature => {
        releaseNotes += `- ${feature}\n`;
      });
      releaseNotes += '\n';
    }

    if (fixes.length > 0) {
      releaseNotes += `## 🐛 问题修复\n\n`;
      fixes.forEach(fix => {
        releaseNotes += `- ${fix}\n`;
      });
      releaseNotes += '\n';
    }

    if (others.length > 0) {
      releaseNotes += `## 🔧 其他变更\n\n`;
      others.forEach(other => {
        releaseNotes += `- ${other}\n`;
      });
      releaseNotes += '\n';
    }

    releaseNotes += `## 📦 安装和升级\n\n`;
    releaseNotes += `\`\`\`bash\n`;
    releaseNotes += `npm install\n`;
    releaseNotes += `npm run build\n`;
    releaseNotes += `\`\`\`\n\n`;

    releaseNotes += `## 🔗 相关链接\n\n`;
    releaseNotes += `- [完整变更日志](https://github.com/your-org/inspi-ai-platform/compare/v${this.getCurrentVersion()}...${tagName})\n`;
    releaseNotes += `- [问题反馈](https://github.com/your-org/inspi-ai-platform/issues)\n\n`;

    return releaseNotes;
  }

  /**
   * 保存发布说明到文件
   */
  saveReleaseNotes(version, content) {
    try {
      const fileName = `RELEASE_NOTES_v${version}.md`;
      const filePath = path.join(this.releaseNotesDir, fileName);
      fs.writeFileSync(filePath, content);
      console.log(`✅ 已生成发布说明: ${fileName}`);
      return filePath;
    } catch (error) {
      throw new Error(`保存发布说明失败: ${error.message}`);
    }
  }

  /**
   * 检查工作目录状态
   */
  checkWorkingDirectory() {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
      if (status) {
        throw new Error('工作目录不干净，请先提交或暂存所有更改');
      }
    } catch (error) {
      if (error.message.includes('工作目录不干净')) {
        throw error;
      }
      throw new Error(`检查工作目录状态失败: ${error.message}`);
    }
  }

  /**
   * 主要的版本升级流程
   */
  async release(versionType) {
    try {
      console.log('🚀 开始版本发布流程...\n');

      // 1. 检查工作目录
      console.log('1. 检查工作目录状态...');
      this.checkWorkingDirectory();

      // 2. 获取当前版本
      console.log('2. 获取当前版本...');
      const currentVersion = this.getCurrentVersion();
      console.log(`   当前版本: ${currentVersion}`);

      // 3. 获取提交历史
      console.log('3. 分析提交历史...');
      const commits = this.getCommitsSinceLastTag();
      console.log(`   发现 ${commits.length} 个新提交`);

      // 4. 确定版本类型
      let finalVersionType = versionType;
      if (!finalVersionType) {
        finalVersionType = this.analyzeCommitsForVersionType(commits);
        console.log(`   自动检测版本类型: ${finalVersionType}`);
      }

      // 5. 计算新版本号
      console.log('4. 计算新版本号...');
      const newVersion = this.bumpVersion(currentVersion, finalVersionType);
      console.log(`   新版本: ${newVersion}`);

      // 6. 更新package.json
      console.log('5. 更新package.json...');
      this.updatePackageJson(newVersion);

      // 7. 生成发布说明
      console.log('6. 生成发布说明...');
      const releaseNotes = this.generateReleaseNotes(newVersion, commits);
      this.saveReleaseNotes(newVersion, releaseNotes);

      // 8. 提交更改
      console.log('7. 提交版本更改...');
      execSync(`git add package.json ../RELEASE_NOTES_v${newVersion}.md`, { stdio: 'inherit' });
      execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });

      // 9. 创建标签
      console.log('8. 创建Git标签...');
      const tagName = this.createGitTag(newVersion, `Release ${newVersion}`);

      console.log('\n✅ 版本发布完成!');
      console.log(`   版本: ${currentVersion} → ${newVersion}`);
      console.log(`   标签: ${tagName}`);
      console.log(`   发布说明: RELEASE_NOTES_v${newVersion}.md`);
      console.log('\n💡 下一步操作:');
      console.log(`   git push origin main ${tagName}`);

    } catch (error) {
      console.error('\n❌ 版本发布失败:', error.message);
      process.exit(1);
    }
  }
}

// 命令行接口
function main() {
  const args = process.argv.slice(2);
  const versionManager = new VersionManager();

  if (args.length === 0) {
    console.log('📋 版本管理脚本使用说明:\n');
    console.log('自动检测版本类型:');
    console.log('  node scripts/bump-version.js\n');
    console.log('指定版本类型:');
    console.log('  node scripts/bump-version.js major   # 主版本升级 (破坏性变更)');
    console.log('  node scripts/bump-version.js minor   # 次版本升级 (新功能)');
    console.log('  node scripts/bump-version.js patch   # 修订版本升级 (问题修复)');
    console.log('  node scripts/bump-version.js prerelease # 预发布版本\n');
    console.log('其他命令:');
    console.log('  node scripts/bump-version.js --version  # 显示当前版本');
    console.log('  node scripts/bump-version.js --help     # 显示帮助信息');
    return;
  }

  const command = args[0];

  switch (command) {
    case '--version':
      console.log(`当前版本: ${versionManager.getCurrentVersion()}`);
      break;
    case '--help':
      console.log('📋 版本管理脚本使用说明:\n');
      console.log('自动检测版本类型:');
      console.log('  node scripts/bump-version.js\n');
      console.log('指定版本类型:');
      console.log('  node scripts/bump-version.js major   # 主版本升级 (破坏性变更)');
      console.log('  node scripts/bump-version.js minor   # 次版本升级 (新功能)');
      console.log('  node scripts/bump-version.js patch   # 修订版本升级 (问题修复)');
      console.log('  node scripts/bump-version.js prerelease # 预发布版本\n');
      console.log('其他命令:');
      console.log('  node scripts/bump-version.js --version  # 显示当前版本');
      console.log('  node scripts/bump-version.js --help     # 显示帮助信息');
      break;
    case 'major':
    case 'minor':
    case 'patch':
    case 'prerelease':
      versionManager.release(command);
      break;
    default:
      if (command.startsWith('-')) {
        console.error(`未知选项: ${command}`);
        process.exit(1);
      } else {
        // 自动检测版本类型
        versionManager.release();
      }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = VersionManager;