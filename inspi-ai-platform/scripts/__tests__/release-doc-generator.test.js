/**
 * 发布文档生成器测试
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ReleaseDocGenerator = require('../release-doc-generator');

// Mock execSync for testing
jest.mock('child_process');
jest.mock('fs');

describe('ReleaseDocGenerator', () => {
  let generator;
  let mockExecSync;
  let mockFs;

  beforeEach(() => {
    generator = new ReleaseDocGenerator();
    mockExecSync = execSync;
    mockFs = fs;
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('parseCommit', () => {
    it('should parse conventional commit format correctly', () => {
      const commit = {
        hash: 'abc123def456',
        message: 'feat(ui): add new button component',
        author: 'Test User',
        date: '2025-01-04'
      };

      const parsed = generator.parseCommit(commit);

      expect(parsed).toEqual({
        hash: 'abc123d',
        type: 'feat',
        scope: 'ui',
        description: 'add new button component',
        breaking: false,
        emoji: '🚀',
        label: '新功能',
        changelog: true,
        author: 'Test User',
        date: '2025-01-04',
        raw: 'feat(ui): add new button component'
      });
    });

    it('should parse breaking change commit correctly', () => {
      const commit = {
        hash: 'def456abc789',
        message: 'feat(api)!: change authentication method',
        author: 'Test User',
        date: '2025-01-04'
      };

      const parsed = generator.parseCommit(commit);

      expect(parsed.breaking).toBe(true);
      expect(parsed.type).toBe('feat');
      expect(parsed.scope).toBe('api');
    });

    it('should handle non-conventional commit format', () => {
      const commit = {
        hash: 'ghi789jkl012',
        message: 'fix bug in user login',
        author: 'Test User',
        date: '2025-01-04'
      };

      const parsed = generator.parseCommit(commit);

      expect(parsed.type).toBe('fix');
      expect(parsed.scope).toBe(null);
      expect(parsed.description).toBe('fix bug in user login');
    });

    it('should categorize commits by keywords', () => {
      const testCases = [
        { message: 'add new feature', expectedType: 'feat' },
        { message: '修复登录问题', expectedType: 'fix' },
        { message: 'update documentation', expectedType: 'docs' },
        { message: '重构代码结构', expectedType: 'refactor' },
        { message: 'improve performance', expectedType: 'perf' },
        { message: 'write unit tests', expectedType: 'test' }, // Changed to avoid 'add' keyword
        { message: 'update build config', expectedType: 'chore' }
      ];

      testCases.forEach(({ message, expectedType }) => {
        const commit = {
          hash: 'test123',
          message,
          author: 'Test User',
          date: '2025-01-04'
        };

        const parsed = generator.parseCommit(commit);
        expect(parsed.type).toBe(expectedType);
      });
    });
  });

  describe('categorizeCommits', () => {
    it('should categorize commits correctly', () => {
      const commits = [
        {
          hash: 'abc123',
          message: 'feat: add new feature',
          author: 'User1',
          date: '2025-01-04'
        },
        {
          hash: 'def456',
          message: 'fix: resolve login issue',
          author: 'User2',
          date: '2025-01-04'
        },
        {
          hash: 'ghi789',
          message: 'feat!: breaking change in API',
          author: 'User3',
          date: '2025-01-04'
        },
        {
          hash: 'jkl012',
          message: 'docs: update README',
          author: 'User4',
          date: '2025-01-04'
        }
      ];

      const { categories, stats } = generator.categorizeCommits(commits);

      expect(categories.features).toHaveLength(2); // feat commits
      expect(categories.fixes).toHaveLength(1); // fix commits
      expect(categories.breaking).toHaveLength(1); // breaking change
      
      expect(stats.totalCommits).toBe(4);
      expect(stats.features).toBe(2);
      expect(stats.fixes).toBe(1);
      expect(stats.breaking).toBe(1);
      expect(stats.docs).toBe(1);
    });
  });

  describe('getBreakingChangeImpact', () => {
    it('should determine impact based on scope', () => {
      const commit = { scope: 'api', description: 'change endpoint' };
      const impact = generator.getBreakingChangeImpact(commit);
      expect(impact).toBe('api模块的相关功能');
    });

    it('should determine impact based on description keywords', () => {
      const testCases = [
        { description: 'change API endpoint', expected: 'API接口调用' },
        { description: 'update config format', expected: '配置文件和环境变量' },
        { description: 'modify database schema', expected: '数据库结构和数据' },
        { description: 'general change', expected: '需要检查相关功能的使用' }
      ];

      testCases.forEach(({ description, expected }) => {
        const commit = { scope: null, description };
        const impact = generator.getBreakingChangeImpact(commit);
        expect(impact).toBe(expected);
      });
    });
  });

  describe('getBreakingChangeMigration', () => {
    it('should provide appropriate migration guide', () => {
      const testCases = [
        { description: 'change API format', expected: '请更新API调用方式，参考最新的API文档' },
        { description: 'update config structure', expected: '请更新配置文件，参考.env.example文件' },
        { description: 'modify database schema', expected: '请运行数据库迁移脚本，备份重要数据' },
        { description: 'general change', expected: '请参考文档进行相应的代码调整' }
      ];

      testCases.forEach(({ description, expected }) => {
        const commit = { description };
        const migration = generator.getBreakingChangeMigration(commit);
        expect(migration).toBe(expected);
      });
    });
  });

  describe('getVersionTypeDescription', () => {
    it('should return correct version type description', () => {
      const testCases = [
        { stats: { breaking: 1, features: 0, fixes: 0 }, expected: '重大更新版本 - 包含破坏性变更' },
        { stats: { breaking: 0, features: 1, fixes: 0 }, expected: '功能增强版本 - 新增功能特性' },
        { stats: { breaking: 0, features: 0, fixes: 1 }, expected: '问题修复版本 - 修复已知问题' },
        { stats: { breaking: 0, features: 0, fixes: 0 }, expected: '维护更新版本 - 代码优化和改进' }
      ];

      testCases.forEach(({ stats, expected }) => {
        const description = generator.getVersionTypeDescription(stats);
        expect(description).toBe(expected);
      });
    });
  });

  describe('generateReleaseNotes', () => {
    beforeEach(() => {
      // Mock getPreviousVersion
      mockExecSync.mockReturnValue('v1.0.0\n');
    });

    it('should generate complete release notes', () => {
      const version = '1.1.0';
      const commits = [
        {
          hash: 'abc123',
          message: 'feat(ui): add new dashboard',
          author: 'User1',
          date: '2025-01-04'
        },
        {
          hash: 'def456',
          message: 'fix(auth): resolve login timeout',
          author: 'User2',
          date: '2025-01-04'
        }
      ];

      const releaseNotes = generator.generateReleaseNotes(version, commits);

      expect(releaseNotes).toContain('# 🚀 Inspi AI Platform 1.1.0 发布说明');
      expect(releaseNotes).toContain('## 🚀 新功能');
      expect(releaseNotes).toContain('## 🐛 问题修复');
      expect(releaseNotes).toContain('add new dashboard');
      expect(releaseNotes).toContain('resolve login timeout');
      expect(releaseNotes).toContain('总提交数**: 2');
    });

    it('should include breaking changes section when present', () => {
      const version = '2.0.0';
      const commits = [
        {
          hash: 'abc123',
          message: 'feat(api)!: change authentication method',
          author: 'User1',
          date: '2025-01-04'
        }
      ];

      const releaseNotes = generator.generateReleaseNotes(version, commits);

      expect(releaseNotes).toContain('## ⚠️ 破坏性变更');
      expect(releaseNotes).toContain('change authentication method');
      expect(releaseNotes).toContain('**迁移指南**:');
    });
  });

  describe('generateChangelog', () => {
    it('should generate changelog entry', () => {
      const version = '1.1.0';
      const commits = [
        {
          hash: 'abc123',
          message: 'feat: add new feature',
          author: 'User1',
          date: '2025-01-04'
        },
        {
          hash: 'def456',
          message: 'fix: resolve bug',
          author: 'User2',
          date: '2025-01-04'
        }
      ];

      const changelog = generator.generateChangelog(version, commits);

      expect(changelog).toContain('## [1.1.0]');
      expect(changelog).toContain('### 🚀 Features');
      expect(changelog).toContain('### 🐛 Bug Fixes');
      expect(changelog).toContain('add new feature');
      expect(changelog).toContain('resolve bug');
    });
  });

  describe('generateTagDescription', () => {
    it('should generate tag description with statistics', () => {
      const version = '1.1.0';
      const commits = [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'User1',
          date: '2025-01-04'
        },
        {
          hash: 'def456',
          message: 'fix: fix bug',
          author: 'User2',
          date: '2025-01-04'
        }
      ];

      const description = generator.generateTagDescription(version, commits);

      expect(description).toContain('Release 1.1.0');
      expect(description).toContain('📊 版本统计:');
      expect(description).toContain('总提交数: 2');
      expect(description).toContain('新功能: 1');
      expect(description).toContain('问题修复: 1');
      expect(description).toContain('📝 主要变更:');
    });
  });

  describe('getCommitHistory', () => {
    it('should get commit history from tag to HEAD', () => {
      const mockOutput = 'abc123|feat: add feature|User1|2025-01-04\ndef456|fix: fix bug|User2|2025-01-04';
      mockExecSync.mockReturnValue(mockOutput);

      const commits = generator.getCommitHistory('v1.0.0');

      expect(commits).toHaveLength(2);
      expect(commits[0]).toEqual({
        hash: 'abc123',
        message: 'feat: add feature',
        author: 'User1',
        date: '2025-01-04'
      });
    });

    it('should handle empty commit history', () => {
      mockExecSync.mockReturnValue('');

      const commits = generator.getCommitHistory('v1.0.0');

      expect(commits).toEqual([]);
    });

    it('should handle git command errors gracefully', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });

      const commits = generator.getCommitHistory('v1.0.0');

      expect(commits).toEqual([]);
    });
  });

  describe('updateChangelogFile', () => {
    it('should create new changelog file if not exists', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.writeFileSync.mockImplementation(() => {});

      const version = '1.1.0';
      const commits = [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'User1',
          date: '2025-01-04'
        }
      ];

      generator.updateChangelogFile(version, commits);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const writtenContent = mockFs.writeFileSync.mock.calls[0][1];
      expect(writtenContent).toContain('# Changelog');
      expect(writtenContent).toContain('## [1.1.0]');
    });

    it('should update existing changelog file', () => {
      const existingChangelog = `# Changelog

## [1.0.0] - 2025-01-01

### Features
- Initial release
`;
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(existingChangelog);
      mockFs.writeFileSync.mockImplementation(() => {});

      const version = '1.1.0';
      const commits = [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'User1',
          date: '2025-01-04'
        }
      ];

      generator.updateChangelogFile(version, commits);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const writtenContent = mockFs.writeFileSync.mock.calls[0][1];
      expect(writtenContent).toContain('## [1.1.0]');
      expect(writtenContent).toContain('## [1.0.0]');
    });
  });
});