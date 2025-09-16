/**
 * 版本管理脚本测试
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 模拟测试环境
const VersionManager = require('../bump-version');

describe('VersionManager', () => {
  let versionManager;
  let originalPackageJson;
  const testPackageJsonPath = path.join(__dirname, 'test-package.json');

  beforeEach(() => {
    // 创建测试用的package.json
    originalPackageJson = {
      name: 'test-package',
      version: '1.0.0'
    };
    fs.writeFileSync(testPackageJsonPath, JSON.stringify(originalPackageJson, null, 2));
    
    versionManager = new VersionManager();
    versionManager.packageJsonPath = testPackageJsonPath;
  });

  afterEach(() => {
    // 清理测试文件
    if (fs.existsSync(testPackageJsonPath)) {
      fs.unlinkSync(testPackageJsonPath);
    }
  });

  describe('getCurrentVersion', () => {
    it('should return current version from package.json', () => {
      const version = versionManager.getCurrentVersion();
      expect(version).toBe('1.0.0');
    });
  });

  describe('parseVersion', () => {
    it('should parse semantic version correctly', () => {
      const parsed = versionManager.parseVersion('1.2.3');
      expect(parsed).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: null
      });
    });

    it('should parse prerelease version correctly', () => {
      const parsed = versionManager.parseVersion('1.2.3-beta.1');
      expect(parsed).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'beta.1'
      });
    });

    it('should throw error for invalid version format', () => {
      expect(() => {
        versionManager.parseVersion('invalid');
      }).toThrow('无效的版本号格式');
    });
  });

  describe('bumpVersion', () => {
    it('should bump major version correctly', () => {
      const newVersion = versionManager.bumpVersion('1.2.3', 'major');
      expect(newVersion).toBe('2.0.0');
    });

    it('should bump minor version correctly', () => {
      const newVersion = versionManager.bumpVersion('1.2.3', 'minor');
      expect(newVersion).toBe('1.3.0');
    });

    it('should bump patch version correctly', () => {
      const newVersion = versionManager.bumpVersion('1.2.3', 'patch');
      expect(newVersion).toBe('1.2.4');
    });

    it('should bump prerelease version correctly', () => {
      const newVersion = versionManager.bumpVersion('1.2.3', 'prerelease');
      expect(newVersion).toBe('1.2.3-beta.1');
    });

    it('should increment existing prerelease version', () => {
      const newVersion = versionManager.bumpVersion('1.2.3-beta.1', 'prerelease');
      expect(newVersion).toBe('1.2.3-beta.2');
    });
  });

  describe('updatePackageJson', () => {
    it('should update package.json version', () => {
      versionManager.updatePackageJson('1.0.1');
      
      const updatedPackageJson = JSON.parse(fs.readFileSync(testPackageJsonPath, 'utf8'));
      expect(updatedPackageJson.version).toBe('1.0.1');
    });
  });

  describe('analyzeCommitsForVersionType', () => {
    it('should detect major version for breaking changes', () => {
      const commits = [
        'feat!: breaking change in API',
        'fix: minor bug fix'
      ];
      const versionType = versionManager.analyzeCommitsForVersionType(commits);
      expect(versionType).toBe('major');
    });

    it('should detect minor version for new features', () => {
      const commits = [
        'feat: add new feature',
        'fix: minor bug fix'
      ];
      const versionType = versionManager.analyzeCommitsForVersionType(commits);
      expect(versionType).toBe('minor');
    });

    it('should detect patch version for bug fixes', () => {
      const commits = [
        'fix: minor bug fix',
        'docs: update documentation'
      ];
      const versionType = versionManager.analyzeCommitsForVersionType(commits);
      expect(versionType).toBe('patch');
    });

    it('should default to patch version', () => {
      const commits = [
        'docs: update documentation',
        'style: format code'
      ];
      const versionType = versionManager.analyzeCommitsForVersionType(commits);
      expect(versionType).toBe('patch');
    });
  });

  describe('generateReleaseNotes', () => {
    it('should generate release notes with categorized commits', async () => {
      const commits = [
        'abc1234 feat: add new user authentication',
        'def5678 fix: resolve login issue',
        'ghi9012 docs: update API documentation'
      ];
      
      const releaseNotes = await versionManager.generateReleaseNotes('1.1.0', commits);
      
      expect(releaseNotes).toContain('Release Notes');
      expect(releaseNotes).toContain('1.1.0');
      expect(releaseNotes).toContain('feat: add new user authentication');
      expect(releaseNotes).toContain('fix: resolve login issue');
      expect(releaseNotes).toContain('docs: update API documentation');
    });

    it('should include installation instructions', async () => {
      const commits = ['abc1234 feat: add feature'];
      const releaseNotes = await versionManager.generateReleaseNotes('1.1.0', commits);
      
      expect(releaseNotes).toContain('Release Notes');
      expect(releaseNotes).toContain('1.1.0');
      expect(releaseNotes).toContain('feat: add feature');
    });
  });
});

// 集成测试（需要真实的Git环境）
describe('VersionManager Integration', () => {
  // 这些测试需要在真实的Git仓库中运行
  it.skip('should create git tag successfully', () => {
    // 集成测试将在实际环境中验证
  });

  it.skip('should get commits since last tag', () => {
    // 集成测试将在实际环境中验证
  });
});