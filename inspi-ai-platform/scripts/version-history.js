#!/usr/bin/env node

/**
 * 版本历史管理脚本
 * 实现版本查询、比较和搜索功能
 * 需求: 6.1, 6.3, 6.4
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class VersionHistoryManager {
  constructor() {
    this.packageJsonPath = path.join(process.cwd(), 'package.json');
    this.releaseNotesDir = path.join(process.cwd(), '..');
    this.versionHistoryPath = path.join(process.cwd(), '..', '.kiro', 'version-history.json');
  }

  /**
   * 获取所有版本标签
   */
  getAllVersionTags() {
    try {
      const tags = execSync('git tag -l "v*" --sort=-version:refname', { encoding: 'utf8' }).trim();
      return tags ? tags.split('\n').filter(tag => tag.match(/^v\d+\.\d+\.\d+/)) : [];
    } catch (error) {
      console.warn(`获取版本标签失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 获取标签的详细信息
   */
  getTagInfo(tag) {
    try {
      // 获取标签的提交信息
      const commit = execSync(`git rev-list -n 1 ${tag}`, { encoding: 'utf8' }).trim();
      const date = execSync(`git log -1 --format=%ai ${tag}`, { encoding: 'utf8' }).trim();
      const author = execSync(`git log -1 --format=%an ${tag}`, { encoding: 'utf8' }).trim();
      const message = execSync(`git tag -l --format='%(contents)' ${tag}`,
        { encoding: 'utf8' }).trim();
      
      return {
        tag,
        version: tag.replace('v', ''),
        commit: commit.substring(0, 8),
        date: new Date(date).toISOString(),
        author,
        message: message || `Release ${tag}`,
        releaseNotesFile: `RELEASE_NOTES_${tag}.md`
      };
    } catch (error) {
      console.warn(`获取标签 ${tag} 信息失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取两个版本之间的提交
   */
  getCommitsBetweenVersions(fromTag, toTag) {
    try {
      const command = fromTag 
        ? `git log ${fromTag}..${toTag} --oneline --no-merges`
        : `git log ${toTag} --oneline --no-merges`;
      
      const commits = execSync(command, { encoding: 'utf8' }).trim();
      return commits ? commits.split('\n').map(commit => {
        const [hash, ...messageParts] = commit.split(' ');
        return {
          hash: hash.substring(0, 8),
          message: messageParts.join(' ')
        };
      }) : [];
    } catch (error) {
      console.warn(`获取版本间提交失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 获取版本的发布说明
   */
  getReleaseNotes(version) {
    try {
      const releaseNotesFile = path.join(this.releaseNotesDir, `RELEASE_NOTES_v${version}.md`);
      if (fs.existsSync(releaseNotesFile)) {
        return fs.readFileSync(releaseNotesFile, 'utf8');
      }
      return null;
    } catch (error) {
      console.warn(`读取发布说明失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 列出所有版本
   */
  listVersions(options = {}) {
    const { limit = 10, format = 'table' } = options;
    
    console.log('📋 版本历史列表\n');
    
    const tags = this.getAllVersionTags();
    if (tags.length === 0) {
      console.log('❌ 未找到任何版本标签');
      return;
    }

    const versions = tags.slice(0, limit).map(tag => this.getTagInfo(tag)).filter(Boolean);
    
    if (format === 'table') {
      console.log('版本号      | 发布日期     | 作者        | 提交ID   | 发布说明');
      console.log('-----------|-------------|------------|----------|----------');
      
      versions.forEach(version => {
        const date = new Date(version.date).toLocaleDateString('zh-CN');
        const author = version.author.padEnd(10).substring(0, 10);
        const hasNotes = fs.existsSync(path.join(this.releaseNotesDir,
          version.releaseNotesFile)) ? '✅' : '❌';
        
        console.log(`${version.version.padEnd(10)} | ${date.padEnd(11)} | ${author} | ${version.commit} | ${hasNotes}`);
      });
    } else if (format === 'json') {
      console.log(JSON.stringify(versions, null, 2));
    } else {
      versions.forEach(version => {
        console.log(`🏷️  ${version.tag}`);
        console.log(`   版本: ${version.version}`);
        console.log(`   日期: ${new Date(version.date).toLocaleString('zh-CN')}`);
        console.log(`   作者: ${version.author}`);
        console.log(`   提交: ${version.commit}`);
        console.log(`   说明: ${version.message}`);
        console.log('');
      });
    }
    
    if (tags.length > limit) {
      console.log(`\n💡 显示了最新的 ${limit} 个版本，总共有 ${tags.length} 个版本`);
      console.log(`   使用 --limit ${tags.length} 查看所有版本`);
    }
  }

  /**
   * 显示版本详细信息
   */
  showVersionDetails(version) {
    console.log(`📖 版本 ${version} 详细信息\n`);
    
    const tag = version.startsWith('v') ? version : `v${version}`;
    const versionInfo = this.getTagInfo(tag);
    
    if (!versionInfo) {
      console.log(`❌ 版本 ${version} 不存在`);
      return;
    }

    console.log(`🏷️  标签: ${versionInfo.tag}`);
    console.log(`📅 发布日期: ${new Date(versionInfo.date).toLocaleString('zh-CN')}`);
    console.log(`👤 发布者: ${versionInfo.author}`);
    console.log(`🔗 提交ID: ${versionInfo.commit}`);
    console.log(`📝 标签说明: ${versionInfo.message}`);
    
    // 显示发布说明
    const releaseNotes = this.getReleaseNotes(versionInfo.version);
    if (releaseNotes) {
      console.log('\n📋 发布说明:');
      console.log('─'.repeat(50));
      console.log(releaseNotes);
    } else {
      console.log('\n❌ 未找到发布说明文件');
    }
  }

  /**
   * 比较两个版本
   */
  compareVersions(fromVersion, toVersion) {
    console.log(`🔍 版本比较: ${fromVersion} → ${toVersion}\n`);
    
    const fromTag = fromVersion.startsWith('v') ? fromVersion : `v${fromVersion}`;
    const toTag = toVersion.startsWith('v') ? toVersion : `v${toVersion}`;
    
    // 验证版本存在
    const allTags = this.getAllVersionTags();
    if (!allTags.includes(fromTag)) {
      console.log(`❌ 版本 ${fromVersion} 不存在`);
      return;
    }
    if (!allTags.includes(toTag)) {
      console.log(`❌ 版本 ${toVersion} 不存在`);
      return;
    }

    // 获取版本信息
    const fromInfo = this.getTagInfo(fromTag);
    const toInfo = this.getTagInfo(toTag);
    
    console.log(`📊 版本信息对比:`);
    console.log(`   ${fromVersion}:
      ${new Date(fromInfo.date).toLocaleDateString('zh-CN')} (${fromInfo.commit})`);
    console.log(`   ${toVersion}:
      ${new Date(toInfo.date).toLocaleDateString('zh-CN')} (${toInfo.commit})`);
    
    // 获取版本间的提交
    const commits = this.getCommitsBetweenVersions(fromTag, toTag);
    
    if (commits.length === 0) {
      console.log('\n✅ 两个版本之间没有差异');
      return;
    }
    
    console.log(`\n📝 变更内容 (${commits.length} 个提交):`);
    console.log('─'.repeat(50));
    
    // 分类显示提交
    const features = commits.filter(c => c.message.toLowerCase().startsWith('feat'));
    const fixes = commits.filter(c => c.message.toLowerCase().startsWith('fix'));
    const others = commits.filter(c =
      > !c.message.toLowerCase().startsWith('feat') && !c.message.toLowerCase().startsWith('fix'));
    
    if (features.length > 0) {
      console.log('\n🚀 新功能:');
      features.forEach(commit => {
        console.log(`   ${commit.hash} ${commit.message}`);
      });
    }
    
    if (fixes.length > 0) {
      console.log('\n🐛 问题修复:');
      fixes.forEach(commit => {
        console.log(`   ${commit.hash} ${commit.message}`);
      });
    }
    
    if (others.length > 0) {
      console.log('\n🔧 其他变更:');
      others.forEach(commit => {
        console.log(`   ${commit.hash} ${commit.message}`);
      });
    }

    // 显示统计信息
    console.log(`\n📈 变更统计:`);
    console.log(`   新功能: ${features.length} 个`);
    console.log(`   问题修复: ${fixes.length} 个`);
    console.log(`   其他变更: ${others.length} 个`);
    console.log(`   总计: ${commits.length} 个提交`);
  }

  /**
   * 搜索版本
   */
  searchVersions(query, options = {}) {
    const { type = 'all' } = options;
    
    console.log(`🔍 搜索版本: "${query}"\n`);
    
    const tags = this.getAllVersionTags();
    const results = [];
    
    for (const tag of tags) {
      const versionInfo = this.getTagInfo(tag);
      if (!versionInfo) continue;
      
      let match = false;
      
      // 搜索版本号
      if (type === 'all' || type === 'version') {
        if (versionInfo.version.includes(query) || versionInfo.tag.includes(query)) {
          match = true;
        }
      }
      
      // 搜索提交信息
      if (type === 'all' || type === 'message') {
        if (versionInfo.message.toLowerCase().includes(query.toLowerCase())) {
          match = true;
        }
      }
      
      // 搜索作者
      if (type === 'all' || type === 'author') {
        if (versionInfo.author.toLowerCase().includes(query.toLowerCase())) {
          match = true;
        }
      }
      
      // 搜索发布说明内容
      if (type === 'all' || type === 'notes') {
        const releaseNotes = this.getReleaseNotes(versionInfo.version);
        if (releaseNotes && releaseNotes.toLowerCase().includes(query.toLowerCase())) {
          match = true;
        }
      }
      
      if (match) {
        results.push(versionInfo);
      }
    }
    
    if (results.length === 0) {
      console.log(`❌ 未找到匹配 "${query}" 的版本`);
      return;
    }
    
    console.log(`✅ 找到 ${results.length} 个匹配的版本:\n`);
    
    results.forEach(version => {
      console.log(`🏷️  ${version.tag}`);
      console.log(`   日期: ${new Date(version.date).toLocaleDateString('zh-CN')}`);
      console.log(`   作者: ${version.author}`);
      console.log(`   说明: ${version.message}`);
      console.log('');
    });
  }

  /**
   * 获取当前版本
   */
  getCurrentVersion() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      return packageJson.version;
    } catch (error) {
      console.warn(`获取当前版本失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取最新版本
   */
  getLatestVersion() {
    const tags = this.getAllVersionTags();
    return tags.length > 0 ? tags[0] : null;
  }

  /**
   * 显示版本状态
   */
  showVersionStatus() {
    console.log('📊 版本状态概览\n');
    
    const currentVersion = this.getCurrentVersion();
    const latestTag = this.getLatestVersion();
    const allTags = this.getAllVersionTags();
    
    console.log(`📦 当前版本: ${currentVersion || '未知'}`);
    console.log(`🏷️  最新标签: ${latestTag || '无'}`);
    console.log(`📈 版本总数: ${allTags.length}`);
    
    if (currentVersion && latestTag) {
      const latestVersion = latestTag.replace('v', '');
      if (currentVersion === latestVersion) {
        console.log('✅ 版本状态: 当前版本与最新标签一致');
      } else {
        console.log('⚠️  版本状态: 当前版本与最新标签不一致');
        console.log(`   建议运行: npm run version:bump`);
      }
    }
    
    // 显示最近的版本
    if (allTags.length > 0) {
      console.log('\n📋 最近的版本:');
      const recentTags = allTags.slice(0, 5);
      recentTags.forEach(tag => {
        const info = this.getTagInfo(tag);
        if (info) {
          const date = new Date(info.date).toLocaleDateString('zh-CN');
          console.log(`   ${tag} (${date})`);
        }
      });
    }
  }
}

// 命令行接口
function main() {
  const args = process.argv.slice(2);
  const manager = new VersionHistoryManager();

  if (args.length === 0) {
    manager.showVersionStatus();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'list':
    case 'ls':
      const listOptions = {};
      if (args.includes('--limit')) {
        const limitIndex = args.indexOf('--limit');
        listOptions.limit = parseInt(args[limitIndex + 1], 10) || 10;
      }
      if (args.includes('--json')) {
        listOptions.format = 'json';
      } else if (args.includes('--detail')) {
        listOptions.format = 'detail';
      }
      manager.listVersions(listOptions);
      break;

    case 'show':
    case 'info':
      if (args.length < 2) {
        console.error('❌ 请指定版本号');
        console.log('用法: node scripts/version-history.js show <version>');
        process.exit(1);
      }
      manager.showVersionDetails(args[1]);
      break;

    case 'compare':
    case 'diff':
      if (args.length < 3) {
        console.error('❌ 请指定两个版本号');
        console.log('用法: node scripts/version-history.js compare <from-version> <to-version>');
        process.exit(1);
      }
      manager.compareVersions(args[1], args[2]);
      break;

    case 'search':
    case 'find':
      if (args.length < 2) {
        console.error('❌ 请指定搜索关键词');
        console.log('用法:
          node scripts/version-history.js search <query> [--type version|message|author|notes]');
        process.exit(1);
      }
      const searchOptions = {};
      if (args.includes('--type')) {
        const typeIndex = args.indexOf('--type');
        searchOptions.type = args[typeIndex + 1] || 'all';
      }
      manager.searchVersions(args[1], searchOptions);
      break;

    case 'status':
      manager.showVersionStatus();
      break;

    case '--help':
    case 'help':
      console.log('📋 版本历史管理脚本使用说明:\n');
      console.log('基本命令:');
      console.log('  node scripts/version-history.js                    # 显示版本状态');
      console.log('  node scripts/version-history.js status             # 显示版本状态');
      console.log('  node scripts/version-history.js list               # 列出版本历史');
      console.log('  node scripts/version-history.js show <version>     # 显示版本详情');
      console.log('  node scripts/version-history.js compare <v1> <v2>  # 比较两个版本');
      console.log('  node scripts/version-history.js search <query>     # 搜索版本\n');
      console.log('选项:');
      console.log('  --limit <number>     限制显示的版本数量 (默认: 10)');
      console.log('  --json              以JSON格式输出');
      console.log('  --detail            显示详细信息');
      console.log('  --type <type>       搜索类型: version|message|author|notes\n');
      console.log('示例:');
      console.log('  node scripts/version-history.js list --limit 20');
      console.log('  node scripts/version-history.js show v0.3.0');
      console.log('  node scripts/version-history.js compare v0.2.0 v0.3.0');
      console.log('  node scripts/version-history.js search "bug fix" --type message');
      break;

    default:
      console.error(`❌ 未知命令: ${command}`);
      console.log('使用 --help 查看帮助信息');
      process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = VersionHistoryManager;