#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 简化的全面版本管理器（JavaScript版本，立即可用）
class ComprehensiveVersionManager {
  constructor() {
    this.projectRoot = '.';
    this.snapshotDir = '.kiro/snapshots';
    this.historyPath = '.kiro/version-history.json';
    this.configPath = '.kiro/version-config.json';
    this.ensureDirectories();
  }

  ensureDirectories() {
    const dirs = [
      this.snapshotDir,
      path.join(this.snapshotDir, 'files'),
      path.join(this.snapshotDir, 'metadata'),
      path.dirname(this.historyPath)
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async createSnapshot(description, tags = [], isStable = false) {
    const snapshotId = this.generateSnapshotId();
    const timestamp = new Date().toISOString();
    
    console.log(`📸 Creating comprehensive project snapshot: ${snapshotId}`);
    
    // 扫描所有项目文件
    const files = await this.scanProjectFiles();
    
    // 读取依赖信息
    const dependencies = this.readDependencies();
    
    // 读取项目状态
    const projectState = this.readProjectState();
    
    // 获取Git提交信息
    const gitCommit = this.getCurrentGitCommit();
    
    // 计算变更信息
    const metadata = await this.calculateChanges(files);
    
    const snapshot = {
      id: snapshotId,
      timestamp,
      version: this.generateVersion(),
      description,
      files,
      dependencies,
      projectState,
      gitCommit,
      tags,
      isStable,
      metadata
    };

    // 保存快照文件
    await this.saveSnapshot(snapshot);
    
    // 更新版本历史
    this.updateVersionHistory(snapshot);
    
    console.log(`✅ Snapshot created: ${snapshotId}`);
    console.log(`   Files: ${files.length}`);
    console.log(`   Size: ${this.formatSize(metadata.totalSize)}`);
    console.log(`   Changes: +${metadata.addedFiles.length} ~${metadata.changedFiles.length} -${metadata.deletedFiles.length}`);
    
    return snapshotId;
  }

  async scanProjectFiles() {
    const files = [];
    const config = this.getVersionConfig();
    
    for (const pattern of config.includePatterns) {
      const matchedFiles = await this.globFiles(pattern);
      
      for (const filePath of matchedFiles) {
        if (this.shouldIncludeFile(filePath, config)) {
          const fileSnapshot = await this.createFileSnapshot(filePath);
          if (fileSnapshot) {
            files.push(fileSnapshot);
          }
        }
      }
    }
    
    return files;
  }

  async createFileSnapshot(filePath) {
    try {
      const fullPath = path.resolve(this.projectRoot, filePath);
      const stats = fs.statSync(fullPath);
      
      if (!stats.isFile()) {
        return null;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      
      return {
        path: filePath,
        content,
        hash,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        type: this.determineFileType(filePath)
      };
    } catch (error) {
      console.warn(`Warning: Could not snapshot file ${filePath}:`, error.message);
      return null;
    }
  }

  determineFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath).toLowerCase();
    
    // 样式文件
    if (['.css', '.scss', '.sass', '.less', '.styl'].includes(ext)) {
      return 'style';
    }
    
    // 代码文件
    if (['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs'].includes(ext)) {
      return 'code';
    }
    
    // 配置文件
    if (['.json', '.yaml', '.yml', '.toml', '.ini', '.env'].includes(ext) ||
        ['package.json', 'tsconfig.json', 'next.config.ts', '.gitignore'].includes(basename)) {
      return 'config';
    }
    
    // 文档文件
    if (['.md', '.txt', '.rst', '.adoc'].includes(ext)) {
      return 'doc';
    }
    
    // 数据文件
    if (['.sql', '.db', '.sqlite'].includes(ext)) {
      return 'data';
    }
    
    // 资产文件
    return 'asset';
  }

  readDependencies() {
    const dependencies = {};
    
    try {
      const packageJsonPath = path.join(this.projectRoot, 'inspi-ai-platform', 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        Object.assign(dependencies, packageJson.dependencies || {});
        Object.assign(dependencies, packageJson.devDependencies || {});
      }
    } catch (error) {
      console.warn('Could not read dependencies:', error.message);
    }
    
    return dependencies;
  }

  readProjectState() {
    try {
      const statePath = path.join(this.projectRoot, '.kiro', 'project-state', 'project-state.json');
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

  async calculateChanges(currentFiles) {
    const history = this.getVersionHistory();
    const lastSnapshot = history.snapshots[history.snapshots.length - 1];
    
    const metadata = {
      totalFiles: currentFiles.length,
      totalSize: currentFiles.reduce((sum, file) => sum + file.size, 0),
      changedFiles: [],
      addedFiles: [],
      deletedFiles: []
    };

    if (!lastSnapshot) {
      metadata.addedFiles = currentFiles.map(f => f.path);
      return metadata;
    }

    const lastFileMap = new Map(lastSnapshot.files.map(f => [f.path, f]));
    const currentFileMap = new Map(currentFiles.map(f => [f.path, f]));

    // 检查新增和修改的文件
    for (const [path, file] of currentFileMap) {
      const lastFile = lastFileMap.get(path);
      if (!lastFile) {
        metadata.addedFiles.push(path);
      } else if (lastFile.hash !== file.hash) {
        metadata.changedFiles.push(path);
      }
    }

    // 检查删除的文件
    for (const [path] of lastFileMap) {
      if (!currentFileMap.has(path)) {
        metadata.deletedFiles.push(path);
      }
    }

    return metadata;
  }

  async saveSnapshot(snapshot) {
    // 保存文件内容
    const filesDir = path.join(this.snapshotDir, 'files', snapshot.id);
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }

    // 保存每个文件
    for (const file of snapshot.files) {
      const filePath = path.join(filesDir, this.sanitizeFileName(file.path));
      const fileDir = path.dirname(filePath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      fs.writeFileSync(filePath, file.content, 'utf-8');
    }

    // 保存快照元数据
    const metadataPath = path.join(this.snapshotDir, 'metadata', `${snapshot.id}.json`);
    const snapshotMetadata = {
      ...snapshot,
      files: snapshot.files.map(f => ({
        path: f.path,
        hash: f.hash,
        size: f.size,
        lastModified: f.lastModified,
        type: f.type
      })) // 不保存文件内容在元数据中
    };
    
    fs.writeFileSync(metadataPath, JSON.stringify(snapshotMetadata, null, 2), 'utf-8');
  }

  async restoreSnapshot(snapshotId, options = {}) {
    console.log(`🔄 Restoring to snapshot: ${snapshotId}`);
    
    const snapshot = await this.loadSnapshot(snapshotId);
    if (!snapshot) {
      console.error(`❌ Snapshot ${snapshotId} not found`);
      return false;
    }

    const filesToRestore = snapshot.files.filter(file => {
      if (options.includeTypes && !options.includeTypes.includes(file.type)) {
        return false;
      }
      if (options.excludePaths && options.excludePaths.some(p => file.path.includes(p))) {
        return false;
      }
      return true;
    });

    console.log(`📁 Files to restore: ${filesToRestore.length}`);

    if (options.dryRun) {
      console.log('🔍 Dry run - files that would be restored:');
      filesToRestore.forEach(file => {
        console.log(`  ${file.type}: ${file.path}`);
      });
      return true;
    }

    // 创建备份快照
    const backupId = await this.createSnapshot(
      `Backup before restore to ${snapshotId}`,
      ['backup', 'auto'],
      false
    );
    console.log(`💾 Backup created: ${backupId}`);

    // 恢复文件
    let restoredCount = 0;
    for (const file of filesToRestore) {
      try {
        const targetPath = path.resolve(this.projectRoot, file.path);
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

    console.log(`✅ Restored ${restoredCount}/${filesToRestore.length} files`);
    
    // 更新项目状态
    if (snapshot.projectState) {
      try {
        const statePath = path.join(this.projectRoot, '.kiro', 'project-state', 'project-state.json');
        fs.writeFileSync(statePath, JSON.stringify(snapshot.projectState, null, 2), 'utf-8');
        console.log('✅ Project state restored');
      } catch (error) {
        console.warn('⚠️  Could not restore project state:', error.message);
      }
    }

    return true;
  }

  async loadSnapshot(snapshotId) {
    try {
      const metadataPath = path.join(this.snapshotDir, 'metadata', `${snapshotId}.json`);
      if (!fs.existsSync(metadataPath)) {
        return null;
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      
      // 加载文件内容
      const filesDir = path.join(this.snapshotDir, 'files', snapshotId);
      const files = [];
      
      for (const fileMeta of metadata.files) {
        const filePath = path.join(filesDir, this.sanitizeFileName(fileMeta.path));
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          files.push({
            ...fileMeta,
            content
          });
        }
      }

      return {
        ...metadata,
        files
      };
    } catch (error) {
      console.error(`Error loading snapshot ${snapshotId}:`, error.message);
      return null;
    }
  }

  listSnapshots(options = {}) {
    const history = this.getVersionHistory();
    let snapshots = [...history.snapshots];

    if (options.stableOnly) {
      snapshots = snapshots.filter(s => s.isStable);
    }

    if (options.tags && options.tags.length > 0) {
      snapshots = snapshots.filter(s => 
        options.tags.some(tag => s.tags.includes(tag))
      );
    }

    snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (options.limit) {
      snapshots = snapshots.slice(0, options.limit);
    }

    return snapshots;
  }

  showSnapshots(options = {}) {
    const snapshots = this.listSnapshots(options);
    
    if (snapshots.length === 0) {
      console.log('📭 No snapshots found');
      return;
    }

    console.log('\\n📚 Project Snapshots');
    console.log('===================');
    
    snapshots.forEach(snapshot => {
      const date = new Date(snapshot.timestamp).toLocaleString();
      const stableIcon = snapshot.isStable ? '🟢' : '⚪';
      const tagsStr = snapshot.tags.length > 0 ? ` [${snapshot.tags.join(', ')}]` : '';
      
      console.log(`\\n${stableIcon} ${snapshot.id}`);
      console.log(`   📅 ${date}`);
      console.log(`   📝 ${snapshot.description}${tagsStr}`);
      console.log(`   📊 ${snapshot.metadata.totalFiles} files, ${this.formatSize(snapshot.metadata.totalSize)}`);
      
      if (snapshot.metadata.changedFiles.length > 0 || snapshot.metadata.addedFiles.length > 0 || snapshot.metadata.deletedFiles.length > 0) {
        console.log(`   🔄 Changes: +${snapshot.metadata.addedFiles.length} ~${snapshot.metadata.changedFiles.length} -${snapshot.metadata.deletedFiles.length}`);
      }
      
      if (snapshot.gitCommit) {
        console.log(`   🔗 Git: ${snapshot.gitCommit.substring(0, 8)}`);
      }
    });
  }

  getVersionConfig() {
    const defaultConfig = {
      includePatterns: [
        'inspi-ai-platform/src/**/*',
        'inspi-ai-platform/package.json',
        'inspi-ai-platform/next.config.ts',
        'inspi-ai-platform/tailwind.config.ts',
        'inspi-ai-platform/tsconfig.json',
        'inspi-ai-platform/postcss.config.mjs',
        'inspi-ai-platform/eslint.config.mjs',
        '.kiro/project-state/**/*',
        '.kiro/specs/**/*',
        '.gitignore',
        'README.md'
      ],
      excludePatterns: [
        'node_modules/**',
        '.next/**',
        'dist/**',
        'build/**',
        '*.log',
        '.kiro/snapshots/**'
      ],
      autoSnapshot: true,
      maxSnapshots: 50
    };

    try {
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        return { ...defaultConfig, ...config };
      }
    } catch (error) {
      console.warn('Could not read version config, using defaults');
    }

    // 保存默认配置
    fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    return defaultConfig;
  }

  updateVersionHistory(snapshot) {
    const history = this.getVersionHistory();
    
    history.snapshots.push(snapshot);
    
    if (snapshot.isStable) {
      history.lastStableSnapshot = snapshot.id;
    }

    // 清理旧快照
    const config = this.getVersionConfig();
    if (history.snapshots.length > config.maxSnapshots) {
      const toRemove = history.snapshots.splice(0, history.snapshots.length - config.maxSnapshots);
      toRemove.forEach(s => this.cleanupSnapshot(s.id));
    }

    fs.writeFileSync(this.historyPath, JSON.stringify(history, null, 2), 'utf-8');
  }

  getVersionHistory() {
    const defaultHistory = {
      snapshots: [],
      branches: { main: [] },
      currentBranch: 'main',
      lastStableSnapshot: null
    };

    try {
      if (fs.existsSync(this.historyPath)) {
        const history = JSON.parse(fs.readFileSync(this.historyPath, 'utf-8'));
        return { ...defaultHistory, ...history };
      }
    } catch (error) {
      console.warn('Could not read version history, using defaults');
    }

    return defaultHistory;
  }

  // 辅助方法
  generateSnapshotId() {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateVersion() {
    const now = new Date();
    return `v${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}.${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  }

  sanitizeFileName(filePath) {
    return filePath.replace(/[<>:"|?*]/g, '_').replace(/\//g, '_');
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

  async globFiles(pattern) {
    const files = [];
    
    // 处理具体文件路径（不包含通配符）
    if (!pattern.includes('*')) {
      const filePath = path.resolve(this.projectRoot, pattern);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        files.push(pattern);
      }
      return files;
    }
    
    const walkDir = (dir, currentPattern) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(this.projectRoot, fullPath);
          
          if (entry.isDirectory()) {
            if (!this.shouldExcludeDir(relativePath)) {
              walkDir(fullPath, currentPattern);
            }
          } else if (entry.isFile()) {
            if (this.matchesPattern(relativePath, pattern)) {
              files.push(relativePath);
            }
          }
        }
      } catch (error) {
        // 忽略无法访问的目录
      }
    };

    // 确定起始目录
    let startDir;
    if (pattern.includes('**')) {
      const basePath = pattern.split('**')[0].replace(/\*$/, '').replace(/\/$/, '');
      startDir = path.resolve(this.projectRoot, basePath || '.');
    } else {
      startDir = path.resolve(this.projectRoot, path.dirname(pattern));
    }
    
    if (fs.existsSync(startDir)) {
      walkDir(startDir, pattern);
    }

    return files;
  }

  matchesPattern(filePath, pattern) {
    // 简化的模式匹配，处理常见的glob模式
    if (pattern.includes('**')) {
      const parts = pattern.split('**');
      const prefix = parts[0];
      const suffix = parts[1] || '';
      
      if (prefix && !filePath.startsWith(prefix)) {
        return false;
      }
      
      if (suffix && !filePath.endsWith(suffix.replace(/^\//, ''))) {
        return false;
      }
      
      return true;
    }
    
    // 处理单个*通配符
    const regex = pattern
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');
    
    return new RegExp(`^${regex}$`).test(filePath);
  }

  shouldIncludeFile(filePath, config) {
    return !config.excludePatterns.some(pattern => 
      this.matchesPattern(filePath, pattern)
    );
  }

  shouldExcludeDir(dirPath) {
    const excludeDirs = ['node_modules', '.next', 'dist', 'build', '.git'];
    return excludeDirs.some(dir => dirPath.includes(dir));
  }

  cleanupSnapshot(snapshotId) {
    try {
      const filesDir = path.join(this.snapshotDir, 'files', snapshotId);
      const metadataPath = path.join(this.snapshotDir, 'metadata', `${snapshotId}.json`);
      
      if (fs.existsSync(filesDir)) {
        fs.rmSync(filesDir, { recursive: true, force: true });
      }
      
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }
    } catch (error) {
      console.warn(`Could not cleanup snapshot ${snapshotId}:`, error.message);
    }
  }
}

// CLI 处理
class VersionCLI {
  constructor() {
    this.versionManager = new ComprehensiveVersionManager();
  }

  async run(args) {
    const command = args[0];

    switch (command) {
      case 'snapshot':
      case 'create':
        await this.createSnapshot(args.slice(1));
        break;
      case 'list':
      case 'ls':
        this.listSnapshots(args.slice(1));
        break;
      case 'restore':
        await this.restoreSnapshot(args.slice(1));
        break;
      case 'init':
        await this.initializeVersioning();
        break;
      case 'status':
        this.showStatus();
        break;
      default:
        this.showHelp();
    }
  }

  async createSnapshot(args) {
    const description = args[0] || 'Manual snapshot';
    const isStable = args.includes('--stable');
    const tags = [];
    
    if (args.includes('--tag')) {
      const tagIndex = args.indexOf('--tag');
      if (tagIndex >= 0 && args[tagIndex + 1]) {
        tags.push(args[tagIndex + 1]);
      }
    }

    try {
      const snapshotId = await this.versionManager.createSnapshot(description, tags, isStable);
      console.log(`\\n🎉 Snapshot created successfully!`);
      console.log(`   ID: ${snapshotId}`);
      console.log(`   Use: node .kiro/version-control/version-cli.js restore ${snapshotId}`);
    } catch (error) {
      console.error('❌ Failed to create snapshot:', error.message);
    }
  }

  listSnapshots(args) {
    const options = {};
    
    if (args.includes('--stable')) {
      options.stableOnly = true;
    }
    
    if (args.includes('--limit')) {
      const limitIndex = args.indexOf('--limit');
      if (limitIndex >= 0 && args[limitIndex + 1]) {
        options.limit = parseInt(args[limitIndex + 1]);
      }
    }

    this.versionManager.showSnapshots(options);
  }

  async restoreSnapshot(args) {
    const snapshotId = args[0];
    if (!snapshotId) {
      console.error('❌ Please provide a snapshot ID');
      console.log('   Usage: restore <snapshot-id> [options]');
      return;
    }

    const options = {};
    
    if (args.includes('--dry-run')) {
      options.dryRun = true;
    }
    
    if (args.includes('--styles-only')) {
      options.includeTypes = ['style'];
    }
    
    if (args.includes('--code-only')) {
      options.includeTypes = ['code'];
    }

    try {
      const success = await this.versionManager.restoreSnapshot(snapshotId, options);
      if (success) {
        console.log('\\n🎉 Restore completed successfully!');
      }
    } catch (error) {
      console.error('❌ Failed to restore snapshot:', error.message);
    }
  }

  async initializeVersioning() {
    console.log('🚀 Initializing comprehensive version management...');
    
    try {
      // 创建第一个快照
      const snapshotId = await this.versionManager.createSnapshot(
        'Initial comprehensive snapshot - baseline for all project assets',
        ['initial', 'baseline'],
        true
      );
      
      console.log('\\n✅ Comprehensive version management initialized!');
      console.log('\\n📋 What was captured:');
      console.log('   📄 All source code files');
      console.log('   🎨 All style files (CSS, SCSS, etc.)');
      console.log('   ⚙️  All configuration files');
      console.log('   📚 All documentation');
      console.log('   📦 Dependency information');
      console.log('   📊 Project state');
      console.log('   🔗 Git commit reference');
      
      console.log('\\n💡 Available commands:');
      console.log('   node .kiro/version-control/version-cli.js list');
      console.log('   node .kiro/version-control/version-cli.js snapshot "description"');
      console.log('   node .kiro/version-control/version-cli.js restore <snapshot-id>');
      
    } catch (error) {
      console.error('❌ Failed to initialize versioning:', error.message);
    }
  }

  showStatus() {
    const history = this.versionManager.getVersionHistory();
    const config = this.versionManager.getVersionConfig();
    
    console.log('\\n📊 Version Management Status');
    console.log('============================');
    console.log(`Total Snapshots: ${history.snapshots.length}`);
    console.log(`Stable Snapshots: ${history.snapshots.filter(s => s.isStable).length}`);
    console.log(`Last Stable: ${history.lastStableSnapshot || 'None'}`);
    console.log(`Max Snapshots: ${config.maxSnapshots}`);
    console.log(`Auto Snapshot: ${config.autoSnapshot ? 'Enabled' : 'Disabled'}`);
    
    if (history.snapshots.length > 0) {
      const latest = history.snapshots[history.snapshots.length - 1];
      console.log(`\\nLatest Snapshot:`);
      console.log(`   ID: ${latest.id}`);
      console.log(`   Date: ${new Date(latest.timestamp).toLocaleString()}`);
      console.log(`   Description: ${latest.description}`);
    }
  }

  showHelp() {
    console.log('\\n🛠️  Comprehensive Version Management CLI');
    console.log('========================================');
    console.log('Commands:');
    console.log('  init                              - Initialize version management');
    console.log('  snapshot <description> [options]  - Create new snapshot');
    console.log('  list [options]                    - List all snapshots');
    console.log('  restore <snapshot-id> [options]   - Restore to snapshot');
    console.log('  status                            - Show version status');
    console.log('\\nSnapshot Options:');
    console.log('  --stable                          - Mark as stable snapshot');
    console.log('  --tag <tag>                       - Add tag to snapshot');
    console.log('\\nList Options:');
    console.log('  --stable                          - Show only stable snapshots');
    console.log('  --limit <n>                       - Limit number of results');
    console.log('\\nRestore Options:');
    console.log('  --dry-run                         - Show what would be restored');
    console.log('  --styles-only                     - Restore only style files');
    console.log('  --code-only                       - Restore only code files');
    console.log('\\nExamples:');
    console.log('  node .kiro/version-control/version-cli.js init');
    console.log('  node .kiro/version-control/version-cli.js snapshot "Fixed homepage styles" --stable');
    console.log('  node .kiro/version-control/version-cli.js list --stable --limit 5');
    console.log('  node .kiro/version-control/version-cli.js restore snapshot_123 --styles-only');
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const cli = new VersionCLI();
  const args = process.argv.slice(2);
  cli.run(args).catch(error => {
    console.error('❌ CLI Error:', error.message);
    process.exit(1);
  });
}

module.exports = { ComprehensiveVersionManager, VersionCLI };