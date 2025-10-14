#!/usr/bin/env node

/**
 * 发布文档生成器
 * 实现简化的发布说明生成器，基于Git提交创建变更日志，添加版本标签描述信息
 * 需求: 5.1, 5.2, 5.5
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 提交类型配置
const COMMIT_TYPES = {
  feat: { emoji: '🚀', label: '新功能', bump: 'minor', changelog: true },
  fix: { emoji: '🐛', label: '问题修复', bump: 'patch', changelog: true },
  perf: { emoji: '⚡', label: '性能优化', bump: 'patch', changelog: true },
  refactor: { emoji: '♻️', label: '代码重构', bump: 'patch', changelog: true },
  docs: { emoji: '📚', label: '文档更新', bump: 'none', changelog: false },
  style: { emoji: '🎨', label: '代码格式', bump: 'none', changelog: false },
  test: { emoji: '✅', label: '测试相关', bump: 'none', changelog: false },
  chore: { emoji: '🔧', label: '构建/工具', bump: 'none', changelog: false },
  ci: { emoji: '👷', label: 'CI配置', bump: 'none', changelog: false },
  build: { emoji: '📦', label: '构建系统', bump: 'none', changelog: false },
  revert: { emoji: '⏪', label: '回滚变更', bump: 'patch', changelog: true }
};

// 发布说明模板
const RELEASE_TEMPLATE = {
  header: (version, date, type) => `# 🚀 Inspi AI Platform ${version} 发布说明

**发布日期**: ${date}  
**版本类型**: ${type}  
**Git标签**: \`${version}\`

## 📋 版本概述

${version} 版本包含了重要的功能更新和问题修复，提升了系统的稳定性和用户体验。`,

  features: (features) => features.length > 0 ? `

## 🚀 新功能

${features.map(f => `- ${f.emoji} **${f.scope ?
  `${f.scope}: ` : ''}${f.description}**${f.details ? `\n  ${f.details}` : ''}`).join('\n')}` : '',

  fixes: (fixes) => fixes.length > 0 ? `

## 🐛 问题修复

${fixes.map(f => `- ${f.emoji} **${f.scope ?
  `${f.scope}: ` : ''}${f.description}**${f.details ? `\n  ${f.details}` : ''}`).join('\n')}` : '',

  improvements: (improvements) => improvements.length > 0 ? `

## 🔧 改进优化

${improvements.map(i => `- ${i.emoji} **${i.scope ?
  `${i.scope}: ` : ''}${i.description}**${i.details ? `\n  ${i.details}` : ''}`).join('\n')}` : '',

  breaking: (breaking) => breaking.length > 0 ? `

## ⚠️ 破坏性变更

${breaking.map(b => `### ${b.scope ? `${b.scope}: ` : ''}${b.description}

**影响范围**: ${b.impact || '需要手动迁移'}

**迁移指南**:
${b.migration || '请参考文档进行相应调整'}

**相关提交**: ${b.hash}`).join('\n\n')}` : '',

  footer: (version, stats) => `

## 📊 版本统计

- **总提交数**: ${stats.totalCommits}
- **新功能**: ${stats.features}
- **问题修复**: ${stats.fixes}
- **性能优化**: ${stats.improvements}
- **文档更新**: ${stats.docs}

## 📦 安装和升级

\`\`\`bash
# 安装依赖
npm install

# 构建项目
npm run build

# 运行测试
npm test
\`\`\`

## 🔗 相关链接

- [完整变更日志](https:
  //github.com/your-org/inspi-ai-platform/compare/v${stats.previousVersion}...${version})
- [问题反馈](https://github.com/your-org/inspi-ai-platform/issues)
- [项目文档](https://github.com/your-org/inspi-ai-platform/docs)

## 🙏 致谢

感谢所有贡献者对本版本的支持和贡献！

---

**项目地址**: [Inspi AI Platform](https://github.com/your-org/inspi-ai-platform)  
**问题反馈**: [GitHub Issues](https://github.com/your-org/inspi-ai-platform/issues)

**下一个版本**: 敬请期待更多功能和改进！`
};

class ReleaseDocGenerator {
  constructor() {
    this.projectRoot = process.cwd();
    this.releaseNotesDir = path.join(this.projectRoot, '..');
    this.changelogPath = path.join(this.releaseNotesDir, 'CHANGELOG.md');
  }

  /**
   * 获取Git提交历史
   */
  getCommitHistory(fromTag = null, toTag = 'HEAD') {
    try {
      let command;
      if (fromTag) {
        command = `git log ${fromTag}..${toTag} --oneline --no-merges --
          format="%H|%s|%an|%ad" --date=short`;
      } else {
        // 如果没有起始标签，获取最近的标签
        try {
          const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
          command = `git log ${lastTag}..${toTag} --oneline --no-merges --
            format="%H|%s|%an|%ad" --date=short`;
        } catch {
          // 如果没有任何标签，获取所有提交
          command = `git log ${toTag} --oneline --no-merges --format="%H|%s|%an|%ad" --date=short`;
        }
      }

      const output = execSync(command, { encoding: 'utf8' }).trim();
      if (!output) return [];

      return output.split('\n').map(line => {
        const [hash, message, author, date] = line.split('|');
        return { hash, message, author, date };
      });
    } catch (error) {
      console.warn(`获取提交历史失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 解析提交信息
   */
  parseCommit(commit) {
    const { hash, message, author, date } = commit;
    
    // 解析约定式提交格式: type(scope): description
    const conventionalMatch = message.match(/^(\w+)(?:\(([^)]+)\))?(!)?: (.+)$/);
    
    if (conventionalMatch) {
      const [, type, scope, breaking, description] = conventionalMatch;
      const typeConfig = COMMIT_TYPES[type] || COMMIT_TYPES.chore;
      
      return {
        hash: hash.substring(0, 7),
        type,
        scope,
        description,
        breaking: !!breaking,
        emoji: typeConfig.emoji,
        label: typeConfig.label,
        changelog: typeConfig.changelog,
        author,
        date,
        raw: message
      };
    }

    // 如果不符合约定式提交格式，尝试简单分类
    const lowerMessage = message.toLowerCase();
    let type = 'chore';
    
    if (lowerMessage.includes('feat') || lowerMessage.includes('add') ||
      lowerMessage.includes('新增')) {
      type = 'feat';
    } else if (lowerMessage.includes('fix') || lowerMessage.includes('修复') ||
      lowerMessage.includes('bug')) {
      type = 'fix';
    } else if (lowerMessage.includes('doc') || lowerMessage.includes('文档')) {
      type = 'docs';
    } else if (lowerMessage.includes('test') || lowerMessage.includes('测试')) {
      type = 'test';
    } else if (lowerMessage.includes('refactor') || lowerMessage.includes('重构')) {
      type = 'refactor';
    } else if (lowerMessage.includes('perf') || lowerMessage.includes('性能')) {
      type = 'perf';
    }

    const typeConfig = COMMIT_TYPES[type];
    
    return {
      hash: hash.substring(0, 7),
      type,
      scope: null,
      description: message,
      breaking: lowerMessage.includes('breaking') || lowerMessage.includes('破坏'),
      emoji: typeConfig.emoji,
      label: typeConfig.label,
      changelog: typeConfig.changelog,
      author,
      date,
      raw: message
    };
  }

  /**
   * 分类提交
   */
  categorizeCommits(commits) {
    const categories = {
      features: [],
      fixes: [],
      improvements: [],
      breaking: [],
      others: []
    };

    const stats = {
      totalCommits: commits.length,
      features: 0,
      fixes: 0,
      improvements: 0,
      docs: 0,
      breaking: 0
    };

    commits.forEach(commit => {
      const parsed = this.parseCommit(commit);
      
      if (parsed.breaking) {
        categories.breaking.push({
          ...parsed,
          impact: this.getBreakingChangeImpact(parsed),
          migration: this.getBreakingChangeMigration(parsed)
        });
        stats.breaking++;
      }

      if (parsed.changelog) {
        switch (parsed.type) {
          case 'feat':
            categories.features.push(parsed);
            stats.features++;
            break;
          case 'fix':
            categories.fixes.push(parsed);
            stats.fixes++;
            break;
          case 'perf':
          case 'refactor':
            categories.improvements.push(parsed);
            stats.improvements++;
            break;
          default:
            categories.others.push(parsed);
        }
      }

      if (parsed.type === 'docs') {
        stats.docs++;
      }
    });

    return { categories, stats };
  }

  /**
   * 获取破坏性变更影响范围
   */
  getBreakingChangeImpact(commit) {
    const scope = commit.scope;
    const description = commit.description.toLowerCase();
    
    if (scope) {
      return `${scope}模块的相关功能`;
    }
    
    if (description.includes('api')) {
      return 'API接口调用';
    } else if (description.includes('config') || description.includes('配置')) {
      return '配置文件和环境变量';
    } else if (description.includes('database') || description.includes('数据库')) {
      return '数据库结构和数据';
    } else {
      return '需要检查相关功能的使用';
    }
  }

  /**
   * 获取破坏性变更迁移指南
   */
  getBreakingChangeMigration(commit) {
    const description = commit.description.toLowerCase();
    
    if (description.includes('api')) {
      return '请更新API调用方式，参考最新的API文档';
    } else if (description.includes('config')) {
      return '请更新配置文件，参考.env.example文件';
    } else if (description.includes('database')) {
      return '请运行数据库迁移脚本，备份重要数据';
    } else {
      return '请参考文档进行相应的代码调整';
    }
  }

  /**
   * 获取版本类型描述
   */
  getVersionTypeDescription(stats) {
    if (stats.breaking > 0) {
      return '重大更新版本 - 包含破坏性变更';
    } else if (stats.features > 0) {
      return '功能增强版本 - 新增功能特性';
    } else if (stats.fixes > 0) {
      return '问题修复版本 - 修复已知问题';
    } else {
      return '维护更新版本 - 代码优化和改进';
    }
  }

  /**
   * 获取上一个版本号
   */
  getPreviousVersion() {
    try {
      return execSync('git describe --tags --abbrev=0',
        { encoding: 'utf8' }).trim().replace('v', '');
    } catch {
      return '0.0.0';
    }
  }

  /**
   * 生成发布说明
   */
  generateReleaseNotes(version, commits) {
    const { categories, stats } = this.categorizeCommits(commits);
    const date = new Date().toLocaleDateString('zh-CN');
    const versionType = this.getVersionTypeDescription(stats);
    const previousVersion = this.getPreviousVersion();
    
    stats.previousVersion = previousVersion;

    let releaseNotes = RELEASE_TEMPLATE.header(version, date, versionType);
    
    // 添加各个分类的内容
    releaseNotes += RELEASE_TEMPLATE.features(categories.features);
    releaseNotes += RELEASE_TEMPLATE.fixes(categories.fixes);
    releaseNotes += RELEASE_TEMPLATE.improvements(categories.improvements);
    releaseNotes += RELEASE_TEMPLATE.breaking(categories.breaking);
    releaseNotes += RELEASE_TEMPLATE.footer(version, stats);

    return releaseNotes;
  }

  /**
   * 生成变更日志
   */
  generateChangelog(version, commits) {
    const { categories, stats } = this.categorizeCommits(commits);
    const date = new Date().toLocaleDateString('zh-CN');
    
    let changelog = `## [${version}] - ${date}\n\n`;

    if (categories.breaking.length > 0) {
      changelog += `### ⚠️ BREAKING CHANGES\n\n`;
      categories.breaking.forEach(item => {
        changelog += `- **${item.scope ?
          `${item.scope}: ` : ''}${item.description}** (${item.hash})\n`;
      });
      changelog += '\n';
    }

    if (categories.features.length > 0) {
      changelog += `### 🚀 Features\n\n`;
      categories.features.forEach(item => {
        changelog += `- **${item.scope ?
          `${item.scope}: ` : ''}${item.description}** (${item.hash})\n`;
      });
      changelog += '\n';
    }

    if (categories.fixes.length > 0) {
      changelog += `### 🐛 Bug Fixes\n\n`;
      categories.fixes.forEach(item => {
        changelog += `- **${item.scope ?
          `${item.scope}: ` : ''}${item.description}** (${item.hash})\n`;
      });
      changelog += '\n';
    }

    if (categories.improvements.length > 0) {
      changelog += `### 🔧 Improvements\n\n`;
      categories.improvements.forEach(item => {
        changelog += `- **${item.scope ?
          `${item.scope}: ` : ''}${item.description}** (${item.hash})\n`;
      });
      changelog += '\n';
    }

    return changelog;
  }

  /**
   * 更新CHANGELOG.md文件
   */
  updateChangelogFile(version, commits) {
    const newChangelog = this.generateChangelog(version, commits);
    
    let existingChangelog = '';
    if (fs.existsSync(this.changelogPath)) {
      existingChangelog = fs.readFileSync(this.changelogPath, 'utf8');
    } else {
      existingChangelog = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;
    }

    // 检查是否已存在该版本的条目
    if (existingChangelog.includes(`## [${version}]`)) {
      console.log(`⚠️  版本 ${version} 的变更日志已存在，跳过更新`);
      return;
    }

    // 在现有changelog前插入新版本
    const changelogLines = existingChangelog.split('\n');
    const insertIndex = changelogLines.findIndex(line =
      > line.startsWith('## [')) || changelogLines.length;
    
    changelogLines.splice(insertIndex, 0, newChangelog);
    
    const updatedChangelog = changelogLines.join('\n');
    fs.writeFileSync(this.changelogPath, updatedChangelog);
    
    console.log(`✅ 已更新变更日志: CHANGELOG.md`);
  }

  /**
   * 保存发布说明
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
   * 生成版本标签描述信息
   */
  generateTagDescription(version, commits) {
    const { stats } = this.categorizeCommits(commits);
    
    let description = `Release ${version}\n\n`;
    description += `📊 版本统计:\n`;
    description += `- 总提交数: ${stats.totalCommits}\n`;
    description += `- 新功能: ${stats.features}\n`;
    description += `- 问题修复: ${stats.fixes}\n`;
    description += `- 性能优化: ${stats.improvements}\n`;
    
    if (stats.breaking > 0) {
      description += `- ⚠️ 破坏性变更: ${stats.breaking}\n`;
    }
    
    description += `\n📝 主要变更:\n`;
    
    // 添加主要变更摘要
    const significantCommits = commits
      .map(c => this.parseCommit(c))
      .filter(c => c.changelog && (c.type === 'feat' || c.type === 'fix' || c.breaking))
      .slice(0, 5); // 只显示前5个重要提交
    
    significantCommits.forEach(commit => {
      description += `- ${commit.emoji} ${commit.description}\n`;
    });
    
    if (commits.length > significantCommits.length) {
      description += `- 以及其他 ${commits.length - significantCommits.length} 个改进和修复\n`;
    }
    
    return description;
  }

  /**
   * 主要的文档生成流程
   */
  async generate(version, fromTag = null) {
    try {
      console.log('📝 开始生成发布文档...\n');

      // 1. 获取提交历史
      console.log('1. 获取提交历史...');
      const commits = this.getCommitHistory(fromTag);
      console.log(`   发现 ${commits.length} 个提交`);

      if (commits.length === 0) {
        console.log('⚠️  没有发现新的提交，跳过文档生成');
        return;
      }

      // 2. 生成发布说明
      console.log('2. 生成发布说明...');
      const releaseNotes = this.generateReleaseNotes(version, commits);
      this.saveReleaseNotes(version, releaseNotes);

      // 3. 更新变更日志
      console.log('3. 更新变更日志...');
      this.updateChangelogFile(version, commits);

      // 4. 生成标签描述
      console.log('4. 生成标签描述信息...');
      const tagDescription = this.generateTagDescription(version, commits);
      
      // 保存标签描述到临时文件，供git tag使用
      const tagDescPath = path.join(this.releaseNotesDir, 'TAG_DESCRIPTION');
      fs.writeFileSync(tagDescPath, tagDescription);
      console.log('   已生成标签描述信息');

      console.log('\n✅ 发布文档生成完成!');
      console.log(`   发布说明: RELEASE_NOTES_v${version}.md`);
      console.log(`   变更日志: CHANGELOG.md`);
      console.log(`   标签描述: TAG_DESCRIPTION`);

      return {
        releaseNotesPath: path.join(this.releaseNotesDir, `RELEASE_NOTES_v${version}.md`),
        changelogPath: this.changelogPath,
        tagDescriptionPath: tagDescPath,
        tagDescription
      };

    } catch (error) {
      console.error('\n❌ 发布文档生成失败:', error.message);
      throw error;
    }
  }
}

// 命令行接口
function main() {
  const args = process.argv.slice(2);
  const generator = new ReleaseDocGenerator();

  if (args.length === 0) {
    console.log('📋 发布文档生成器使用说明:\n');
    console.log('生成发布文档:');
    console.log('  node scripts/release-doc-generator.js <version> [from-tag]\n');
    console.log('示例:');
    console.log('  node scripts/release-doc-generator.js 1.2.3');
    console.log('  node scripts/release-doc-generator.js 1.2.3 v1.2.2');
    console.log('  node scripts/release-doc-generator.js 1.2.3 --from-last-tag\n');
    console.log('选项:');
    console.log('  --help                显示帮助信息');
    console.log('  --from-last-tag      从最后一个标签开始生成');
    return;
  }

  const command = args[0];

  if (command === '--help') {
    console.log('📋 发布文档生成器使用说明:\n');
    console.log('生成发布文档:');
    console.log('  node scripts/release-doc-generator.js <version> [from-tag]\n');
    console.log('示例:');
    console.log('  node scripts/release-doc-generator.js 1.2.3');
    console.log('  node scripts/release-doc-generator.js 1.2.3 v1.2.2');
    console.log('  node scripts/release-doc-generator.js 1.2.3 --from-last-tag\n');
    console.log('选项:');
    console.log('  --help                显示帮助信息');
    console.log('  --from-last-tag      从最后一个标签开始生成');
    return;
  }

  const version = command;
  let fromTag = args[1];

  if (fromTag === '--from-last-tag') {
    try {
      fromTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    } catch {
      fromTag = null;
    }
  }

  generator.generate(version, fromTag).catch(error => {
    process.exit(1);
  });
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = ReleaseDocGenerator;