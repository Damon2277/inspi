#!/usr/bin/env node

/**
 * Style Recovery System CLI
 * 样式恢复系统命令行工具
 */

const { Command } = require('commander');
const StyleRecoverySystem = require('./index');
const VisualRegressionDetector = require('./visual-regression');
const path = require('path');

const program = new Command();

program
  .name('style-recovery')
  .description('Style version control and recovery system')
  .version('1.0.0');

// 初始化命令
program
  .command('init')
  .description('Initialize style recovery system')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .action(async (options) => {
    try {
      const system = new StyleRecoverySystem({
        projectRoot: path.resolve(options.project)
      });
      
      await system.initialize();
      console.log('🎉 Style recovery system initialized successfully!');
      
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      process.exit(1);
    }
  });

// 创建快照命令
program
  .command('snapshot')
  .description('Create a style snapshot')
  .option('-n, --name <name>', 'Snapshot name')
  .option('-d, --description <desc>', 'Snapshot description')
  .option('-s, --stable', 'Mark as stable snapshot')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .action(async (options) => {
    try {
      const system = new StyleRecoverySystem({
        projectRoot: path.resolve(options.project)
      });
      
      await system.initialize();
      
      const snapshot = await system.createSnapshot({
        name: options.name,
        description: options.description,
        isStable: options.stable,
        tags: options.tags ? options.tags.split(',').map(t => t.trim()) : [],
        reason: 'manual-cli'
      });
      
      console.log(`✅ Snapshot created: ${snapshot.id}`);
      console.log(`   Name: ${snapshot.name}`);
      console.log(`   Files: ${Object.keys(snapshot.files).length}`);
      console.log(`   Size: ${Math.round(snapshot.metadata.totalSize / 1024)}KB`);
      
    } catch (error) {
      console.error('❌ Snapshot creation failed:', error.message);
      process.exit(1);
    }
  });

// 监控命令
program
  .command('monitor')
  .description('Start monitoring style files')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .action(async (options) => {
    try {
      const system = new StyleRecoverySystem({
        projectRoot: path.resolve(options.project)
      });
      
      await system.initialize();
      system.startMonitoring();
      
      console.log('👀 Style monitoring started. Press Ctrl+C to stop.');
      
      // 优雅退出处理
      process.on('SIGINT', async () => {
        console.log('\n⏹️ Stopping monitor...');
        await system.stopMonitoring();
        console.log('✅ Monitor stopped');
        process.exit(0);
      });
      
      // 保持进程运行
      setInterval(() => {}, 1000);
      
    } catch (error) {
      console.error('❌ Monitor start failed:', error.message);
      process.exit(1);
    }
  });

// 列出快照命令
program
  .command('list')
  .description('List all snapshots')
  .option('-l, --limit <number>', 'Limit number of results', '10')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .action(async (options) => {
    try {
      const system = new StyleRecoverySystem({
        projectRoot: path.resolve(options.project)
      });
      
      await system.initialize();
      const snapshots = await system.listSnapshots();
      const limit = parseInt(options.limit);
      
      if (snapshots.length === 0) {
        console.log('📭 No snapshots found');
        return;
      }
      
      console.log(`📋 Found ${snapshots.length} snapshots (showing ${Math.min(limit, snapshots.length)}):\n`);
      
      snapshots.slice(0, limit).forEach((snapshot, index) => {
        const date = new Date(snapshot.timestamp).toLocaleString();
        const stable = snapshot.isStable ? '🔒' : '📸';
        const size = Math.round(snapshot.metadata.totalSize / 1024);
        
        console.log(`${stable} ${snapshot.name}`);
        console.log(`   ID: ${snapshot.id}`);
        console.log(`   Date: ${date}`);
        console.log(`   Files: ${Object.keys(snapshot.files).length} (${size}KB)`);
        console.log(`   Tags: ${snapshot.tags.join(', ') || 'none'}`);
        if (snapshot.description) {
          console.log(`   Description: ${snapshot.description}`);
        }
        console.log('');
      });
      
    } catch (error) {
      console.error('❌ List failed:', error.message);
      process.exit(1);
    }
  });

// 状态命令
program
  .command('status')
  .description('Show system status')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .action(async (options) => {
    try {
      const system = new StyleRecoverySystem({
        projectRoot: path.resolve(options.project)
      });
      
      await system.initialize();
      const status = await system.getStatus();
      
      console.log('📊 Style Recovery System Status:\n');
      console.log(`   Monitoring: ${status.isMonitoring ? '✅ Active' : '❌ Inactive'}`);
      console.log(`   Total Snapshots: ${status.totalSnapshots}`);
      console.log(`   System Health: ${status.systemHealth}`);
      
      if (status.latestSnapshot) {
        const date = new Date(status.latestSnapshot.timestamp).toLocaleString();
        console.log(`   Latest Snapshot: ${status.latestSnapshot.name} (${date})`);
      }
      
    } catch (error) {
      console.error('❌ Status check failed:', error.message);
      process.exit(1);
    }
  });

// 删除快照命令
program
  .command('delete <snapshotId>')
  .description('Delete a snapshot')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .action(async (snapshotId, options) => {
    try {
      const system = new StyleRecoverySystem({
        projectRoot: path.resolve(options.project)
      });
      
      await system.initialize();
      await system.snapshotManager.deleteSnapshot(snapshotId);
      
      console.log(`✅ Snapshot ${snapshotId} deleted`);
      
    } catch (error) {
      console.error('❌ Delete failed:', error.message);
      process.exit(1);
    }
  });

// 回滚命令
program
  .command('rollback <snapshotId>')
  .description('Rollback to a specific snapshot')
  .option('-f, --force', 'Skip confirmation prompts')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .action(async (snapshotId, options) => {
    try {
      const system = new StyleRecoverySystem({
        projectRoot: path.resolve(options.project)
      });
      
      await system.initialize();
      
      // 获取快照信息
      const snapshot = await system.snapshotManager.getSnapshot(snapshotId);
      if (!snapshot) {
        console.error(`❌ Snapshot ${snapshotId} not found`);
        process.exit(1);
      }
      
      console.log(`🔄 Preparing to rollback to snapshot: ${snapshot.name}`);
      console.log(`   ID: ${snapshot.id}`);
      console.log(`   Date: ${new Date(snapshot.timestamp).toLocaleString()}`);
      console.log(`   Files: ${Object.keys(snapshot.files).length}`);
      
      // 确认提示（除非使用 --force）
      if (!options.force) {
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
          rl.question('\n⚠️  This will overwrite current files. Continue? (y/N): ', resolve);
        });
        
        rl.close();
        
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log('❌ Rollback cancelled');
          process.exit(0);
        }
      }
      
      // 执行回滚
      console.log('\n🔄 Starting rollback...');
      const result = await system.rollbackToSnapshot(snapshotId);
      
      if (result.success) {
        console.log(`\n✅ Rollback completed successfully!`);
        console.log(`   Operation ID: ${result.operationId}`);
        console.log(`   Files restored: ${result.filesRestored}`);
        console.log(`   Backup created: ${result.backupId}`);
        
        if (result.warnings.length > 0) {
          console.log(`\n⚠️  Warnings:`);
          result.warnings.forEach(warning => console.log(`   - ${warning}`));
        }
        
        console.log(`\n📊 Impact Analysis:`);
        console.log(`   Risk Level: ${result.impactAnalysis.riskLevel}`);
        console.log(`   Total Files: ${result.impactAnalysis.totalFiles}`);
        console.log(`   Global Styles: ${result.impactAnalysis.estimatedImpact.globalStyles ? 'Yes' : 'No'}`);
        
      } else {
        console.error(`\n❌ Rollback failed: ${result.message}`);
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      process.exit(1);
    }
  });

// 回滚历史命令
program
  .command('history')
  .description('Show rollback history')
  .option('-l, --limit <number>', 'Limit number of results', '20')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .action(async (options) => {
    try {
      const system = new StyleRecoverySystem({
        projectRoot: path.resolve(options.project)
      });
      
      await system.initialize();
      const history = await system.getRollbackHistory(parseInt(options.limit));
      
      if (history.length === 0) {
        console.log('📭 No rollback operations found');
        return;
      }
      
      console.log(`📋 Rollback History (${history.length} operations):\n`);
      
      history.forEach((operation, index) => {
        const date = new Date(operation.timestamp).toLocaleString();
        const status = operation.success ? '✅' : '❌';
        const duration = operation.duration ? `${operation.duration}ms` : 'N/A';
        
        console.log(`${status} ${operation.type.toUpperCase()}`);
        console.log(`   Operation ID: ${operation.operationId}`);
        console.log(`   Date: ${date}`);
        console.log(`   Duration: ${duration}`);
        
        if (operation.snapshotId) {
          console.log(`   Snapshot: ${operation.snapshotId}`);
        }
        
        if (operation.rollbackResult) {
          console.log(`   Files Restored: ${operation.rollbackResult.filesRestored}`);
        }
        
        if (operation.impactAnalysis) {
          console.log(`   Risk Level: ${operation.impactAnalysis.riskLevel}`);
        }
        
        if (operation.error) {
          console.log(`   Error: ${operation.error}`);
        }
        
        console.log('');
      });
      
    } catch (error) {
      console.error('❌ History retrieval failed:', error.message);
      process.exit(1);
    }
  });

// 回滚详情命令
program
  .command('operation <operationId>')
  .description('Show detailed information about a rollback operation')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .action(async (operationId, options) => {
    try {
      const system = new StyleRecoverySystem({
        projectRoot: path.resolve(options.project)
      });
      
      await system.initialize();
      const operation = await system.getRollbackOperation(operationId);
      
      if (!operation) {
        console.error(`❌ Operation ${operationId} not found`);
        process.exit(1);
      }
      
      const date = new Date(operation.timestamp).toLocaleString();
      const status = operation.success ? '✅ SUCCESS' : '❌ FAILED';
      
      console.log(`📋 Rollback Operation Details:\n`);
      console.log(`   Status: ${status}`);
      console.log(`   Operation ID: ${operation.operationId}`);
      console.log(`   Type: ${operation.type.toUpperCase()}`);
      console.log(`   Date: ${date}`);
      console.log(`   Duration: ${operation.duration || 'N/A'}ms`);
      
      if (operation.snapshotId) {
        console.log(`   Target Snapshot: ${operation.snapshotId}`);
      }
      
      if (operation.backupId) {
        console.log(`   Backup Created: ${operation.backupId}`);
      }
      
      if (operation.impactAnalysis) {
        console.log(`\n📊 Impact Analysis:`);
        console.log(`   Risk Level: ${operation.impactAnalysis.riskLevel}`);
        console.log(`   Total Files: ${operation.impactAnalysis.totalFiles}`);
        console.log(`   Global Styles Affected: ${operation.impactAnalysis.estimatedImpact.globalStyles ? 'Yes' : 'No'}`);
        console.log(`   Pages Affected: ${operation.impactAnalysis.estimatedImpact.pages.length}`);
        console.log(`   Components Affected: ${operation.impactAnalysis.estimatedImpact.components.length}`);
      }
      
      if (operation.rollbackResult) {
        console.log(`\n🔄 Rollback Results:`);
        console.log(`   Files Restored: ${operation.rollbackResult.filesRestored}`);
        console.log(`   Files Skipped: ${operation.rollbackResult.filesSkipped}`);
        console.log(`   Errors: ${operation.rollbackResult.errors.length}`);
        
        if (operation.rollbackResult.errors.length > 0) {
          console.log(`\n❌ Errors:`);
          operation.rollbackResult.errors.forEach(error => {
            console.log(`   - ${error.file}: ${error.error}`);
          });
        }
      }
      
      if (operation.verification) {
        console.log(`\n🔍 Verification:`);
        console.log(`   Success: ${operation.verification.success ? 'Yes' : 'No'}`);
        console.log(`   Warnings: ${operation.verification.warnings.length}`);
        console.log(`   Errors: ${operation.verification.errors.length}`);
        
        if (operation.verification.warnings.length > 0) {
          console.log(`\n⚠️  Warnings:`);
          operation.verification.warnings.forEach(warning => {
            console.log(`   - ${warning}`);
          });
        }
      }
      
      if (operation.error) {
        console.log(`\n❌ Error: ${operation.error}`);
      }
      
    } catch (error) {
      console.error('❌ Operation retrieval failed:', error.message);
      process.exit(1);
    }
  });

// 视觉回归测试命令
program
  .command('visual-test')
  .description('运行视觉回归测试')
  .option('-b, --base <snapshot-id>', '基准快照ID')
  .option('-c, --current <snapshot-id>', '当前快照ID')
  .option('--capture-only', '仅截取当前页面截图')
  .option('--compare-only', '仅比较已有截图')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .action(async (options) => {
    try {
      const detector = new VisualRegressionDetector({
        screenshotDir: path.join(path.resolve(options.project), '.kiro/style-recovery/screenshots'),
        reportsDir: path.join(path.resolve(options.project), '.kiro/style-recovery/reports')
      });
      await detector.initialize();
      
      try {
        if (options.captureOnly) {
          const snapshotId = options.current || `visual-${Date.now()}`;
          console.log(`📸 Capturing screenshots for snapshot: ${snapshotId}`);
          const screenshots = await detector.captureAllScreenshots(snapshotId);
          console.log(`✅ Captured ${screenshots.length} screenshots`);
        } else if (options.compareOnly && options.base && options.current) {
          console.log(`🔍 Comparing snapshots: ${options.base} vs ${options.current}`);
          const results = await detector.compareSnapshots(options.base, options.current);
          console.log(`✅ Comparison completed. Check reports for details.`);
        } else {
          // 完整的视觉回归测试流程
          const baseSnapshotId = options.base || 'baseline';
          const currentSnapshotId = options.current || `current-${Date.now()}`;
          
          console.log(`📸 Capturing current screenshots...`);
          await detector.captureAllScreenshots(currentSnapshotId);
          
          console.log(`🔍 Comparing with baseline...`);
          const results = await detector.compareSnapshots(baseSnapshotId, currentSnapshotId);
          
          if (results.overallResult.hasDifferences) {
            console.log(`⚠️  Visual differences detected!`);
            process.exit(1);
          } else {
            console.log(`✅ No visual differences found.`);
          }
        }
      } finally {
        await detector.cleanup();
      }
    } catch (error) {
      console.error('❌ Visual regression test failed:', error.message);
      process.exit(1);
    }
  });

// 创建基准截图
program
  .command('create-baseline')
  .description('创建视觉回归测试的基准截图')
  .option('-n, --name <name>', '基准名称', 'baseline')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .action(async (options) => {
    try {
      const detector = new VisualRegressionDetector({
        screenshotDir: path.join(path.resolve(options.project), '.kiro/style-recovery/screenshots'),
        reportsDir: path.join(path.resolve(options.project), '.kiro/style-recovery/reports')
      });
      await detector.initialize();
      
      try {
        console.log(`📸 Creating baseline screenshots: ${options.name}`);
        const screenshots = await detector.captureAllScreenshots(options.name);
        console.log(`✅ Baseline created with ${screenshots.length} screenshots`);
        console.log(`💡 Use 'node .kiro/style-recovery/cli.js visual-test --base ${options.name}' to compare against this baseline`);
      } finally {
        await detector.cleanup();
      }
    } catch (error) {
      console.error('❌ Baseline creation failed:', error.message);
      process.exit(1);
    }
  });

// 清理命令
program
  .command('cleanup')
  .description('Clean up old snapshots and backups')
  .option('-d, --days <days>', 'Max age in days', '30')
  .option('-b, --backups', 'Also cleanup rollback backups')
  .option('-p, --project <path>', 'Project root path', process.cwd())
  .action(async (options) => {
    try {
      const system = new StyleRecoverySystem({
        projectRoot: path.resolve(options.project)
      });
      
      await system.initialize();
      const maxAge = parseInt(options.days) * 24 * 60 * 60 * 1000;
      
      // 清理快照
      const deletedSnapshots = await system.snapshotManager.cleanupOldSnapshots(maxAge);
      console.log(`✅ Cleaned up ${deletedSnapshots} old snapshots`);
      
      // 清理回滚备份（如果指定）
      if (options.backups) {
        const deletedBackups = await system.cleanupOldBackups(maxAge);
        console.log(`✅ Cleaned up ${deletedBackups} old rollback backups`);
      }
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      process.exit(1);
    }
  });

program.parse();