/**
 * 版本回滚脚本测试
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const VersionRollbackManager = require('../version-rollback');

// Mock dependencies
jest.mock('child_process');
jest.mock('fs');
jest.mock('readline');

describe('VersionRollbackManager', () => {
  let manager;
  let mockExecSync;
  let mockFs;

  beforeEach(() => {
    manager = new VersionRollbackManager();
    mockExecSync = execSync;
    mockFs = fs;
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
    console.warn.mockRestore();
  });

  describe('getCurrentVersion', () => {
    it('should return current version from package.json', () => {
      const mockPackageJson = { version: '0.3.1' };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));
      
      const version = manager.getCurrentVersion();
      
      expect(version).toBe('0.3.1');
    });

    it('should throw error when package.json read fails', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      
      expect(() => manager.getCurrentVersion()).toThrow('无法读取当前版本: File not found');
    });
  });

  describe('getAvailableVersions', () => {
    it('should return available version tags', () => {
      mockExecSync.mockReturnValue('v0.3.1\nv0.3.0\nv0.2.0\n');
      
      const versions = manager.getAvailableVersions();
      
      expect(versions).toEqual(['v0.3.1', 'v0.3.0', 'v0.2.0']);
      expect(mockExecSync).toHaveBeenCalledWith(
        'git tag -l "v*" --sort=-version:refname',
        { encoding: 'utf8' }
      );
    });

    it('should return empty array when no tags exist', () => {
      mockExecSync.mockReturnValue('');
      
      const versions = manager.getAvailableVersions();
      
      expect(versions).toEqual([]);
    });

    it('should throw error when git command fails', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });
      
      expect(() => manager.getAvailableVersions()).toThrow('获取版本标签失败: Git command failed');
    });
  });

  describe('validateTargetVersion', () => {
    it('should validate existing version with v prefix', () => {
      mockExecSync.mockReturnValue('v0.3.1\nv0.3.0\nv0.2.0\n');
      
      const tag = manager.validateTargetVersion('v0.3.0');
      
      expect(tag).toBe('v0.3.0');
    });

    it('should validate existing version without v prefix', () => {
      mockExecSync.mockReturnValue('v0.3.1\nv0.3.0\nv0.2.0\n');
      
      const tag = manager.validateTargetVersion('0.3.0');
      
      expect(tag).toBe('v0.3.0');
    });

    it('should throw error for non-existent version', () => {
      mockExecSync.mockReturnValue('v0.3.1\nv0.3.0\n');
      
      expect(() => manager.validateTargetVersion('0.1.0')).toThrow(
        '版本 0.1.0 不存在。可用版本: v0.3.1, v0.3.0'
      );
    });
  });

  describe('checkWorkingDirectory', () => {
    it('should return clean status when working directory is clean', () => {
      mockExecSync.mockReturnValue('');
      
      const status = manager.checkWorkingDirectory();
      
      expect(status).toEqual({ clean: true, modifiedFiles: [] });
    });

    it('should return dirty status with modified files', () => {
      mockExecSync.mockReturnValue(' M package.json\n?? new-file.js\n');
      
      const status = manager.checkWorkingDirectory();
      
      expect(status).toEqual({
        clean: false,
        modifiedFiles: ['package.json', 'new-file.js']
      });
    });

    it('should throw error when git status fails', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git status failed');
      });
      
      expect(() => manager.checkWorkingDirectory()).toThrow(
        '检查工作目录状态失败: Git status failed'
      );
    });
  });

  describe('createBackup', () => {
    beforeEach(() => {
      // Mock file system operations
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {});
      mockFs.copyFileSync.mockImplementation(() => {});
      mockFs.writeFileSync.mockImplementation(() => {});
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '0.3.1' }));
      
      // Mock git commands
      mockExecSync
        .mockReturnValueOnce('main') // current branch
        .mockReturnValueOnce('abc123def456'); // current commit
    });

    it('should create backup successfully', () => {
      const backupInfo = manager.createBackup('v0.3.0');
      
      expect(backupInfo).toMatchObject({
        fromVersion: '0.3.1',
        toVersion: '0.3.0',
        currentBranch: 'main',
        currentCommit: 'abc123def456'
      });
      
      expect(mockFs.mkdirSync).toHaveBeenCalled();
      expect(mockFs.copyFileSync).toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should throw error when backup creation fails', () => {
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Directory creation failed');
      });
      
      expect(() => manager.createBackup('v0.3.0')).toThrow(
        '创建备份失败: Directory creation failed'
      );
    });
  });

  describe('logRollback', () => {
    it('should log rollback operation successfully', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.writeFileSync.mockImplementation(() => {});
      
      const rollbackInfo = {
        timestamp: '2025-01-04T10:30:00.000Z',
        fromVersion: '0.3.1',
        toVersion: '0.3.0',
        success: true
      };
      
      manager.logRollback(rollbackInfo);
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('rollback-log.json'),
        expect.stringContaining('"success": true')
      );
    });

    it('should append to existing log file', () => {
      const existingLogs = [{ timestamp: '2025-01-03T10:00:00.000Z' }];
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(existingLogs));
      mockFs.writeFileSync.mockImplementation(() => {});
      
      const rollbackInfo = {
        timestamp: '2025-01-04T10:30:00.000Z',
        fromVersion: '0.3.1',
        toVersion: '0.3.0',
        success: true
      };
      
      manager.logRollback(rollbackInfo);
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"timestamp": "2025-01-04T10:30:00.000Z"')
      );
    });

    it('should handle logging errors gracefully', () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });
      
      const rollbackInfo = { timestamp: '2025-01-04T10:30:00.000Z' };
      
      // Should not throw
      expect(() => manager.logRollback(rollbackInfo)).not.toThrow();
      expect(console.warn).toHaveBeenCalledWith('记录回滚日志失败: Write failed');
    });
  });

  describe('showRollbackHistory', () => {
    it('should display rollback history', () => {
      const mockLogs = [
        {
          timestamp: '2025-01-04T10:30:00.000Z',
          fromVersion: '0.3.1',
          toVersion: '0.3.0',
          success: true,
          reason: 'Bug fix'
        },
        {
          timestamp: '2025-01-03T10:00:00.000Z',
          fromVersion: '0.3.0',
          toVersion: '0.2.0',
          success: false,
          reason: 'Test rollback'
        }
      ];
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockLogs));
      
      manager.showRollbackHistory();
      
      expect(console.log).toHaveBeenCalledWith('📋 版本回滚历史\n');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('时间                | 版本变更        | 状态 | 原因')
      );
    });

    it('should handle missing log file', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      manager.showRollbackHistory();
      
      expect(console.log).toHaveBeenCalledWith('❌ 未找到回滚历史记录');
    });

    it('should handle empty log file', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('[]');
      
      manager.showRollbackHistory();
      
      expect(console.log).toHaveBeenCalledWith('❌ 暂无回滚历史记录');
    });
  });

  describe('listBackups', () => {
    it('should list available backups', () => {
      mockFs.existsSync
        .mockReturnValueOnce(true) // backup directory exists
        .mockReturnValueOnce(true); // backup info file exists
      
      mockFs.readdirSync.mockReturnValue([
        'backup-0.3.1-to-0.3.0-2025-01-04T10-30-00-000Z',
        'other-file.txt'
      ]);
      
      const backupInfo = {
        timestamp: '2025-01-04T10:30:00.000Z',
        fromVersion: '0.3.1',
        toVersion: '0.3.0'
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(backupInfo));
      
      manager.listBackups();
      
      expect(console.log).toHaveBeenCalledWith('📦 可用的回滚备份\n');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('备份名称                                    | 创建时间         | 版本变更')
      );
    });

    it('should handle missing backup directory', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      manager.listBackups();
      
      expect(console.log).toHaveBeenCalledWith('❌ 未找到备份目录');
    });

    it('should handle empty backup directory', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([]);
      
      manager.listBackups();
      
      expect(console.log).toHaveBeenCalledWith('❌ 暂无可用备份');
    });
  });

  describe('validateSystemState', () => {
    it('should validate system state successfully', () => {
      // Mock successful git status
      mockExecSync.mockReturnValueOnce('');
      
      // Mock valid package.json
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '0.3.1' }));
      
      // Mock node_modules exists
      mockFs.existsSync.mockReturnValue(true);
      
      const checks = manager.validateSystemState();
      
      expect(checks).toHaveLength(3);
      expect(checks[0]).toMatchObject({ name: 'Git仓库', status: 'ok' });
      expect(checks[1]).toMatchObject({ name: 'package.json', status: 'ok' });
      expect(checks[2]).toMatchObject({ name: 'node_modules', status: 'ok' });
    });

    it('should detect git repository issues', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });
      
      const checks = manager.validateSystemState();
      
      expect(checks[0]).toMatchObject({ name: 'Git仓库', status: 'error' });
    });

    it('should detect package.json issues', () => {
      mockExecSync.mockReturnValue(''); // git ok
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      
      const checks = manager.validateSystemState();
      
      expect(checks[1]).toMatchObject({ name: 'package.json', status: 'error' });
    });

    it('should detect missing node_modules', () => {
      mockExecSync.mockReturnValue(''); // git ok
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '0.3.1' })); // package.json ok
      mockFs.existsSync.mockReturnValue(false); // node_modules missing
      
      const checks = manager.validateSystemState();
      
      expect(checks[2]).toMatchObject({ name: 'node_modules', status: 'warning' });
    });
  });

  describe('performRollback', () => {
    beforeEach(() => {
      // Mock successful validation
      mockExecSync.mockReturnValue('v0.3.1\nv0.3.0\nv0.2.0\n'); // available versions
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '0.3.1' })); // current version
      mockExecSync.mockReturnValueOnce(''); // clean working directory
      
      // Mock backup creation
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {});
      mockFs.copyFileSync.mockImplementation(() => {});
      mockFs.writeFileSync.mockImplementation(() => {});
      mockExecSync
        .mockReturnValueOnce('main') // current branch
        .mockReturnValueOnce('abc123def456'); // current commit
    });

    it('should perform rollback successfully', async () => {
      // Mock git operations
      mockExecSync
        .mockReturnValueOnce('') // git checkout
        .mockReturnValueOnce('') // git add
        .mockReturnValueOnce('') // git commit
        .mockReturnValueOnce('main') // current branch after rollback
        .mockReturnValueOnce('def456'); // current commit after rollback
      
      const result = await manager.performRollback('0.3.0', { skipBackup: true });
      
      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith('✅ 版本回滚完成!');
    });

    it('should handle dirty working directory without force', async () => {
      // Mock dirty working directory
      mockExecSync.mockReturnValueOnce(' M package.json\n'); // dirty status
      
      const result = await manager.performRollback('0.3.0');
      
      expect(result).toBe(false);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('工作目录不干净')
      );
    });

    it('should handle rollback failure', async () => {
      // Mock git checkout failure
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Git checkout failed');
      });
      
      const result = await manager.performRollback('0.3.0', { skipBackup: true });
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('版本回滚失败')
      );
    });

    it('should create backup by default', async () => {
      const result = await manager.performRollback('0.3.0');
      
      expect(mockFs.mkdirSync).toHaveBeenCalled(); // backup directory created
      expect(mockFs.copyFileSync).toHaveBeenCalled(); // package.json backed up
    });
  });
});