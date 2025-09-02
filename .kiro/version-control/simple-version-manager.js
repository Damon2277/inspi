#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SimpleVersionManager {
  constructor() {
    this.projectRoot = '.';
    this.snapshotDir = '.kiro/snapshots';
    this.historyPath = '.kiro/version-history.json';
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.snapshotDir)) {
      fs.mkdirSync(this.snapshotDir, { recursive: true });
    }
  }

  async createSnapshot(description, isStable = false) {
    const snapshotId = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    console.log(`📸 Creating project snapshot: ${snapshotId}`);
    
    // 定义要备份的关键文件和目录
    const criticalPaths = [
      'inspi-ai-platform/src/app/page.tsx',
      'inspi-ai-platform/src/app/layout.tsx', 
      'inspi-ai-platform/src/app/globals.css',
      'inspi-ai-platform/src/app/create/page.tsx',
      'inspi-ai-platform/package.json',
      'inspi-ai-platform/next.config.ts',
      'inspi-ai-platform/tailwind.config.ts',
      'inspi-ai-platform/tsconfig.json',
      '.kiro/project-state/project-state.json',
      '.gitignore'
    ];

    const files = [];
    let totalSize = 0;

    // 收集所有文件
    for (const filePath of criticalPaths) {
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const stats = fs.statSync(filePath);
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          
          files.push({
            path: filePath,
            content,
            hash,
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
            type: this.getFileType(filePath)
          });
          
          totalSize += stats.size;
        } catch (error) {
          console.warn(`Warning: Could not backup ${filePath}:`, error.message);
        }
      }
    }

    // 扫描src目录下的所有文件
    const srcFiles = this.scanDirectory('inspi-ai-platform/src');
    for (const file of srcFiles) {
      if (!files.some(f => f.path === file.path)) {
        files.push(file);
        totalSize += file.size;
      }
    }

    // 读取项目状态
    const projectState = this.readProjectState();
    const gitCommit = this.getCurrentGitCommit();

    const snapshot = {
      id: snapshotId,
      timestamp,
      description,
      files,
      projectState,
      gitCommit,
      isStable,
      metadata: {
        totalFiles: files.length,
        totalSize,
        fileTypes: this.analyzeFileTypes(files)
      }
    };

    // 保存快照
    const snapshotPath = path.join(this.snapshotDir, `${snapshotId}.json`);
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');

    // 更新历史
    this.updateHistory(snapshot);

    console.log(`✅ Snapshot created: ${snapshotId}`);
    console.log(`   Files: ${files.length}`);
    console.log(`   Size: ${this.formatSize(totalSize)}`);
    console.log(`   Types: ${Object.keys(snapshot.metadata.fileTypes).join(', ')}`);

    return snapshotId;
  }

  scanDirectory(dirPath) {
    const files = [];
    
    if (!fs.existsSync(dirPath)) {
      return files;
    }

    const scanRecursive = (currentPath) => {
      try {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          
          if (entry.isDirectory()) {
            // 跳过某些目录
            if (!['node_modules', '.next', 'dist', 'build', '__tests__'].includes(entry.name)) {
              scanRecursive(fullPath);
            }
          } else if (entry.isFile()) {
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              const stats = fs.statSync(fullPath);
              const hash = crypto.createHash('sha256').update(content).digest('hex');
              
              files.push({
                path: fullPath,
                content,
                hash,
                size: stats.size,
                lastModified: stats.mtime.toISOString(),
                type: this.getFileType(fullPath)
              });
            } catch (error) {
              console.warn(`Warning: Could not read ${fullPath}:`, error.message);
            }
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not scan ${currentPath}:`, error.message);
      }
    };

    scanRecursive(dirPath);
    return files;
  }

  getFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (['.css', '.scss', '.sass'].includes(ext)) return 'style';
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) return 'code';
    if (['.json', '.yaml', '.yml'].includes(ext)) return 'config';
    if (['.md', '.txt'].includes(ext)) return 'doc';
    
    return 'other';
  }

  analyzeFileTypes(files) {
    const types = {};
    files.forEach(file => {
      types[file.type] = (types[file.type] || 0) + 1;
    });
    return types;
  }

  readProjectState() {
    try {
      const statePath = '.kiro/project-state/project-state.json';
      if (fs.existsSync(statePath)) {
        return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      }
    } catch (error) {
      console.warn('Could not read project state:', error.message);
    }
    return null;
  }

  getCurrentGitCommit() {
    try {
      const { execSync } = require('child_process');
      return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch (error) {
      return undefined;
    }
  }

  updateHistory(snapshot) {
    let history = { snapshots: [] };
    
    try {
      if (fs.existsSync(this.historyPath)) {
        history = JSON.parse(fs.readFileSync(this.historyPath, 'utf-8'));
      }
    } catch (error) {
      console.warn('Could not read history, creating new');
    }

    history.snapshots.push({
      id: snapshot.id,
      timestamp: snapshot.timestamp,
      description: snapshot.description,
      isStable: snapshot.isStable,
      metadata: snapshot.metadata,
      gitCommit: snapshot.gitCommit
    });

    // 保持最近50个快照
    if (history.snapshots.length > 50) {
      const removed = history.snapshots.shift();
      this.cleanupSnapshot(removed.id);
    }

    fs.writeFileSync(this.historyPath, JSON.stringify(history, null, 2), 'utf-8');
  }

  async restoreSnapshot(snapshotId, options = {}) {
    console.log(`🔄 Restoring to snapshot: ${snapshotId}`);
    
    const snapshotPath = path.join(this.snapshotDir, `${snapshotId}.json`);
    if (!fs.existsSync(snapshotPath)) {
      console.error(`❌ Snapshot ${snapshotId} not found`);
      return false;
    }

    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
    
    // 创建备份
    const backupId = await this.createSnapshot(`Backup before restore to ${snapshotId}`, false);
    console.log(`💾 Backup created: ${backupId}`);

    let restoredCount = 0;
    
    for (const file of snapshot.files) {
      try {
        // 过滤选项
        if (options.stylesOnly && file.type !== 'style') continue;
        if (options.codeOnly && file.type !== 'code') continue;
        
        const targetPath = file.path;
        const targetDir = path.dirname(targetPath);
        
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        fs.writeFileSync(targetPath, file.content, 'utf-8');
        restoredCount++;
      } catch (error) {
        console.error(`❌ Failed to restore ${file.path}:`, error.message);
      }
    }

    // 恢复项目状态
    if (snapshot.projectState) {
      try {
        const statePath = '.kiro/project-state/project-state.json';
        fs.writeFileSync(statePath, JSON.stringify(snapshot.projectState, null, 2), 'utf-8');
        console.log('✅ Project state restored');
      } catch (error) {
        console.warn('⚠️  Could not restore project state:', error.message);
      }
    }

    console.log(`✅ Restored ${restoredCount} files`);
    return true;
  }

  listSnapshots() {
    let history = { snapshots: [] };
    
    try {
      if (fs.existsSync(this.historyPath)) {
        history = JSON.parse(fs.readFileSync(this.historyPath, 'utf-8'));
      }
    } catch (error) {
      console.warn('Could not read history');
      return [];
    }

    return history.snapshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  showSnapshots() {
    const snapshots = this.listSnapshots();
    
    if (snapshots.length === 0) {
      console.log('📭 No snapshots found');
      return;
    }

    console.log('\\n📚 Project Snapshots');
    console.log('===================');
    
    snapshots.forEach(snapshot => {
      const date = new Date(snapshot.timestamp).toLocaleString();
      const stableIcon = snapshot.isStable ? '🟢' : '⚪';
      
      console.log(`\\n${stableIcon} ${snapshot.id}`);
      console.log(`   📅 ${date}`);
      console.log(`   📝 ${snapshot.description}`);
      console.log(`   📊 ${snapshot.metadata.totalFiles} files, ${this.formatSize(snapshot.metadata.totalSize)}`);
      
      if (snapshot.gitCommit) {
        console.log(`   🔗 Git: ${snapshot.gitCommit.substring(0, 8)}`);
      }
    });
  }

  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  cleanupSnapshot(snapshotId) {
    try {
      const snapshotPath = path.join(this.snapshotDir, `${snapshotId}.json`);
      if (fs.existsSync(snapshotPath)) {
        fs.unlinkSync(snapshotPath);
      }
    } catch (error) {
      console.warn(`Could not cleanup snapshot ${snapshotId}:`, error.message);
    }
  }
}

// CLI处理
async function main() {
  const versionManager = new SimpleVersionManager();
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'init':
        console.log('🚀 Initializing comprehensive version management...');
        const snapshotId = await versionManager.createSnapshot(
          'Initial comprehensive snapshot - all project assets baseline',
          true
        );
        console.log('\\n✅ Version management initialized!');
        console.log(`\\n💡 Commands:`);
        console.log(`   node .kiro/version-control/simple-version-manager.js list`);
        console.log(`   node .kiro/version-control/simple-version-manager.js snapshot "description"`);
        console.log(`   node .kiro/version-control/simple-version-manager.js restore ${snapshotId}`);
        break;

      case 'snapshot':
        const description = args[1] || 'Manual snapshot';
        const isStable = args.includes('--stable');
        await versionManager.createSnapshot(description, isStable);
        break;

      case 'list':
        versionManager.showSnapshots();
        break;

      case 'restore':
        const snapshotId2 = args[1];
        if (!snapshotId2) {
          console.error('❌ Please provide a snapshot ID');
          return;
        }
        const options = {
          stylesOnly: args.includes('--styles-only'),
          codeOnly: args.includes('--code-only')
        };
        await versionManager.restoreSnapshot(snapshotId2, options);
        break;

      default:
        console.log('\\n🛠️  Simple Version Management CLI');
        console.log('==================================');
        console.log('Commands:');
        console.log('  init                              - Initialize version management');
        console.log('  snapshot <description> [--stable] - Create new snapshot');
        console.log('  list                              - List all snapshots');
        console.log('  restore <snapshot-id> [options]   - Restore to snapshot');
        console.log('\\nRestore Options:');
        console.log('  --styles-only                     - Restore only style files');
        console.log('  --code-only                       - Restore only code files');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = SimpleVersionManager;