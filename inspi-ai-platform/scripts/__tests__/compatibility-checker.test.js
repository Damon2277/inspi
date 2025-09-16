/**
 * 版本兼容性检查器测试
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const CompatibilityChecker = require('../compatibility-checker');

// Mock execSync for testing
jest.mock('child_process');
jest.mock('fs');

describe('CompatibilityChecker', () => {
  let checker;
  let mockExecSync;
  let mockFs;

  beforeEach(() => {
    checker = new CompatibilityChecker();
    mockExecSync = execSync;
    mockFs = fs;
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Default mock implementations
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
    mockFs.existsSync.mockReturnValue(true);
    mockFs.writeFileSync.mockImplementation(() => {});
    mockFs.mkdirSync.mockImplementation(() => {});
  });

  describe('getCurrentVersion', () => {
    it('should return current version from package.json', () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.2.3' }));
      
      const version = checker.getCurrentVersion();
      
      expect(version).toBe('1.2.3');
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        'utf8'
      );
    });

    it('should throw error if package.json cannot be read', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      
      expect(() => checker.getCurrentVersion()).toThrow('无法读取当前版本');
    });
  });

  describe('getPreviousVersion', () => {
    it('should return previous version tag', () => {
      mockExecSync.mockReturnValue('v1.1.0\nv1.0.0\nv0.9.0\n');
      
      const version = checker.getPreviousVersion();
      
      expect(version).toBe('v1.1.0'); // Should return with 'v' prefix
      expect(mockExecSync).toHaveBeenCalledWith(
        'git tag --sort=-version:refname',
        { encoding: 'utf8' }
      );
    });

    it('should return null if no tags exist', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('No tags');
      });
      
      const version = checker.getPreviousVersion();
      
      expect(version).toBe(null);
    });
  });

  describe('detectAPIChanges', () => {
    it('should detect added, modified, and removed API files', () => {
      mockExecSync
        .mockReturnValueOnce('v1.0.0') // getPreviousVersion
        .mockReturnValueOnce('A\tsrc/app/api/new-endpoint/route.ts\nM\tsrc/app/api/users/route.ts\nD\tsrc/app/api/old-endpoint/route.ts');
      
      const changes = checker.detectAPIChanges();
      
      expect(changes.added).toContain('src/app/api/new-endpoint/route.ts');
      expect(changes.modified).toContain('src/app/api/users/route.ts');
      expect(changes.removed).toContain('src/app/api/old-endpoint/route.ts');
      expect(changes.breaking).toHaveLength(1); // removed file should be marked as breaking
    });

    it('should return empty changes if no git diff', () => {
      mockExecSync
        .mockReturnValueOnce('v1.0.0') // getPreviousVersion
        .mockReturnValueOnce(''); // empty git diff
      
      const changes = checker.detectAPIChanges();
      
      expect(changes.added).toHaveLength(0);
      expect(changes.modified).toHaveLength(0);
      expect(changes.removed).toHaveLength(0);
      expect(changes.breaking).toHaveLength(0);
    });

    it('should handle case when no previous version exists', () => {
      mockExecSync.mockReturnValueOnce(null); // getPreviousVersion returns null
      
      const changes = checker.detectAPIChanges();
      
      expect(changes.added).toHaveLength(0);
      expect(changes.modified).toHaveLength(0);
      expect(changes.removed).toHaveLength(0);
      expect(changes.breaking).toHaveLength(0);
    });
  });

  describe('isBreakingChange', () => {
    it('should detect breaking changes in file diff', () => {
      const breakingDiff = `
-export function oldFunction() {}
-export interface OldInterface {}
+export function newFunction() {}
      `;
      
      mockExecSync.mockReturnValue(breakingDiff);
      
      const isBreaking = checker.isBreakingChange('src/app/api/test.ts', 'v1.0.0');
      
      expect(isBreaking).toBe(true);
    });

    it('should not detect breaking changes for safe modifications', () => {
      const safeDiff = `
+export function newFunction() {}
+// Added new functionality
      `;
      
      mockExecSync.mockReturnValue(safeDiff);
      
      const isBreaking = checker.isBreakingChange('src/app/api/test.ts', 'v1.0.0');
      
      expect(isBreaking).toBe(false);
    });

    it('should detect explicit BREAKING CHANGE markers', () => {
      const breakingDiff = `
+// BREAKING CHANGE: This removes old API
+export function newAPI() {}
      `;
      
      mockExecSync.mockReturnValue(breakingDiff);
      
      const isBreaking = checker.isBreakingChange('src/app/api/test.ts', 'v1.0.0');
      
      expect(isBreaking).toBe(true);
    });
  });

  describe('analyzeCommitBreakingChanges', () => {
    it('should detect breaking changes from commit messages', () => {
      mockExecSync
        .mockReturnValueOnce('v1.0.0') // getPreviousVersion
        .mockReturnValueOnce('abc123 feat: BREAKING CHANGE add new feature\ndef456 fix: minor bug fix');
      
      const breakingChanges = checker.analyzeCommitBreakingChanges();
      
      expect(breakingChanges).toHaveLength(1);
      expect(breakingChanges[0].message).toContain('BREAKING CHANGE');
      expect(breakingChanges[0].type).toBe('commit');
    });

    it('should detect potential breaking changes from keywords', () => {
      mockExecSync
        .mockReturnValueOnce('v1.0.0') // getPreviousVersion
        .mockReturnValueOnce('abc123 feat: remove deprecated function\ndef456 fix: delete unused code');
      
      const breakingChanges = checker.analyzeCommitBreakingChanges();
      
      expect(breakingChanges).toHaveLength(2);
      expect(breakingChanges[0].type).toBe('potential');
      expect(breakingChanges[1].type).toBe('potential');
    });
  });

  describe('parseVersion', () => {
    it('should parse valid semantic version', () => {
      const version = checker.parseVersion('1.2.3');
      
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: null
      });
    });

    it('should parse version with prerelease', () => {
      const version = checker.parseVersion('1.2.3-beta.1');
      
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'beta.1'
      });
    });

    it('should throw error for invalid version format', () => {
      expect(() => checker.parseVersion('invalid')).toThrow('无效的版本号格式');
    });
  });

  describe('validateVersionBump', () => {
    it('should require major version bump for breaking changes', () => {
      const validation = checker.validateVersionBump('1.0.0', '1.1.0', true);
      
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].type).toBe('version_mismatch');
      expect(validation.errors[0].suggestion).toContain('2.0.0');
    });

    it('should warn about incorrect version format for major bump', () => {
      const validation = checker.validateVersionBump('1.0.0', '2.1.1', false);
      
      expect(validation.warnings).toHaveLength(1);
      expect(validation.warnings[0].type).toBe('version_format');
      expect(validation.warnings[0].suggestion).toContain('2.0.0');
    });

    it('should warn about incorrect version format for minor bump', () => {
      const validation = checker.validateVersionBump('1.0.0', '1.1.1', false);
      
      expect(validation.warnings).toHaveLength(1);
      expect(validation.warnings[0].type).toBe('version_format');
      expect(validation.warnings[0].suggestion).toContain('1.1.0');
    });

    it('should pass validation for correct version bump', () => {
      const validation = checker.validateVersionBump('1.0.0', '2.0.0', true);
      
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });
  });

  describe('generateCompatibilityReport', () => {
    it('should generate comprehensive compatibility report', () => {
      const apiChanges = {
        added: ['src/app/api/new/route.ts'],
        modified: ['src/app/api/users/route.ts'],
        removed: ['src/app/api/old/route.ts'],
        breaking: [{ file: 'src/app/api/old/route.ts', type: 'removal', description: 'API removed' }]
      };
      
      const commitBreakingChanges = [
        { hash: 'abc123', message: 'feat!: remove old API', type: 'commit' }
      ];
      
      const versionValidation = {
        warnings: [],
        errors: [{ type: 'version_mismatch', message: 'Version mismatch' }]
      };
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
      mockExecSync.mockReturnValue('v0.9.0');
      
      const report = checker.generateCompatibilityReport(
        apiChanges,
        commitBreakingChanges,
        versionValidation
      );
      
      expect(report.summary.hasBreakingChanges).toBe(true);
      expect(report.summary.riskLevel).toBe('high');
      expect(report.summary.recommendedAction).toBe('review_required');
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.migrationGuide.length).toBeGreaterThan(0);
    });

    it('should generate low-risk report for safe changes', () => {
      const apiChanges = {
        added: ['src/app/api/new/route.ts'],
        modified: [],
        removed: [],
        breaking: []
      };
      
      const commitBreakingChanges = [];
      const versionValidation = { warnings: [], errors: [] };
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
      
      const report = checker.generateCompatibilityReport(
        apiChanges,
        commitBreakingChanges,
        versionValidation
      );
      
      expect(report.summary.hasBreakingChanges).toBe(false);
      expect(report.summary.riskLevel).toBe('low');
      expect(report.summary.recommendedAction).toBe('proceed');
    });
  });

  describe('saveCompatibilityReport', () => {
    it('should save JSON and Markdown reports', () => {
      const report = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        summary: { hasBreakingChanges: false, riskLevel: 'low', recommendedAction: 'proceed' },
        apiChanges: { added: [], modified: [], removed: [], breaking: [] },
        breakingChanges: { fromCommits: [], fromAPI: [] },
        versionValidation: { warnings: [], errors: [] },
        recommendations: [],
        migrationGuide: []
      };
      
      mockFs.existsSync.mockReturnValue(false);
      
      const filePath = checker.saveCompatibilityReport(report);
      
      expect(mockFs.mkdirSync).toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2); // JSON and Markdown
      expect(filePath).toContain('compatibility-report');
    });
  });

  describe('checkCompatibility', () => {
    it('should perform complete compatibility check', async () => {
      // Mock all the required methods
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
      mockExecSync
        .mockReturnValueOnce('v0.9.0') // getPreviousVersion
        .mockReturnValueOnce('') // detectAPIChanges - git diff
        .mockReturnValueOnce('v0.9.0') // analyzeCommitBreakingChanges - getPreviousVersion
        .mockReturnValueOnce(''); // analyzeCommitBreakingChanges - git log
      
      mockFs.existsSync.mockReturnValue(false);
      
      const report = await checker.checkCompatibility();
      
      expect(report).toBeDefined();
      expect(report.version).toBe('1.0.0');
      expect(report.summary).toBeDefined();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should handle options for version comparison', async () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '2.0.0' }));
      mockExecSync.mockReturnValue('');
      mockFs.existsSync.mockReturnValue(false);
      
      const options = {
        fromVersion: '1.0.0',
        newVersion: '2.0.0'
      };
      
      const report = await checker.checkCompatibility(options);
      
      expect(report).toBeDefined();
      expect(report.version).toBe('2.0.0');
    });
  });
});