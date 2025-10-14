/**
 * 版本管理系统集成测试
 * 测试完整的版本升级流程和Git操作
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Import version management modules
const VersionManager = require('../bump-version');
const { validateCommitMessage } = require('../validate-commit-msg');
const VersionHistoryManager = require('../version-history');
const VersionRollbackManager = require('../version-rollback');
const ReleaseDocGenerator = require('../release-doc-generator');

describe('Version Management System Integration Tests', () => {
  let testRepoPath;
  let originalCwd;
  let versionManager;
  let historyManager;
  let rollbackManager;
  let docGenerator;

  beforeAll(async () => {
    // 创建临时测试仓库
    testRepoPath = fs.mkdtempSync(path.join(os.tmpdir(), 'version-test-'));
    originalCwd = process.cwd();
    
    // 初始化Git仓库
    process.chdir(testRepoPath);
    execSync('git init');
    execSync('git config user.name "Test User"');
    execSync('git config user.email "test@example.com"');
    
    // 创建初始package.json
    const initialPackageJson = {
      name: 'test-package',
      version: '1.0.0',
      description: 'Test package for version management'
    };
    fs.writeFileSync('package.json', JSON.stringify(initialPackageJson, null, 2));
    
    // 创建初始提交
    execSync('git add .');
    execSync('git commit -m "chore: initial commit"');
    
    // 初始化管理器实例
    versionManager = new VersionManager();
    historyManager = new VersionHistoryManager();
    rollbackManager = new VersionRollbackManager();
    docGenerator = new ReleaseDocGenerator();
  });

  afterAll(() => {
    // 清理测试环境
    process.chdir(originalCwd);
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }
  });

  describe('Complete Version Release Flow', () => {
    it('should complete full version release cycle', async () => {
      // 1. 添加一些功能提交
      fs.writeFileSync('feature1.js', 'console.log("Feature 1");');
      execSync('git add .');
      execSync('git commit -m "feat(core): add feature 1"');
      
      fs.writeFileSync('feature2.js', 'console.log("Feature 2");');
      execSync('git add .');
      execSync('git commit -m "feat(ui): add feature 2"');
      
      // 2. 添加bug修复提交
      fs.writeFileSync('bugfix.js', 'console.log("Bug fixed");');
      execSync('git add .');
      execSync('git commit -m "fix(auth): resolve login timeout issue"');
      
      // 3. 获取当前版本
      const currentVersion = versionManager.getCurrentVersion();
      expect(currentVersion).toBe('1.0.0');
      
      // 4. 分析提交并确定版本类型
      const commits = versionManager.getCommitsSinceLastTag();
      const versionType = versionManager.analyzeCommitsForVersionType(commits);
      expect(versionType).toBe('minor'); // 因为有新功能
      
      // 5. 升级版本
      const newVersion = versionManager.bumpVersion(currentVersion, versionType);
      expect(newVersion).toBe('1.1.0');
      
      // 6. 更新package.json
      versionManager.updatePackageJson(newVersion);
      const updatedPackageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      expect(updatedPackageJson.version).toBe('1.1.0');
      
      // 7. 生成发布说明
      const releaseNotes = versionManager.generateReleaseNotes(newVersion, commits);
      expect(releaseNotes).toContain('# Release Notes v1.1.0');
      expect(releaseNotes).toContain('feat(core): add feature 1');
      expect(releaseNotes).toContain('feat(ui): add feature 2');
      expect(releaseNotes).toContain('fix(auth): resolve login timeout issue');
      
      // 8. 保存发布说明
      const releaseNotesPath = `RELEASE_NOTES_v${newVersion}.md`;
      fs.writeFileSync(releaseNotesPath, releaseNotes);
      
      // 9. 提交版本更新
      execSync('git add .');
      execSync(`git commit -m "chore: bump version to ${newVersion}"`);
      
      // 10. 创建Git标签
      const tagMessage = `Release ${newVersion}`;
      execSync(`git tag -a v${newVersion} -m "${tagMessage}"`);
      
      // 11. 验证标签创建
      const tags = execSync('git tag', { encoding: 'utf8' }).trim().split('\n');
      expect(tags).toContain(`v${newVersion}`);
      
      // 12. 验证版本历史
      const versionTags = historyManager.getAllVersionTags();
      expect(versionTags).toContain(`v${newVersion}`);
      
      // 13. 验证标签信息
      const tagInfo = historyManager.getTagInfo(`v${newVersion}`);
      expect(tagInfo).not.toBeNull();
      expect(tagInfo.version).toBe(newVersion);
      expect(tagInfo.message).toBe(tagMessage);
    });

    it('should handle breaking changes correctly', async () => {
      // 添加破坏性变更提交
      fs.writeFileSync('breaking-change.js', 'console.log("Breaking change");');
      execSync('git add .');
      execSync('git commit -m "feat(api)!:
        change authentication method\n\nBREAKING CHANGE: API v1 is no longer supported"');
      
      // 分析提交类型
      const commits = versionManager.getCommitsSinceLastTag();
      const versionType = versionManager.analyzeCommitsForVersionType(commits);
      expect(versionType).toBe('major');
      
      // 升级主版本号
      const currentVersion = versionManager.getCurrentVersion();
      const newVersion = versionManager.bumpVersion(currentVersion, versionType);
      expect(newVersion).toBe('2.0.0');
      
      // 生成发布说明应包含破坏性变更警告
      const releaseNotes = versionManager.generateReleaseNotes(newVersion, commits);
      expect(releaseNotes).toContain('⚠️ 破坏性变更');
      expect(releaseNotes).toContain('change authentication method');
    });

    it('should handle prerelease versions', async () => {
      // 创建预发布版本
      const currentVersion = versionManager.getCurrentVersion();
      const prereleaseVersion = versionManager.bumpVersion(currentVersion, 'prerelease');
      expect(prereleaseVersion).toMatch(/^\d+\.\d+\.\d+-beta\.\d+$/);
      
      // 更新package.json
      versionManager.updatePackageJson(prereleaseVersion);
      
      // 提交并标签
      execSync('git add .');
      execSync(`git commit -m "chore: bump version to ${prereleaseVersion}"`);
      execSync(`git tag -a v${prereleaseVersion} -m "Prerelease ${prereleaseVersion}"`);
      
      // 验证预发布版本在历史中
      const versionTags = historyManager.getAllVersionTags();
      expect(versionTags).toContain(`v${prereleaseVersion}`);
    });
  });

  describe('Git Operations Validation', () => {
    it('should validate git repository state', () => {
      // 测试干净的工作目录
      let status = rollbackManager.checkWorkingDirectory();
      expect(status.clean).toBe(true);
      expect(status.modifiedFiles).toEqual([]);
      
      // 创建未提交的更改
      fs.writeFileSync('temp-file.js', 'console.log("temp");');
      
      // 测试脏工作目录
      status = rollbackManager.checkWorkingDirectory();
      expect(status.clean).toBe(false);
      expect(status.modifiedFiles.length).toBeGreaterThan(0);
      
      // 清理
      fs.unlinkSync('temp-file.js');
    });

    it('should validate commit message format', () => {
      const validMessages = [
        'feat: add new feature',
        'fix(auth): resolve login issue',
        'docs: update README',
        'style(ui): improve button styling',
        'refactor: restructure user service',
        'test: add unit tests for auth',
        'chore: update dependencies'
      ];
      
      const invalidMessages = [
        'invalid message',
        'feat add feature', // missing colon
        'FEAT: uppercase type',
        'feat: ', // empty description
        'feat: a', // too short description
        'feat: this is a very long description that exceeds the fifty character limit for commit messages'
      ];
      
      validMessages.forEach(message => {
        const result = validateCommitMessage(message);
        expect(result.valid).toBe(true);
      });
      
      invalidMessages.forEach(message => {
        const result = validateCommitMessage(message);
        expect(result.valid).toBe(false);
      });
    });

    it('should handle git tag operations correctly', () => {
      const testTag = 'v1.2.3-test';
      const testMessage = 'Test tag message';
      
      // 创建标签
      execSync(`git tag -a ${testTag} -m "${testMessage}"`);
      
      // 验证标签存在
      const tags = execSync('git tag', { encoding: 'utf8' }).trim().split('\n');
      expect(tags).toContain(testTag);
      
      // 获取标签信息
      const tagInfo = historyManager.getTagInfo(testTag);
      expect(tagInfo).not.toBeNull();
      expect(tagInfo.tag).toBe(testTag);
      expect(tagInfo.message).toBe(testMessage);
      
      // 删除测试标签
      execSync(`git tag -d ${testTag}`);
    });

    it('should handle branch operations', () => {
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      expect(currentBranch).toBe('master'); // 或 'main'，取决于Git版本
      
      // 创建并切换到新分支
      execSync('git checkout -b test-branch');
      const newBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      expect(newBranch).toBe('test-branch');
      
      // 切换回原分支
      execSync(`git checkout ${currentBranch}`);
      
      // 删除测试分支
      execSync('git branch -d test-branch');
    });
  });

  describe('Version History and Rollback', () => {
    beforeEach(() => {
      // 确保有一些版本历史
      if (historyManager.getAllVersionTags().length === 0) {
        // 创建一个测试版本
        execSync('git tag -a v1.0.0-test -m "Test version"');
      }
    });

    it('should retrieve version history correctly', () => {
      const versions = historyManager.getAllVersionTags();
      expect(Array.isArray(versions)).toBe(true);
      expect(versions.length).toBeGreaterThan(0);
      
      // 验证版本排序（最新的在前）
      if (versions.length > 1) {
        const version1 = versions[0];
        const version2 = versions[1];
        // 简单的版本比较（假设都是v开头的语义化版本）
        expect(version1.localeCompare(version2, undefined,
          { numeric: true })).toBeGreaterThanOrEqual(0);
      }
    });

    it('should compare versions correctly', () => {
      const versions = historyManager.getAllVersionTags();
      if (versions.length >= 2) {
        const version1 = versions[0].replace('v', '');
        const version2 = versions[1].replace('v', '');
        
        // 比较版本应该不会抛出错误
        expect(() => {
          historyManager.compareVersions(version2, version1);
        }).not.toThrow();
      }
    });

    it('should validate rollback prerequisites', () => {
      const versions = rollbackManager.getAvailableVersions();
      expect(Array.isArray(versions)).toBe(true);
      
      if (versions.length > 0) {
        const targetVersion = versions[0];
        
        // 验证目标版本
        expect(() => {
          rollbackManager.validateTargetVersion(targetVersion);
        }).not.toThrow();
        
        // 验证系统状态
        const systemChecks = rollbackManager.validateSystemState();
        expect(Array.isArray(systemChecks)).toBe(true);
        expect(systemChecks.length).toBeGreaterThan(0);
        
        // 至少Git检查应该通过
        const gitCheck = systemChecks.find(check => check.name === 'Git仓库');
        expect(gitCheck).toBeDefined();
        expect(gitCheck.status).toBe('ok');
      }
    });

    it('should create backup before rollback', () => {
      const versions = rollbackManager.getAvailableVersions();
      if (versions.length > 0) {
        const targetVersion = versions[0];
        
        // 创建备份
        const backupInfo = rollbackManager.createBackup(targetVersion);
        expect(backupInfo).toBeDefined();
        expect(backupInfo.fromVersion).toBeDefined();
        expect(backupInfo.toVersion).toBeDefined();
        expect(backupInfo.timestamp).toBeDefined();
        
        // 验证备份目录存在
        const backupDir = path.join(process.cwd(), '.version-backups');
        if (fs.existsSync(backupDir)) {
          const backups = fs.readdirSync(backupDir);
          expect(backups.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Release Documentation Generation', () => {
    it('should generate comprehensive release notes', () => {
      // 创建测试提交历史
      const testCommits = [
        {
          hash: 'abc123def456',
          message: 'feat(ui): add responsive navigation menu',
          author: 'Developer 1',
          date: '2025-01-04'
        },
        {
          hash: 'def456ghi789',
          message: 'fix(auth): resolve session timeout issue',
          author: 'Developer 2',
          date: '2025-01-04'
        },
        {
          hash: 'ghi789jkl012',
          message: 'docs: update API documentation',
          author: 'Developer 3',
          date: '2025-01-04'
        },
        {
          hash: 'jkl012mno345',
          message: 'feat(api)!: change authentication method',
          author: 'Developer 4',
          date: '2025-01-04'
        }
      ];
      
      const version = '2.1.0';
      const releaseNotes = docGenerator.generateReleaseNotes(version, testCommits);
      
      // 验证发布说明结构
      expect(releaseNotes).toContain(`# 🚀 Inspi AI Platform ${version} 发布说明`);
      expect(releaseNotes).toContain('## 🚀 新功能');
      expect(releaseNotes).toContain('## 🐛 问题修复');
      expect(releaseNotes).toContain('## ⚠️ 破坏性变更');
      expect(releaseNotes).toContain('## 📊 版本统计');
      
      // 验证内容包含
      expect(releaseNotes).toContain('add responsive navigation menu');
      expect(releaseNotes).toContain('resolve session timeout issue');
      expect(releaseNotes).toContain('change authentication method');
      
      // 验证统计信息
      expect(releaseNotes).toContain('总提交数**: 4');
      expect(releaseNotes).toContain('新功能**: 2');
      expect(releaseNotes).toContain('问题修复**: 1');
      expect(releaseNotes).toContain('破坏性变更**: 1');
    });

    it('should generate changelog entries', () => {
      const testCommits = [
        {
          hash: 'abc123',
          message: 'feat: add new dashboard',
          author: 'Dev1',
          date: '2025-01-04'
        },
        {
          hash: 'def456',
          message: 'fix: resolve memory leak',
          author: 'Dev2',
          date: '2025-01-04'
        }
      ];
      
      const version = '1.2.0';
      const changelog = docGenerator.generateChangelog(version, testCommits);
      
      expect(changelog).toContain(`## [${version}]`);
      expect(changelog).toContain('### 🚀 Features');
      expect(changelog).toContain('### 🐛 Bug Fixes');
      expect(changelog).toContain('add new dashboard');
      expect(changelog).toContain('resolve memory leak');
    });

    it('should generate tag descriptions', () => {
      const testCommits = [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'Dev1',
          date: '2025-01-04'
        }
      ];
      
      const version = '1.1.0';
      const description = docGenerator.generateTagDescription(version, testCommits);
      
      expect(description).toContain(`Release ${version}`);
      expect(description).toContain('📊 版本统计:');
      expect(description).toContain('总提交数: 1');
      expect(description).toContain('📝 主要变更:');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid version formats gracefully', () => {
      expect(() => {
        versionManager.parseVersion('invalid-version');
      }).toThrow('无效的版本号格式');
      
      expect(() => {
        versionManager.bumpVersion('invalid', 'patch');
      }).toThrow();
    });

    it('should handle missing git repository', () => {
      // 临时移动到非Git目录
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-git-'));
      const originalDir = process.cwd();
      
      try {
        process.chdir(tempDir);
        
        // Git操作应该失败或返回空结果
        expect(() => {
          historyManager.getAllVersionTags();
        }).not.toThrow(); // 应该优雅处理，返回空数组
        
        const tags = historyManager.getAllVersionTags();
        expect(tags).toEqual([]);
        
      } finally {
        process.chdir(originalDir);
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should handle missing package.json', () => {
      // 备份原始package.json
      const originalPackageJson = fs.readFileSync('package.json', 'utf8');
      fs.unlinkSync('package.json');
      
      try {
        expect(() => {
          versionManager.getCurrentVersion();
        }).toThrow();
        
      } finally {
        // 恢复package.json
        fs.writeFileSync('package.json', originalPackageJson);
      }
    });

    it('should handle empty commit history', () => {
      // 模拟没有提交的情况
      const commits = docGenerator.getCommitHistory('non-existent-tag');
      expect(commits).toEqual([]);
      
      // 生成发布说明应该处理空提交列表
      const releaseNotes = docGenerator.generateReleaseNotes('1.0.0', []);
      expect(releaseNotes).toContain('# 🚀 Inspi AI Platform 1.0.0 发布说明');
      expect(releaseNotes).toContain('总提交数**: 0');
    });

    it('should validate system requirements', () => {
      const checks = rollbackManager.validateSystemState();
      
      // 应该至少检查Git、package.json和node_modules
      const checkNames = checks.map(check => check.name);
      expect(checkNames).toContain('Git仓库');
      expect(checkNames).toContain('package.json');
      expect(checkNames).toContain('node_modules');
      
      // Git和package.json检查应该通过
      const gitCheck = checks.find(check => check.name === 'Git仓库');
      const packageCheck = checks.find(check => check.name === 'package.json');
      
      expect(gitCheck.status).toBe('ok');
      expect(packageCheck.status).toBe('ok');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large commit history efficiently', () => {
      const startTime = Date.now();
      
      // 获取所有版本标签
      const versions = historyManager.getAllVersionTags();
      
      // 如果有版本，获取提交历史
      if (versions.length > 0) {
        const commits = docGenerator.getCommitHistory(versions[versions.length - 1]);
        expect(Array.isArray(commits)).toBe(true);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 操作应该在合理时间内完成（1秒）
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent operations safely', async () => {
      // 模拟并发版本检查操作
      const promises = Array.from({ length: 5 }, () => {
        return Promise.resolve(versionManager.getCurrentVersion());
      });
      
      const results = await Promise.all(promises);
      
      // 所有结果应该一致
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toBe(firstResult);
      });
    });
  });
});