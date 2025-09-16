/**
 * 版本历史管理脚本测试
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const VersionHistoryManager = require('../version-history');

// Mock execSync for testing
jest.mock('child_process');
jest.mock('fs');

describe('VersionHistoryManager', () => {
  let manager;
  let mockExecSync;
  let mockFs;

  beforeEach(() => {
    manager = new VersionHistoryManager();
    mockExecSync = execSync;
    mockFs = fs;
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getAllVersionTags', () => {
    it('should return sorted version tags', () => {
      mockExecSync.mockReturnValue('v0.3.1\nv0.3.0\nv0.2.0\nv0.1.0\n');
      
      const tags = manager.getAllVersionTags();
      
      expect(tags).toEqual(['v0.3.1', 'v0.3.0', 'v0.2.0', 'v0.1.0']);
      expect(mockExecSync).toHaveBeenCalledWith(
        'git tag -l "v*" --sort=-version:refname',
        { encoding: 'utf8' }
      );
    });

    it('should return empty array when no tags exist', () => {
      mockExecSync.mockReturnValue('');
      
      const tags = manager.getAllVersionTags();
      
      expect(tags).toEqual([]);
    });

    it('should handle git command errors gracefully', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });
      
      const tags = manager.getAllVersionTags();
      
      expect(tags).toEqual([]);
    });

    it('should filter out non-version tags', () => {
      mockExecSync.mockReturnValue('v0.3.1\nrelease-candidate\nv0.3.0\nlatest\n');
      
      const tags = manager.getAllVersionTags();
      
      expect(tags).toEqual(['v0.3.1', 'v0.3.0']);
    });
  });

  describe('getTagInfo', () => {
    it('should return complete tag information', () => {
      mockExecSync
        .mockReturnValueOnce('abc123def456') // commit hash
        .mockReturnValueOnce('2025-01-04 10:30:00 +0800') // date
        .mockReturnValueOnce('John Doe') // author
        .mockReturnValueOnce('Release v0.3.0'); // message
      
      const tagInfo = manager.getTagInfo('v0.3.0');
      
      expect(tagInfo).toEqual({
        tag: 'v0.3.0',
        version: '0.3.0',
        commit: 'abc123de',
        date: '2025-01-04T02:30:00.000Z',
        author: 'John Doe',
        message: 'Release v0.3.0',
        releaseNotesFile: 'RELEASE_NOTES_v0.3.0.md'
      });
    });

    it('should handle git command errors gracefully', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });
      
      const tagInfo = manager.getTagInfo('v0.3.0');
      
      expect(tagInfo).toBeNull();
    });

    it('should use default message when tag message is empty', () => {
      mockExecSync
        .mockReturnValueOnce('abc123def456')
        .mockReturnValueOnce('2025-01-04 10:30:00 +0800')
        .mockReturnValueOnce('John Doe')
        .mockReturnValueOnce(''); // empty message
      
      const tagInfo = manager.getTagInfo('v0.3.0');
      
      expect(tagInfo.message).toBe('Release v0.3.0');
    });
  });

  describe('getCommitsBetweenVersions', () => {
    it('should return commits between two versions', () => {
      mockExecSync.mockReturnValue('abc123 feat: add new feature\ndef456 fix: resolve bug\n');
      
      const commits = manager.getCommitsBetweenVersions('v0.2.0', 'v0.3.0');
      
      expect(commits).toEqual([
        { hash: 'abc123', message: 'feat: add new feature' },
        { hash: 'def456', message: 'fix: resolve bug' }
      ]);
      expect(mockExecSync).toHaveBeenCalledWith(
        'git log v0.2.0..v0.3.0 --oneline --no-merges',
        { encoding: 'utf8' }
      );
    });

    it('should handle commits from beginning when fromTag is null', () => {
      mockExecSync.mockReturnValue('abc123 initial commit\n');
      
      const commits = manager.getCommitsBetweenVersions(null, 'v0.1.0');
      
      expect(mockExecSync).toHaveBeenCalledWith(
        'git log v0.1.0 --oneline --no-merges',
        { encoding: 'utf8' }
      );
    });

    it('should return empty array when no commits exist', () => {
      mockExecSync.mockReturnValue('');
      
      const commits = manager.getCommitsBetweenVersions('v0.2.0', 'v0.3.0');
      
      expect(commits).toEqual([]);
    });

    it('should handle git command errors gracefully', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });
      
      const commits = manager.getCommitsBetweenVersions('v0.2.0', 'v0.3.0');
      
      expect(commits).toEqual([]);
    });
  });

  describe('getReleaseNotes', () => {
    it('should return release notes content when file exists', () => {
      const mockContent = '# Release Notes v0.3.0\n\nNew features...';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockContent);
      
      const releaseNotes = manager.getReleaseNotes('0.3.0');
      
      expect(releaseNotes).toBe(mockContent);
      expect(mockFs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining('RELEASE_NOTES_v0.3.0.md')
      );
    });

    it('should return null when file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const releaseNotes = manager.getReleaseNotes('0.3.0');
      
      expect(releaseNotes).toBeNull();
    });

    it('should handle file read errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File read failed');
      });
      
      const releaseNotes = manager.getReleaseNotes('0.3.0');
      
      expect(releaseNotes).toBeNull();
    });
  });

  describe('getCurrentVersion', () => {
    it('should return current version from package.json', () => {
      const mockPackageJson = { version: '0.3.1' };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));
      
      const version = manager.getCurrentVersion();
      
      expect(version).toBe('0.3.1');
    });

    it('should return null when package.json read fails', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      
      const version = manager.getCurrentVersion();
      
      expect(version).toBeNull();
    });

    it('should return null when package.json is invalid JSON', () => {
      mockFs.readFileSync.mockReturnValue('invalid json');
      
      const version = manager.getCurrentVersion();
      
      expect(version).toBeNull();
    });
  });

  describe('getLatestVersion', () => {
    it('should return the latest version tag', () => {
      mockExecSync.mockReturnValue('v0.3.1\nv0.3.0\nv0.2.0\n');
      
      const latestVersion = manager.getLatestVersion();
      
      expect(latestVersion).toBe('v0.3.1');
    });

    it('should return null when no tags exist', () => {
      mockExecSync.mockReturnValue('');
      
      const latestVersion = manager.getLatestVersion();
      
      expect(latestVersion).toBeNull();
    });
  });

  describe('listVersions', () => {
    beforeEach(() => {
      // Mock console.log to capture output
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      console.log.mockRestore();
    });

    it('should display versions in table format by default', () => {
      mockExecSync.mockReturnValue('v0.3.1\nv0.3.0\n');
      mockExecSync
        .mockReturnValueOnce('v0.3.1\nv0.3.0\n') // getAllVersionTags
        .mockReturnValueOnce('abc123') // getTagInfo for v0.3.1
        .mockReturnValueOnce('2025-01-04 10:30:00 +0800')
        .mockReturnValueOnce('John Doe')
        .mockReturnValueOnce('Release v0.3.1')
        .mockReturnValueOnce('def456') // getTagInfo for v0.3.0
        .mockReturnValueOnce('2025-01-03 10:30:00 +0800')
        .mockReturnValueOnce('Jane Doe')
        .mockReturnValueOnce('Release v0.3.0');
      
      mockFs.existsSync.mockReturnValue(true);
      
      manager.listVersions();
      
      expect(console.log).toHaveBeenCalledWith('📋 版本历史列表\n');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('版本号      | 发布日期     | 作者        | 提交ID   | 发布说明')
      );
    });

    it('should handle empty version list', () => {
      mockExecSync.mockReturnValue('');
      
      manager.listVersions();
      
      expect(console.log).toHaveBeenCalledWith('❌ 未找到任何版本标签');
    });

    it('should respect limit option', () => {
      mockExecSync.mockReturnValue('v0.3.1\nv0.3.0\nv0.2.0\n');
      
      manager.listVersions({ limit: 1 });
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('显示了最新的 1 个版本，总共有 3 个版本')
      );
    });
  });

  describe('compareVersions', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      console.log.mockRestore();
    });

    it('should compare two versions successfully', () => {
      // Mock getAllVersionTags
      mockExecSync.mockReturnValueOnce('v0.3.1\nv0.3.0\nv0.2.0\n');
      
      // Mock getTagInfo calls
      mockExecSync
        .mockReturnValueOnce('abc123') // v0.2.0 commit
        .mockReturnValueOnce('2025-01-02 10:30:00 +0800') // v0.2.0 date
        .mockReturnValueOnce('John Doe') // v0.2.0 author
        .mockReturnValueOnce('Release v0.2.0') // v0.2.0 message
        .mockReturnValueOnce('def456') // v0.3.0 commit
        .mockReturnValueOnce('2025-01-03 10:30:00 +0800') // v0.3.0 date
        .mockReturnValueOnce('Jane Doe') // v0.3.0 author
        .mockReturnValueOnce('Release v0.3.0'); // v0.3.0 message
      
      // Mock getCommitsBetweenVersions
      mockExecSync.mockReturnValueOnce('abc123 feat: add feature\ndef456 fix: bug fix\n');
      
      manager.compareVersions('0.2.0', '0.3.0');
      
      expect(console.log).toHaveBeenCalledWith('🔍 版本比较: 0.2.0 → 0.3.0\n');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('📊 版本信息对比:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🚀 新功能:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🐛 问题修复:'));
    });

    it('should handle non-existent versions', () => {
      mockExecSync.mockReturnValueOnce('v0.3.1\nv0.3.0\n');
      
      manager.compareVersions('0.1.0', '0.3.0');
      
      expect(console.log).toHaveBeenCalledWith('❌ 版本 0.1.0 不存在');
    });

    it('should handle identical versions', () => {
      mockExecSync
        .mockReturnValueOnce('v0.3.0\nv0.2.0\n') // getAllVersionTags
        .mockReturnValueOnce('abc123') // getTagInfo calls
        .mockReturnValueOnce('2025-01-03 10:30:00 +0800')
        .mockReturnValueOnce('John Doe')
        .mockReturnValueOnce('Release v0.3.0')
        .mockReturnValueOnce('abc123')
        .mockReturnValueOnce('2025-01-03 10:30:00 +0800')
        .mockReturnValueOnce('John Doe')
        .mockReturnValueOnce('Release v0.3.0')
        .mockReturnValueOnce(''); // no commits between same version
      
      manager.compareVersions('0.3.0', '0.3.0');
      
      expect(console.log).toHaveBeenCalledWith('✅ 两个版本之间没有差异');
    });
  });

  describe('searchVersions', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      console.log.mockRestore();
    });

    it('should search versions by version number', () => {
      mockExecSync
        .mockReturnValueOnce('v0.3.1\nv0.3.0\nv0.2.0\n') // getAllVersionTags
        .mockReturnValueOnce('abc123') // getTagInfo for v0.3.1
        .mockReturnValueOnce('2025-01-04 10:30:00 +0800')
        .mockReturnValueOnce('John Doe')
        .mockReturnValueOnce('Release v0.3.1')
        .mockReturnValueOnce('def456') // getTagInfo for v0.3.0
        .mockReturnValueOnce('2025-01-03 10:30:00 +0800')
        .mockReturnValueOnce('Jane Doe')
        .mockReturnValueOnce('Release v0.3.0');
      
      mockFs.readFileSync.mockReturnValue('Release notes content');
      
      manager.searchVersions('0.3');
      
      expect(console.log).toHaveBeenCalledWith('🔍 搜索版本: "0.3"\n');
      expect(console.log).toHaveBeenCalledWith('✅ 找到 2 个匹配的版本:\n');
    });

    it('should handle no search results', () => {
      mockExecSync.mockReturnValueOnce('v0.3.1\nv0.3.0\n');
      
      manager.searchVersions('1.0');
      
      expect(console.log).toHaveBeenCalledWith('❌ 未找到匹配 "1.0" 的版本');
    });

    it('should search by message content', () => {
      mockExecSync
        .mockReturnValueOnce('v0.3.0\n')
        .mockReturnValueOnce('abc123')
        .mockReturnValueOnce('2025-01-03 10:30:00 +0800')
        .mockReturnValueOnce('John Doe')
        .mockReturnValueOnce('Bug fix release');
      
      manager.searchVersions('bug', { type: 'message' });
      
      expect(console.log).toHaveBeenCalledWith('✅ 找到 1 个匹配的版本:\n');
    });
  });
});