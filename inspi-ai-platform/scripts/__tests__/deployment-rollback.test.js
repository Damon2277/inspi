const DeploymentRollback = require('../deployment-rollback');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Mock child_process
jest.mock('child_process', () => ({
  execSync: jest.fn(),
  spawn: jest.fn()
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn()
}));

describe('DeploymentRollback', () => {
  let rollback;
  const testBackupDir = './.test-backups';

  beforeEach(() => {
    jest.clearAllMocks();
    rollback = new DeploymentRollback({
      verbose: false,
      dryRun: false,
      backupDir: testBackupDir
    });
  });

  describe('constructor', () => {
    it('should use default options', () => {
      const defaultRollback = new DeploymentRollback();
      expect(defaultRollback.verbose).toBe(false);
      expect(defaultRollback.dryRun).toBe(false);
      expect(defaultRollback.backupDir).toBe('./.deployment-backups');
    });

    it('should use custom options', () => {
      const customRollback = new DeploymentRollback({
        verbose: true,
        dryRun: true,
        backupDir: './custom-backups'
      });
      
      expect(customRollback.verbose).toBe(true);
      expect(customRollback.dryRun).toBe(true);
      expect(customRollback.backupDir).toBe('./custom-backups');
    });
  });

  describe('exec', () => {
    it('should execute command successfully', () => {
      execSync.mockReturnValue('success output');
      
      const result = rollback.exec('test command');
      
      expect(execSync).toHaveBeenCalledWith('test command', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      expect(result).toBe('success output');
    });

    it('should handle command failure', () => {
      execSync.mockImplementation(() => {
        throw new Error('Command failed');
      });
      
      expect(() => rollback.exec('failing command'))
        .toThrow('Command failed: failing command');
    });

    it('should not execute in dry run mode', () => {
      const dryRunRollback = new DeploymentRollback({ dryRun: true });
      
      const result = dryRunRollback.exec('test command');
      
      expect(execSync).not.toHaveBeenCalled();
      expect(result).toBe('');
    });

    it('should use verbose mode', () => {
      const verboseRollback = new DeploymentRollback({ verbose: true });
      execSync.mockReturnValue('output');
      
      verboseRollback.exec('test command');
      
      expect(execSync).toHaveBeenCalledWith('test command', {
        encoding: 'utf8',
        stdio: 'inherit'
      });
    });
  });

  describe('createBackup', () => {
    beforeEach(() => {
      fs.existsSync.mockReturnValue(false);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        name: 'test-app',
        version: '1.0.0'
      }));
      execSync.mockImplementation((cmd) => {
        if (cmd === 'git rev-parse HEAD') return 'abc123def456';
        if (cmd === 'git rev-parse --abbrev-ref HEAD') return 'main';
        return '';
      });
    });

    it('should create backup successfully', async () => {
      const backupPath = await rollback.createBackup('1.0.0');
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(testBackupDir, { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(backupPath).toContain('backup-1.0.0-');
    });

    it('should not create backup directory if it exists', async () => {
      fs.existsSync.mockReturnValue(true);
      
      await rollback.createBackup('1.0.0');
      
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should include correct backup data', async () => {
      await rollback.createBackup('1.0.0');
      
      const writeCall = fs.writeFileSync.mock.calls[0];
      const backupData = JSON.parse(writeCall[1]);
      
      expect(backupData.version).toBe('1.0.0');
      expect(backupData.packageJson.name).toBe('test-app');
      expect(backupData.gitCommit).toBe('abc123def456');
      expect(backupData.gitBranch).toBe('main');
    });
  });

  describe('getPreviousStableVersion', () => {
    it('should find previous stable version', () => {
      execSync.mockReturnValue('v2.0.0\nv1.1.0\nv1.0.0\nv0.9.0');
      
      const previousVersion = rollback.getPreviousStableVersion('1.1.0');
      
      expect(previousVersion).toBe('1.0.0');
    });

    it('should throw error if current version not found', () => {
      execSync.mockReturnValue('v2.0.0\nv1.0.0');
      
      expect(() => rollback.getPreviousStableVersion('1.5.0'))
        .toThrow('Current version 1.5.0 not found in git tags');
    });

    it('should throw error if no previous version exists', () => {
      execSync.mockReturnValue('v1.0.0');
      
      expect(() => rollback.getPreviousStableVersion('1.0.0'))
        .toThrow('No previous stable version found');
    });

    it('should filter out non-stable versions', () => {
      execSync.mockReturnValue('v2.0.0-beta\nv1.1.0\nv1.0.0-alpha\nv0.9.0');
      
      const previousVersion = rollback.getPreviousStableVersion('1.1.0');
      
      expect(previousVersion).toBe('0.9.0');
    });
  });

  describe('rollbackToVersion', () => {
    beforeEach(() => {
      fs.readFileSync.mockReturnValue(JSON.stringify({
        name: 'test-app',
        version: '2.0.0'
      }));
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git rev-parse HEAD')) return 'abc123';
        if (cmd.includes('git rev-parse --abbrev-ref HEAD')) return 'main';
        return '';
      });
    });

    it('should rollback to target version successfully', async () => {
      const targetVersion = await rollback.rollbackToVersion('1.0.0');
      
      expect(execSync).toHaveBeenCalledWith('git checkout v1.0.0');
      expect(execSync).toHaveBeenCalledWith('pnpm install --frozen-lockfile');
      expect(execSync).toHaveBeenCalledWith('pnpm build');
      expect(execSync).toHaveBeenCalledWith('pnpm test:unit');
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(targetVersion).toBe('1.0.0');
    });

    it('should handle rollback failure and restore', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd === 'git checkout v1.0.0') {
          throw new Error('Checkout failed');
        }
        return '';
      });
      
      await expect(rollback.rollbackToVersion('1.0.0'))
        .rejects.toThrow('Rollback failed');
      
      expect(execSync).toHaveBeenCalledWith('git checkout main');
    });
  });

  describe('performEmergencyRollback', () => {
    beforeEach(() => {
      execSync.mockImplementation((cmd) => {
        if (cmd === 'git tag --sort=-version:refname') {
          return 'v2.0.0\nv1.0.0\nv0.9.0';
        }
        if (cmd.includes('git rev-parse')) return 'abc123';
        return '';
      });
      
      fs.readFileSync.mockReturnValue(JSON.stringify({
        name: 'test-app',
        version: '1.0.0'
      }));
    });

    it('should perform emergency rollback successfully', async () => {
      const result = await rollback.performEmergencyRollback('2.0.0');
      
      expect(result.success).toBe(true);
      expect(result.fromVersion).toBe('2.0.0');
      expect(result.toVersion).toBe('1.0.0');
    });

    it('should handle emergency rollback failure', async () => {
      execSync.mockImplementation(() => {
        throw new Error('Git operation failed');
      });
      
      const result = await rollback.performEmergencyRollback('2.0.0');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Git operation failed');
    });
  });

  describe('listBackups', () => {
    it('should list available backups', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue([
        'backup-1.0.0-123456.json',
        'backup-2.0.0-789012.json',
        'other-file.txt'
      ]);
      
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('backup-1.0.0')) {
          return JSON.stringify({
            version: '1.0.0',
            timestamp: '2023-01-01T00:00:00.000Z'
          });
        }
        if (filePath.includes('backup-2.0.0')) {
          return JSON.stringify({
            version: '2.0.0',
            timestamp: '2023-01-02T00:00:00.000Z'
          });
        }
        return '{}';
      });
      
      const backups = rollback.listBackups();
      
      expect(backups).toHaveLength(2);
      expect(backups[0].version).toBe('2.0.0'); // Should be sorted by timestamp desc
      expect(backups[1].version).toBe('1.0.0');
    });

    it('should handle no backups directory', () => {
      fs.existsSync.mockReturnValue(false);
      
      const backups = rollback.listBackups();
      
      expect(backups).toEqual([]);
    });

    it('should filter out non-backup files', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue([
        'backup-1.0.0-123456.json',
        'not-a-backup.json',
        'backup-invalid.txt'
      ]);
      
      fs.readFileSync.mockReturnValue(JSON.stringify({
        version: '1.0.0',
        timestamp: '2023-01-01T00:00:00.000Z'
      }));
      
      const backups = rollback.listBackups();
      
      expect(backups).toHaveLength(1);
      expect(backups[0].version).toBe('1.0.0');
    });
  });

  describe('verifyRollback', () => {
    it('should verify rollback with deployment verification script', async () => {
      // Mock path.join and fs.existsSync for the verification script
      const originalPath = require('path');
      jest.spyOn(originalPath, 'join').mockReturnValue('/mock/deployment-verification.js');
      fs.existsSync.mockReturnValue(true);
      
      await rollback.verifyRollback('1.0.0', 'https://example.com');
      
      expect(execSync).toHaveBeenCalledWith(
        'node /mock/deployment-verification.js https://example.com 1.0.0'
      );
    }, 5000);

    it('should perform basic verification without script', async () => {
      const originalPath = require('path');
      jest.spyOn(originalPath, 'join').mockReturnValue('/nonexistent/script.js');
      fs.existsSync.mockReturnValue(false);
      
      // Mock https module for basic verification
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            // Don't call error callback
          }
        }),
        setTimeout: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn()
      };
      
      const mockHttps = {
        request: jest.fn((url, callback) => {
          // Simulate successful response immediately
          process.nextTick(() => callback({ statusCode: 200 }));
          return mockRequest;
        })
      };
      
      jest.doMock('https', () => mockHttps);
      
      await rollback.verifyRollback('1.0.0', 'https://example.com');
      
      expect(mockHttps.request).toHaveBeenCalledWith(
        'https://example.com/api/health',
        expect.any(Function)
      );
    }, 5000);
  });
});