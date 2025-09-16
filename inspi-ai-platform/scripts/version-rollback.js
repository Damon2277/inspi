#!/usr/bin/env node

/**
 * 版本回滚脚本
 * 实现安全的版本回滚机制
 * 需求: 6.2
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

class VersionRollbackManager {
  constructor() {
    this.packageJsonPath = path.join(process.cwd(), 'package.json');
    this.rollbackLogPath = path.join(process.cwd(), '..', '.kiro', 'rollback-log.json');
    this.backupDir = path.join(process.cwd(), '..', '.kiro', 'rollback-backups');
  }

  /**
   * 确保备份目录存在
   */
  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * 获取当前版本
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
   * 获取所有可用的版本标签
   */
  getAvailableVersions() {
    try {
      const tags = execSync('git tag -l "v*" --sort=-version:refname', { encoding: 'utf8' }).trim();
      return tags ? tags.split('\n').filter(tag => tag.match(/^v\d+\.\d+\.\d+/)) : [];
    } catch (error) {
      throw new Error(`获取版本标签失败: ${error.message}`);
    }
  }

  /**
   * 验证目标版本是否存在
   */
  validateTargetVersion(targetVersion) {
    const tag = targetVersion.startsWith('v') ? targetVersion : `v${targetVersion}`;
    const availableVersions = this.getAvailableVersions();
    
    if (!availableVersions.includes(tag)) {
      throw new Error(`版本 ${targetVersion} 不存在。可用版本: ${availableVersions.join(', ')}`);
    }
    
    return tag;
  }

  /**
   * 检查工作目录状态
   */
  checkWorkingDirectory() {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
      if (status) {
        const files = status.split('\n').map(line => line.substring(3));
        return {
          clean: false,
          modifiedFiles: files
        };
      }
      return { clean: true, modifiedFiles: [] };
    } catch (error) {
      throw new Error(`检查工作目录状态失败: ${error.message}`);
    }
  }

  /**
   * 创建当前状态的备份
   */
  createBackup(targetVersion) {
    this.ensureBackupDir();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const currentVersion = this.getCurrentVersion();
    const backupName = `backup-${currentVersion}-to-${targetVersion}-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);
    
    try {
      // 创建备份目录
      fs.mkdirSync(backupPath, { recursive: true });
      
      // 备份package.json
      const packageJsonBackup = path.join(backupPath, 'package.json');
      fs.copyFileSync(this.packageJsonPath, packageJsonBackup);
      
      // 备份当前分支信息
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      const currentCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      
      const backupInfo = {
        timestamp: new Date().toISOString(),
        fromVersion: currentVersion,
        toVersion: targetVersion.replace('v', ''),
        currentBranch,
        currentCommit,
        backupPath
      };
      
      fs.writeFileSync(
        path.join(backupPath, 'backup-info.json'),
        JSON.stringify(backupInfo, null, 2)
      );
      
      console.log(`✅ 已创建备份: ${backupName}`);
      return backupInfo;
      
    } catch (error) {
      throw new Error(`创建备份失败: ${error.message}`);
    }
  }

  /**
   * 执行版本回滚
   */
  async performRollback(targetVersion, options = {}) {
    const { force = false, skipBackup = false } = options;
    const tag = this.validateTargetVersion(targetVersion);
    const currentVersion = this.getCurrentVersion();
    
    console.log(`🔄 准备回滚版本: ${currentVersion} → ${targetVersion}\n`);
    
    // 1. 安全检查
    console.log('1. 执行安全检查...');
    
    // 检查工作目录
    const workingDirStatus = this.checkWorkingDirectory();
    if (!workingDirStatus.clean && !force) {
      console.log('❌ 工作目录不干净，发现以下未提交的更改:');
      workingDirStatus.modifiedFiles.forEach(file => {
        console.log(`   ${file}`);
      });
      console.log('\n请先提交或暂存更改，或使用 --force 强制回滚');
      return false;
    }
    
    // 检查是否是向前回滚（不推荐）
    const availableVersions = this.getAvailableVersions();
    const currentIndex = availableVersions.indexOf(`v${currentVersion}`);
    const targetIndex = availableVersions.indexOf(tag);
    
    if (targetIndex < currentIndex && !force) {
      console.log('⚠️  警告: 您正在尝试回滚到更新的版本，这可能不是您想要的操作');
      console.log(`   当前版本: ${currentVersion} (索引: ${currentIndex})`);
      console.log(`   目标版本: ${targetVersion} (索引: ${targetIndex})`);
      
      const confirmed = await this.askConfirmation('是否继续回滚到更新的版本？');
      if (!confirmed) {
        console.log('❌ 回滚操作已取消');
        return false;
      }
    }
    
    // 2. 创建备份
    let backupInfo = null;
    if (!skipBackup) {
      console.log('2. 创建当前状态备份...');
      backupInfo = this.createBackup(targetVersion);
    } else {
      console.log('2. 跳过备份创建 (--skip-backup)');
    }
    
    // 3. 执行回滚
    console.log('3. 执行版本回滚...');
    
    try {
      // 切换到目标版本的提交
      console.log(`   切换到标签: ${tag}`);
      execSync(`git checkout ${tag}`, { stdio: 'inherit' });
      
      // 更新package.json版本号
      console.log(`   更新package.json版本号`);
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      packageJson.version = targetVersion.replace('v', '');
      fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      
      // 提交版本更改
      console.log(`   提交版本回滚更改`);
      execSync('git add package.json', { stdio: 'inherit' });
      execSync(`git commit -m "chore: rollback to version ${targetVersion}"`, { stdio: 'inherit' });
      
      // 4. 记录回滚日志
      console.log('4. 记录回滚操作...');
      this.logRollback({
        timestamp: new Date().toISOString(),
        fromVersion: currentVersion,
        toVersion: targetVersion.replace('v', ''),
        tag,
        backupInfo,
        success: true,
        reason: options.reason || '用户手动回滚'
      });
      
      console.log('\n✅ 版本回滚完成!');
      console.log(`   版本: ${currentVersion} → ${targetVersion}`);
      console.log(`   当前分支: ${execSync('git branch --show-current', { encoding: 'utf8' }).trim()}`);
      console.log(`   当前提交: ${execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()}`);
      
      if (backupInfo) {
        console.log(`   备份位置: ${backupInfo.backupPath}`);
      }
      
      console.log('\n💡 后续操作建议:');
      console.log('   1. 运行测试确保系统正常: npm test');
      console.log('   2. 重新构建项目: npm run build');
      console.log('   3. 如需撤销回滚，使用: node scripts/version-rollback.js restore');
      
      return true;
      
    } catch (error) {
      // 记录失败的回滚
      this.logRollback({
        timestamp: new Date().toISOString(),
        fromVersion: currentVersion,
        toVersion: targetVersion.replace('v', ''),
        tag,
        backupInfo,
        success: false,
        error: error.message,
        reason: options.reason || '用户手动回滚'
      });
      
      console.error(`❌ 版本回滚失败: ${error.message}`);
      
      // 尝试恢复到原始状态
      try {
        console.log('🔄 尝试恢复到原始状态...');
        execSync('git checkout main', { stdio: 'inherit' });
        console.log('✅ 已恢复到main分支');
      } catch (restoreError) {
        console.error(`❌ 恢复失败: ${restoreError.message}`);
        console.log('⚠️  请手动检查Git状态并恢复');
      }
      
      return false;
    }
  }

  /**
   * 记录回滚操作日志
   */
  logRollback(rollbackInfo) {
    try {
      let logs = [];
      
      // 读取现有日志
      if (fs.existsSync(this.rollbackLogPath)) {
        const existingLogs = fs.readFileSync(this.rollbackLogPath, 'utf8');
        logs = JSON.parse(existingLogs);
      }
      
      // 添加新日志
      logs.unshift(rollbackInfo);
      
      // 保持最近100条记录
      if (logs.length > 100) {
        logs = logs.slice(0, 100);
      }
      
      // 写入日志文件
      const logDir = path.dirname(this.rollbackLogPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      fs.writeFileSync(this.rollbackLogPath, JSON.stringify(logs, null, 2));
      
    } catch (error) {
      console.warn(`记录回滚日志失败: ${error.message}`);
    }
  }

  /**
   * 显示回滚历史
   */
  showRollbackHistory(limit = 10) {
    console.log('📋 版本回滚历史\n');
    
    if (!fs.existsSync(this.rollbackLogPath)) {
      console.log('❌ 未找到回滚历史记录');
      return;
    }
    
    try {
      const logs = JSON.parse(fs.readFileSync(this.rollbackLogPath, 'utf8'));
      
      if (logs.length === 0) {
        console.log('❌ 暂无回滚历史记录');
        return;
      }
      
      const recentLogs = logs.slice(0, limit);
      
      console.log('时间                | 版本变更        | 状态 | 原因');
      console.log('-------------------|----------------|------|------');
      
      recentLogs.forEach(log => {
        const date = new Date(log.timestamp).toLocaleString('zh-CN');
        const versionChange = `${log.fromVersion} → ${log.toVersion}`;
        const status = log.success ? '✅' : '❌';
        const reason = (log.reason || '').substring(0, 20);
        
        console.log(`${date} | ${versionChange.padEnd(14)} | ${status}  | ${reason}`);
      });
      
      if (logs.length > limit) {
        console.log(`\n💡 显示了最近的 ${limit} 条记录，总共有 ${logs.length} 条记录`);
      }
      
    } catch (error) {
      console.error(`读取回滚历史失败: ${error.message}`);
    }
  }

  /**
   * 列出可用的备份
   */
  listBackups() {
    console.log('📦 可用的回滚备份\n');
    
    if (!fs.existsSync(this.backupDir)) {
      console.log('❌ 未找到备份目录');
      return;
    }
    
    try {
      const backups = fs.readdirSync(this.backupDir)
        .filter(name => name.startsWith('backup-'))
        .sort()
        .reverse();
      
      if (backups.length === 0) {
        console.log('❌ 暂无可用备份');
        return;
      }
      
      console.log('备份名称                                    | 创建时间         | 版本变更');
      console.log('-------------------------------------------|-----------------|----------');
      
      backups.forEach(backupName => {
        const backupPath = path.join(this.backupDir, backupName);
        const infoPath = path.join(backupPath, 'backup-info.json');
        
        if (fs.existsSync(infoPath)) {
          try {
            const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
            const date = new Date(info.timestamp).toLocaleString('zh-CN');
            const versionChange = `${info.fromVersion} → ${info.toVersion}`;
            
            console.log(`${backupName.padEnd(42)} | ${date} | ${versionChange}`);
          } catch (error) {
            console.log(`${backupName.padEnd(42)} | 信息读取失败      | 未知`);
          }
        } else {
          console.log(`${backupName.padEnd(42)} | 信息文件缺失      | 未知`);
        }
      });
      
    } catch (error) {
      console.error(`列出备份失败: ${error.message}`);
    }
  }

  /**
   * 用户确认提示
   */
  askConfirmation(question) {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question(`${question} (y/N): `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  /**
   * 验证回滚前的系统状态
   */
  validateSystemState() {
    const checks = [];
    
    // 检查Git仓库状态
    try {
      execSync('git status', { stdio: 'pipe' });
      checks.push({ name: 'Git仓库', status: 'ok', message: 'Git仓库状态正常' });
    } catch (error) {
      checks.push({ name: 'Git仓库', status: 'error', message: 'Git仓库状态异常' });
    }
    
    // 检查package.json
    try {
      JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      checks.push({ name: 'package.json', status: 'ok', message: 'package.json格式正确' });
    } catch (error) {
      checks.push({ name: 'package.json', status: 'error', message: 'package.json格式错误' });
    }
    
    // 检查node_modules
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      checks.push({ name: 'node_modules', status: 'ok', message: '依赖已安装' });
    } else {
      checks.push({ name: 'node_modules', status: 'warning', message: '依赖未安装，回滚后需要运行 npm install' });
    }
    
    return checks;
  }
}

// 命令行接口
async function main() {
  const args = process.argv.slice(2);
  const manager = new VersionRollbackManager();

  if (args.length === 0) {
    console.log('❌ 请指定要回滚的版本');
    console.log('用法: node scripts/version-rollback.js <version> [options]');
    console.log('使用 --help 查看详细帮助');
    process.exit(1);
  }

  const command = args[0];

  switch (command) {
    case '--help':
    case 'help':
      console.log('📋 版本回滚脚本使用说明:\n');
      console.log('基本用法:');
      console.log('  node scripts/version-rollback.js <version>     # 回滚到指定版本');
      console.log('  node scripts/version-rollback.js history       # 显示回滚历史');
      console.log('  node scripts/version-rollback.js backups       # 列出可用备份');
      console.log('  node scripts/version-rollback.js validate      # 验证系统状态\n');
      console.log('选项:');
      console.log('  --force          强制回滚，忽略工作目录检查');
      console.log('  --skip-backup    跳过备份创建');
      console.log('  --reason <text>  指定回滚原因\n');
      console.log('示例:');
      console.log('  node scripts/version-rollback.js v0.2.0');
      console.log('  node scripts/version-rollback.js 0.2.0 --force');
      console.log('  node scripts/version-rollback.js v0.1.0 --reason "修复关键bug"');
      console.log('\n⚠️  注意事项:');
      console.log('  - 回滚前会自动创建当前状态的备份');
      console.log('  - 回滚操作会修改package.json和创建新的提交');
      console.log('  - 建议在回滚后运行测试确保系统正常');
      break;

    case 'history':
      const historyLimit = args.includes('--limit') 
        ? parseInt(args[args.indexOf('--limit') + 1]) || 10 
        : 10;
      manager.showRollbackHistory(historyLimit);
      break;

    case 'backups':
      manager.listBackups();
      break;

    case 'validate':
      console.log('🔍 验证系统状态\n');
      const checks = manager.validateSystemState();
      
      checks.forEach(check => {
        const icon = check.status === 'ok' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
        console.log(`${icon} ${check.name}: ${check.message}`);
      });
      
      const hasErrors = checks.some(check => check.status === 'error');
      if (hasErrors) {
        console.log('\n❌ 系统状态检查发现错误，建议修复后再进行回滚');
        process.exit(1);
      } else {
        console.log('\n✅ 系统状态正常，可以安全进行回滚');
      }
      break;

    default:
      // 执行版本回滚
      const targetVersion = command;
      const options = {};
      
      if (args.includes('--force')) {
        options.force = true;
      }
      
      if (args.includes('--skip-backup')) {
        options.skipBackup = true;
      }
      
      if (args.includes('--reason')) {
        const reasonIndex = args.indexOf('--reason');
        options.reason = args[reasonIndex + 1] || '';
      }
      
      try {
        const success = await manager.performRollback(targetVersion, options);
        process.exit(success ? 0 : 1);
      } catch (error) {
        console.error(`❌ 回滚失败: ${error.message}`);
        process.exit(1);
      }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error(`❌ 脚本执行失败: ${error.message}`);
    process.exit(1);
  });
}

module.exports = VersionRollbackManager;