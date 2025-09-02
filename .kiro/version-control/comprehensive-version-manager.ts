import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface FileSnapshot {
  path: string;
  content: string;
  hash: string;
  size: number;
  lastModified: string;
  type: 'code' | 'style' | 'config' | 'data' | 'doc' | 'asset';
}

export interface ProjectSnapshot {
  id: string;
  timestamp: string;
  version: string;
  description: string;
  files: FileSnapshot[];
  dependencies: {
    [packageName: string]: string;
  };
  projectState: any;
  gitCommit?: string;
  tags: string[];
  isStable: boolean;
  metadata: {
    totalFiles: number;
    totalSize: number;
    changedFiles: string[];
    addedFiles: string[];
    deletedFiles: string[];
  };
}

export interface VersionHistory {
  snapshots: ProjectSnapshot[];
  branches: {
    [branchName: string]: string[]; // snapshot IDs
  };
  currentBranch: string;
  lastStableSnapshot: string | null;
}

export class ComprehensiveVersionManager {
  private snapshotDir: string;
  private historyPath: string;
  private configPath: string;
  private projectRoot: string;

  constructor(projectRoot: string = '.') {
    this.projectRoot = projectRoot;
    this.snapshotDir = path.join(projectRoot, '.kiro', 'snapshots');
    this.historyPath = path.join(projectRoot, '.kiro', 'version-history.json');
    this.configPath = path.join(projectRoot, '.kiro', 'version-config.json');
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
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

  /**
   * 创建完整的项目快照
   */
  public async createSnapshot(
    description: string,
    tags: string[] = [],
    isStable: boolean = false
  ): Promise<string> {
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
    
    const snapshot: ProjectSnapshot = {
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

  /**
   * 扫描项目中的所有相关文件
   */
  private async scanProjectFiles(): Promise<FileSnapshot[]> {
    const files: FileSnapshot[] = [];
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

  /**
   * 创建单个文件的快照
   */
  private async createFileSnapshot(filePath: string): Promise<FileSnapshot | null> {
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
      console.warn(`Warning: Could not snapshot file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * 确定文件类型
   */
  private determineFileType(filePath: string): FileSnapshot['type'] {
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

  /**
   * 读取依赖信息
   */
  private readDependencies(): { [packageName: string]: string } {
    const dependencies: { [packageName: string]: string } = {};
    
    try {
      const packageJsonPath = path.join(this.projectRoot, 'inspi-ai-platform', 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        Object.assign(dependencies, packageJson.dependencies || {});
        Object.assign(dependencies, packageJson.devDependencies || {});
      }
    } catch (error) {
      console.warn('Could not read dependencies:', error);
    }
    
    return dependencies;
  }

  /**
   * 读取项目状态
   */
  private readProjectState(): any {
    try {
      const statePath = path.join(this.projectRoot, '.kiro', 'project-state', 'project-state.json');
      if (fs.existsSync(statePath)) {
        return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      }
    } catch (error) {
      console.warn('Could not read project state:', error);
    }
    return null;
  }

  /**
   * 获取当前Git提交
   */
  private getCurrentGitCommit(): string | undefined {
    try {
      const { execSync } = require('child_process');
      return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch (error) {
      return undefined;
    }
  }

  /**
   * 计算变更信息
   */
  private async calculateChanges(currentFiles: FileSnapshot[]): Promise<ProjectSnapshot['metadata']> {
    const history = this.getVersionHistory();
    const lastSnapshot = history.snapshots[history.snapshots.length - 1];
    
    const metadata = {
      totalFiles: currentFiles.length,
      totalSize: currentFiles.reduce((sum, file) => sum + file.size, 0),
      changedFiles: [] as string[],
      addedFiles: [] as string[],
      deletedFiles: [] as string[]
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

  /**
   * 保存快照到磁盘
   */
  private async saveSnapshot(snapshot: ProjectSnapshot): Promise<void> {
    // 保存文件内容（压缩存储）
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

  /**
   * 恢复到指定快照
   */
  public async restoreSnapshot(snapshotId: string, options: {
    includeTypes?: FileSnapshot['type'][];
    excludePaths?: string[];
    dryRun?: boolean;
  } = {}): Promise<boolean> {
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
        console.error(`❌ Failed to restore ${file.path}:`, error);
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
        console.warn('⚠️  Could not restore project state:', error);
      }
    }

    return true;
  }

  /**
   * 加载快照
   */
  private async loadSnapshot(snapshotId: string): Promise<ProjectSnapshot | null> {
    try {
      const metadataPath = path.join(this.snapshotDir, 'metadata', `${snapshotId}.json`);
      if (!fs.existsSync(metadataPath)) {
        return null;
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      
      // 加载文件内容
      const filesDir = path.join(this.snapshotDir, 'files', snapshotId);
      const files: FileSnapshot[] = [];
      
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
      console.error(`Error loading snapshot ${snapshotId}:`, error);
      return null;
    }
  }

  /**
   * 列出所有快照
   */
  public listSnapshots(options: {
    limit?: number;
    tags?: string[];
    stableOnly?: boolean;
  } = {}): ProjectSnapshot[] {
    const history = this.getVersionHistory();
    let snapshots = [...history.snapshots];

    if (options.stableOnly) {
      snapshots = snapshots.filter(s => s.isStable);
    }

    if (options.tags && options.tags.length > 0) {
      snapshots = snapshots.filter(s => 
        options.tags!.some(tag => s.tags.includes(tag))
      );
    }

    snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (options.limit) {
      snapshots = snapshots.slice(0, options.limit);
    }

    return snapshots;
  }

  /**
   * 获取版本配置
   */
  private getVersionConfig(): {
    includePatterns: string[];
    excludePatterns: string[];
    autoSnapshot: boolean;
    maxSnapshots: number;
  } {
    const defaultConfig = {
      includePatterns: [
        'inspi-ai-platform/src/**/*',
        'inspi-ai-platform/package.json',
        'inspi-ai-platform/next.config.ts',
        'inspi-ai-platform/tailwind.config.ts',
        'inspi-ai-platform/tsconfig.json',
        '.kiro/**/*',
        '.gitignore'
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

  /**
   * 更新版本历史
   */
  private updateVersionHistory(snapshot: ProjectSnapshot): void {
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

  /**
   * 获取版本历史
   */
  private getVersionHistory(): VersionHistory {
    const defaultHistory: VersionHistory = {
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
  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateVersion(): string {
    const now = new Date();
    return `v${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}.${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  }

  private sanitizeFileName(filePath: string): string {
    return filePath.replace(/[<>:"|?*]/g, '_').replace(/\//g, '_');
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private async globFiles(pattern: string): Promise<string[]> {
    // 简化的glob实现
    const files: string[] = [];
    const walkDir = (dir: string, basePattern: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(this.projectRoot, fullPath);
          
          if (entry.isDirectory()) {
            if (!this.shouldExcludeDir(relativePath)) {
              walkDir(fullPath, basePattern);
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

    const basePath = pattern.includes('**') ? 
      pattern.split('**')[0].replace(/\*$/, '') : 
      path.dirname(pattern);
    
    const startDir = path.resolve(this.projectRoot, basePath || '.');
    if (fs.existsSync(startDir)) {
      walkDir(startDir, pattern);
    }

    return files;
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    // 简化的模式匹配
    const regex = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');
    
    return new RegExp(`^${regex}$`).test(filePath);
  }

  private shouldIncludeFile(filePath: string, config: any): boolean {
    return !config.excludePatterns.some((pattern: string) => 
      this.matchesPattern(filePath, pattern)
    );
  }

  private shouldExcludeDir(dirPath: string): boolean {
    const excludeDirs = ['node_modules', '.next', 'dist', 'build', '.git'];
    return excludeDirs.some(dir => dirPath.includes(dir));
  }

  private cleanupSnapshot(snapshotId: string): void {
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
      console.warn(`Could not cleanup snapshot ${snapshotId}:`, error);
    }
  }
}