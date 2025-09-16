/**
 * Style Rollback Manager Tests
 * 样式回滚管理器测试
 */

const fs = require('fs').promises;
const path = require('path');
const StyleRollbackManager = require('../rollback-manager');
const StyleSnapshotManager = require('../snapshot-manager');

describe('StyleRollbackManager', () => {
  let rollbackManager;
  let snapshotManager;
  let testDir;
  let config;

  beforeEach(async () => {
    // 创建临时测试目录
    testDir = path.join(__dirname, 'temp-rollback-test');
    await fs.mkdir(testDir, { recursive: true });

    config = {
      projectRoot: testDir,
      snapshotDir: '.kiro/style-recovery/snapshots',
      watchPatterns: ['src/**/*.css', 'src/**/*.tsx']
    };

    rollbackManager = new StyleRollbackManager(config);
    snapshotManager = new StyleSnapshotManager(config);
    
    await rollbackManager.initialize();
    await snapshotManager.initialize();
  });

  afterEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('initialization', () => {
    test('should initialize successfully', async () => {
      const manager = new StyleRollbackManager(config);
      await expect(manager.initialize()).resolves.not.toThrow();
      
      // 验证审计日志文件存在
      const auditLogPath = path.join(testDir, '.kiro/style-recovery/rollback-audit.json');
      await expect(fs.access(auditLogPath)).resolves.not.toThrow();
    });

    test('should create backup directory', async () => {
      const manager = new StyleRollbackManager(config);
      await manager.initialize();
      
      const backupDir = path.join(testDir, '.kiro/style-recovery/rollback-backups');
      await expect(fs.access(backupDir)).resolves.not.toThrow();
    });
  });

  describe('snapshot validation', () => {
    test('should validate existing snapshot', async () => {
      // 创建测试文件
      const srcDir = path.join(testDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'test.css'), '.test { color: red; }', 'utf8');

      // 创建快照
      const snapshot = await snapshotManager.createSnapshot({
        name: 'test-snapshot',
        isStable: true
      });

      // 验证快照
      const validatedSnapshot = await rollbackManager.validateSnapshot(snapshot.id);
      expect(validatedSnapshot).toBeTruthy();
      expect(validatedSnapshot.id).toBe(snapshot.id);
    });

    test('should return null for non-existent snapshot', async () => {
      const result = await rollbackManager.validateSnapshot('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('impact analysis', () => {
    test('should analyze rollback impact correctly', async () => {
      // 创建测试文件
      const srcDir = path.join(testDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'globals.css'), '.global { margin: 0; }', 'utf8');
      await fs.writeFile(path.join(srcDir, 'component.tsx'), 'export const Component = () => <div/>;', 'utf8');

      // 创建快照
      const snapshot = await snapshotManager.createSnapshot({
        name: 'test-snapshot'
      });

      // 修改文件
      await fs.writeFile(path.join(srcDir, 'globals.css'), '.global { margin: 10px; }', 'utf8');

      // 分析影响
      const analysis = await rollbackManager.analyzeRollbackImpact(snapshot);
      
      expect(analysis.totalFiles).toBe(2);
      expect(analysis.riskLevel).toBe('high'); // 因为包含 globals.css
      expect(analysis.estimatedImpact.globalStyles).toBe(true);
      expect(analysis.affectedFiles.length).toBe(2);
    });

    test('should assess file risk levels correctly', async () => {
      expect(rollbackManager.assessFileRisk('src/app/globals.css', 'modify')).toBe('high');
      expect(rollbackManager.assessFileRisk('src/app/layout.tsx', 'modify')).toBe('high');
      expect(rollbackManager.assessFileRisk('src/app/page.tsx', 'modify')).toBe('medium');
      expect(rollbackManager.assessFileRisk('src/components/Button.tsx', 'modify')).toBe('medium');
      expect(rollbackManager.assessFileRisk('src/styles/button.css', 'modify')).toBe('medium');
      expect(rollbackManager.assessFileRisk('src/utils/helper.ts', 'modify')).toBe('low');
    });
  });

  describe('pre-rollback backup', () => {
    test('should create pre-rollback backup', async () => {
      // 创建测试文件
      const srcDir = path.join(testDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'test.css'), '.test { color: blue; }', 'utf8');

      const operationId = 'test-operation-123';
      const backupId = await rollbackManager.createPreRollbackBackup(operationId);

      expect(backupId).toBe(`pre-rollback-${operationId}`);

      // 验证备份文件存在
      const backupPath = path.join(testDir, '.kiro/style-recovery/rollback-backups', backupId);
      const backupFile = path.join(backupPath, 'src/test.css');
      
      await expect(fs.access(backupFile)).resolves.not.toThrow();
      
      const backupContent = await fs.readFile(backupFile, 'utf8');
      expect(backupContent).toBe('.test { color: blue; }');

      // 验证备份元数据
      const metadataFile = path.join(backupPath, 'backup-metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf8'));
      
      expect(metadata.id).toBe(backupId);
      expect(metadata.operationId).toBe(operationId);
      expect(metadata.totalFiles).toBe(1);
    });
  });

  describe('file rollback execution', () => {
    test('should execute file rollback successfully', async () => {
      // 创建测试文件
      const srcDir = path.join(testDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'test.css'), '.test { color: red; }', 'utf8');

      // 创建快照
      const snapshot = await snapshotManager.createSnapshot({
        name: 'test-snapshot'
      });

      // 修改文件
      await fs.writeFile(path.join(srcDir, 'test.css'), '.test { color: blue; }', 'utf8');

      // 分析影响
      const impactAnalysis = await rollbackManager.analyzeRollbackImpact(snapshot);

      // 执行回滚
      const result = await rollbackManager.executeFileRollback(snapshot, impactAnalysis);

      expect(result.filesRestored).toBe(1);
      expect(result.filesSkipped).toBe(0);
      expect(result.errors.length).toBe(0);

      // 验证文件内容已恢复
      const restoredContent = await fs.readFile(path.join(srcDir, 'test.css'), 'utf8');
      expect(restoredContent).toBe('.test { color: red; }');
    });
  });

  describe('rollback verification', () => {
    test('should verify rollback success', async () => {
      // 创建测试文件
      const srcDir = path.join(testDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'test.css'), '.test { color: red; }', 'utf8');

      // 创建快照
      const snapshot = await snapshotManager.createSnapshot({
        name: 'test-snapshot'
      });

      // 验证回滚（文件内容匹配快照）
      const verification = await rollbackManager.verifyRollback(snapshot, { filesRestored: 1, errors: [] });

      expect(verification.success).toBe(true);
      expect(verification.errors.length).toBe(0);
    });

    test('should detect verification failures', async () => {
      // 创建测试文件
      const srcDir = path.join(testDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'test.css'), '.test { color: red; }', 'utf8');

      // 创建快照
      const snapshot = await snapshotManager.createSnapshot({
        name: 'test-snapshot'
      });

      // 修改文件（模拟验证失败）
      await fs.writeFile(path.join(srcDir, 'test.css'), '.test { color: blue; }', 'utf8');

      // 验证回滚
      const verification = await rollbackManager.verifyRollback(snapshot, { filesRestored: 1, errors: [] });

      expect(verification.success).toBe(true); // 仍然成功，但有警告
      expect(verification.warnings.length).toBeGreaterThan(0);
      expect(verification.warnings[0]).toContain('File hash mismatch');
    });
  });

  describe('complete rollback process', () => {
    test('should perform complete rollback successfully', async () => {
      // 创建测试文件
      const srcDir = path.join(testDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(path.join(srcDir, 'test.css'), '.test { color: red; }', 'utf8');

      // 创建快照
      const snapshot = await snapshotManager.createSnapshot({
        name: 'test-snapshot',
        isStable: true
      });

      // 修改文件
      await fs.writeFile(path.join(srcDir, 'test.css'), '.test { color: blue; }', 'utf8');

      // 执行完整回滚
      const result = await rollbackManager.rollback(snapshot.id, {
        reason: 'test-rollback'
      });

      expect(result.success).toBe(true);
      expect(result.snapshotId).toBe(snapshot.id);
      expect(result.filesRestored).toBe(1);
      expect(result.operationId).toBeTruthy();
      expect(result.backupId).toBeTruthy();

      // 验证文件内容已恢复
      const restoredContent = await fs.readFile(path.join(srcDir, 'test.css'), 'utf8');
      expect(restoredContent).toBe('.test { color: red; }');

      // 验证审计日志
      const history = await rollbackManager.getRollbackHistory(1);
      expect(history.length).toBe(1);
      expect(history[0].success).toBe(true);
      expect(history[0].snapshotId).toBe(snapshot.id);
    });

    test('should handle rollback failure gracefully', async () => {
      // 尝试回滚不存在的快照
      await expect(rollbackManager.rollback('non-existent-snapshot')).rejects.toThrow();

      // 验证失败记录在审计日志中
      const history = await rollbackManager.getRollbackHistory(1);
      expect(history.length).toBe(1);
      expect(history[0].success).toBe(false);
      expect(history[0].error).toBeTruthy();
    });
  });

  describe('audit logging', () => {
    test('should log rollback operations', async () => {
      const auditEntry = {
        operationId: 'test-op-123',
        type: 'rollback',
        timestamp: new Date().toISOString(),
        snapshotId: 'test-snapshot',
        success: true,
        duration: 1000
      };

      await rollbackManager.logRollbackOperation(auditEntry);

      const history = await rollbackManager.getRollbackHistory(1);
      expect(history.length).toBe(1);
      expect(history[0].operationId).toBe('test-op-123');
      expect(history[0].success).toBe(true);
    });

    test('should retrieve specific operation details', async () => {
      const auditEntry = {
        operationId: 'specific-op-456',
        type: 'rollback',
        timestamp: new Date().toISOString(),
        snapshotId: 'test-snapshot',
        success: true,
        duration: 1500
      };

      await rollbackManager.logRollbackOperation(auditEntry);

      const operation = await rollbackManager.getRollbackOperation('specific-op-456');
      expect(operation).toBeTruthy();
      expect(operation.operationId).toBe('specific-op-456');
      expect(operation.duration).toBe(1500);
    });

    test('should limit audit log size', async () => {
      // 添加大量操作记录
      for (let i = 0; i < 1005; i++) {
        await rollbackManager.logRollbackOperation({
          operationId: `test-op-${i}`,
          type: 'rollback',
          timestamp: new Date().toISOString(),
          success: true
        });
      }

      const history = await rollbackManager.getRollbackHistory(2000);
      expect(history.length).toBe(1000); // 应该限制在1000条
    });
  });

  describe('backup cleanup', () => {
    test('should cleanup old backups', async () => {
      // 创建一些旧的备份目录
      const backupDir = path.join(testDir, '.kiro/style-recovery/rollback-backups');
      
      const oldBackup = path.join(backupDir, 'old-backup');
      await fs.mkdir(oldBackup, { recursive: true });
      await fs.writeFile(path.join(oldBackup, 'test.txt'), 'old backup', 'utf8');
      
      // 设置旧的修改时间
      const oldTime = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10天前
      await fs.utimes(oldBackup, oldTime, oldTime);

      const newBackup = path.join(backupDir, 'new-backup');
      await fs.mkdir(newBackup, { recursive: true });
      await fs.writeFile(path.join(newBackup, 'test.txt'), 'new backup', 'utf8');

      // 清理7天以上的备份
      const cleaned = await rollbackManager.cleanupOldBackups(7 * 24 * 60 * 60 * 1000);
      
      expect(cleaned).toBe(1);
      
      // 验证旧备份被删除，新备份保留
      await expect(fs.access(oldBackup)).rejects.toThrow();
      await expect(fs.access(newBackup)).resolves.not.toThrow();
    });
  });

  describe('utility functions', () => {
    test('should generate unique operation IDs', () => {
      const id1 = rollbackManager.generateOperationId();
      const id2 = rollbackManager.generateOperationId();
      
      expect(id1).toMatch(/^rollback-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9]{8}$/);
      expect(id2).toMatch(/^rollback-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9]{8}$/);
      expect(id1).not.toBe(id2);
    });
  });
});