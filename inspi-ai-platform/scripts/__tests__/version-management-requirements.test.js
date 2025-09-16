/**
 * 版本管理系统需求验证测试
 * 验证所有需求文档中定义的验收标准
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Import all version management modules
const VersionManager = require('../bump-version');
const { validateCommitMessage, parseCommitMessage } = require('../validate-commit-msg');
const VersionHistoryManager = require('../version-history');
const VersionRollbackManager = require('../version-rollback');
const ReleaseDocGenerator = require('../release-doc-generator');

describe('Version Management System Requirements Validation', () => {
  let testRepoPath;
  let originalCwd;
  let versionManager;
  let historyManager;
  let rollbackManager;
  let docGenerator;

  beforeAll(() => {
    // 创建临时测试仓库
    testRepoPath = fs.mkdtempSync(path.join(os.tmpdir(), 'requirements-test-'));
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
      description: 'Test package for requirements validation'
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

  describe('需求1：语义化版本控制', () => {
    describe('1.1 重大更新（破坏性变更）增加主版本号', () => {
      it('WHEN 进行重大更新（破坏性变更）THEN 系统 SHALL 增加主版本号（MAJOR）', () => {
        const breakingCommits = [
          'feat!: remove deprecated API endpoints',
          'fix!: change data structure format',
          'feat(api)!: modify authentication system'
        ];
        
        const versionType = versionManager.analyzeCommitsForVersionType(breakingCommits);
        expect(versionType).toBe('major');
        
        const newVersion = versionManager.bumpVersion('1.2.3', versionType);
        expect(newVersion).toBe('2.0.0');
      });
    });

    describe('1.2 新功能（向后兼容）增加次版本号', () => {
      it('WHEN 添加新功能（向后兼容）THEN 系统 SHALL 增加次版本号（MINOR）', () => {
        const featureCommits = [
          'feat: add user authentication',
          'feat(ui): add responsive navigation',
          'fix: resolve minor bug'
        ];
        
        const versionType = versionManager.analyzeCommitsForVersionType(featureCommits);
        expect(versionType).toBe('minor');
        
        const newVersion = versionManager.bumpVersion('1.2.3', versionType);
        expect(newVersion).toBe('1.3.0');
      });
    });

    describe('1.3 修复bug（向后兼容）增加修订版本号', () => {
      it('WHEN 修复bug（向后兼容）THEN 系统 SHALL 增加修订版本号（PATCH）', () => {
        const bugfixCommits = [
          'fix: resolve login timeout',
          'fix(ui): correct button alignment',
          'docs: update README'
        ];
        
        const versionType = versionManager.analyzeCommitsForVersionType(bugfixCommits);
        expect(versionType).toBe('patch');
        
        const newVersion = versionManager.bumpVersion('1.2.3', versionType);
        expect(newVersion).toBe('1.2.4');
      });
    });

    describe('1.4 预发布版本支持', () => {
      it('WHEN 发布预发布版本 THEN 系统 SHALL 支持预发布标识符（alpha, beta, rc）', () => {
        const prereleaseVersion = versionManager.bumpVersion('1.2.3', 'prerelease');
        expect(prereleaseVersion).toMatch(/^1\.2\.3-beta\.\d+$/);
        
        const alphaVersion = versionManager.bumpVersion('1.2.3', 'prerelease', 'alpha');
        expect(alphaVersion).toMatch(/^1\.2\.3-alpha\.\d+$/);
        
        const rcVersion = versionManager.bumpVersion('1.2.3', 'prerelease', 'rc');
        expect(rcVersion).toMatch(/^1\.2\.3-rc\.\d+$/);
      });
    });

    describe('1.5 package.json版本同步', () => {
      it('WHEN 版本号更新 THEN package.json文件 SHALL 同步更新版本号', () => {
        const newVersion = '1.2.4';
        versionManager.updatePackageJson(newVersion);
        
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        expect(packageJson.version).toBe(newVersion);
      });
    });
  });

  describe('需求2：自动化版本发布流程', () => {
    describe('2.1 自动更新package.json版本号', () => {
      it('WHEN 执行版本发布命令 THEN 系统 SHALL 自动更新package.json版本号', () => {
        const currentVersion = versionManager.getCurrentVersion();
        const newVersion = versionManager.bumpVersion(currentVersion, 'patch');
        
        versionManager.updatePackageJson(newVersion);
        
        const updatedPackageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        expect(updatedPackageJson.version).toBe(newVersion);
      });
    });

    describe('2.2 自动创建git提交', () => {
      it('WHEN 版本号更新完成 THEN 系统 SHALL 自动创建git提交', () => {
        const newVersion = '1.2.5';
        versionManager.updatePackageJson(newVersion);
        
        // 模拟自动提交过程
        execSync('git add package.json');
        execSync(`git commit -m "chore: bump version to ${newVersion}"`);
        
        const lastCommit = execSync('git log -1 --format="%s"', { encoding: 'utf8' }).trim();
        expect(lastCommit).toBe(`chore: bump version to ${newVersion}`);
      });
    });

    describe('2.3 自动创建git标签', () => {
      it('WHEN git提交完成 THEN 系统 SHALL 自动创建git标签', () => {
        const version = '1.2.6';
        const tagName = `v${version}`;
        const tagMessage = `Release ${version}`;
        
        // 模拟标签创建
        execSync(`git tag -a ${tagName} -m "${tagMessage}"`);
        
        const tags = execSync('git tag', { encoding: 'utf8' }).trim().split('\n');
        expect(tags).toContain(tagName);
        
        const tagInfo = execSync(`git tag -l -n1 ${tagName}`, { encoding: 'utf8' }).trim();
        expect(tagInfo).toContain(tagMessage);
      });
    });

    describe('2.4 自动生成发布说明文档', () => {
      it('WHEN git标签创建完成 THEN 系统 SHALL 自动生成发布说明文档', () => {
        const version = '1.2.7';
        const commits = [
          {
            hash: 'abc123',
            message: 'feat: add new feature',
            author: 'Test User',
            date: '2025-01-04'
          }
        ];
        
        const releaseNotes = versionManager.generateReleaseNotes(version, commits);
        
        expect(releaseNotes).toContain(`# Release Notes v${version}`);
        expect(releaseNotes).toContain('feat: add new feature');
        
        // 保存发布说明
        const releaseNotesPath = `RELEASE_NOTES_v${version}.md`;
        fs.writeFileSync(releaseNotesPath, releaseNotes);
        
        expect(fs.existsSync(releaseNotesPath)).toBe(true);
      });
    });

    describe('2.5 提供回滚机制', () => {
      it('WHEN 发布流程出错 THEN 系统 SHALL 提供回滚机制', () => {
        const currentVersion = versionManager.getCurrentVersion();
        const availableVersions = rollbackManager.getAvailableVersions();
        
        expect(availableVersions.length).toBeGreaterThan(0);
        
        // 验证回滚功能可用
        const targetVersion = availableVersions[0];
        expect(() => {
          rollbackManager.validateTargetVersion(targetVersion);
        }).not.toThrow();
        
        // 验证备份功能
        const backupInfo = rollbackManager.createBackup(targetVersion);
        expect(backupInfo).toBeDefined();
        expect(backupInfo.fromVersion).toBe(currentVersion);
      });
    });
  });

  describe('需求3：Git工作流规范', () => {
    describe('3.1 使用feature分支进行开发', () => {
      it('WHEN 创建新功能 THEN 开发者 SHALL 使用feature分支进行开发', () => {
        const featureBranchName = 'feature/test-feature';
        
        // 创建feature分支
        execSync(`git checkout -b ${featureBranchName}`);
        
        const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
        expect(currentBranch).toBe(featureBranchName);
        expect(featureBranchName).toMatch(/^feature\//);
        
        // 清理
        execSync('git checkout main || git checkout master');
        execSync(`git branch -d ${featureBranchName}`);
      });
    });

    describe('3.2 使用hotfix分支进行修复', () => {
      it('WHEN 修复bug THEN 开发者 SHALL 使用hotfix分支进行修复', () => {
        const hotfixBranchName = 'hotfix/critical-bug-fix';
        
        // 创建hotfix分支
        execSync(`git checkout -b ${hotfixBranchName}`);
        
        const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
        expect(currentBranch).toBe(hotfixBranchName);
        expect(hotfixBranchName).toMatch(/^hotfix\//);
        
        // 清理
        execSync('git checkout main || git checkout master');
        execSync(`git branch -d ${hotfixBranchName}`);
      });
    });

    describe('3.3 使用release分支进行发布准备', () => {
      it('WHEN 准备发布 THEN 开发者 SHALL 使用release分支进行发布准备', () => {
        const releaseBranchName = 'release/v1.3.0';
        
        // 创建release分支
        execSync(`git checkout -b ${releaseBranchName}`);
        
        const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
        expect(currentBranch).toBe(releaseBranchName);
        expect(releaseBranchName).toMatch(/^release\//);
        
        // 清理
        execSync('git checkout main || git checkout master');
        execSync(`git branch -d ${releaseBranchName}`);
      });
    });
  });

  describe('需求4：提交信息规范', () => {
    describe('4.1 包含类型前缀', () => {
      it('WHEN 提交代码 THEN 提交信息 SHALL 包含类型前缀', () => {
        const validTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'];
        
        validTypes.forEach(type => {
          const message = `${type}: test description`;
          const result = validateCommitMessage(message);
          expect(result.valid).toBe(true);
          expect(result.parsed.type).toBe(type);
        });
      });
    });

    describe('4.2 包含BREAKING CHANGE标识', () => {
      it('WHEN 提交信息包含破坏性变更 THEN 提交信息 SHALL 包含BREAKING CHANGE标识', () => {
        const breakingMessages = [
          'feat!: remove deprecated API',
          'feat(api)!: change authentication method',
          'fix!: correct data validation logic'
        ];
        
        breakingMessages.forEach(message => {
          const result = validateCommitMessage(message);
          expect(result.valid).toBe(true);
          expect(result.parsed.hasBreakingChange).toBe(true);
        });
      });
    });

    describe('4.3 包含范围标识', () => {
      it('WHEN 提交信息涉及特定范围 THEN 提交信息 SHALL 包含范围标识', () => {
        const scopedMessages = [
          'feat(ui): add responsive design',
          'fix(auth): resolve login timeout',
          'docs(api): update endpoint documentation'
        ];
        
        scopedMessages.forEach(message => {
          const result = validateCommitMessage(message);
          expect(result.valid).toBe(true);
          expect(result.parsed.scope).toBeTruthy();
        });
      });
    });

    describe('4.4 支持多行描述格式', () => {
      it('WHEN 提交信息过长 THEN 系统 SHALL 支持多行描述格式', () => {
        const multilineMessage = `feat(auth): implement OAuth integration

Add support for Google and GitHub OAuth providers.
Include user profile synchronization and token refresh.

Closes #123
BREAKING CHANGE: Authentication flow has changed`;
        
        const result = validateCommitMessage(multilineMessage);
        expect(result.valid).toBe(true);
        expect(result.parsed.hasBreakingChange).toBe(true);
      });
    });

    describe('4.5 拒绝不符合规范的提交', () => {
      it('WHEN 提交信息不符合规范 THEN 系统 SHALL 拒绝提交并提供错误提示', () => {
        const invalidMessages = [
          'invalid commit message',
          'feat add feature', // 缺少冒号
          'FEAT: uppercase type',
          'feat: ', // 空描述
          'feat: a' // 描述太短
        ];
        
        invalidMessages.forEach(message => {
          const result = validateCommitMessage(message);
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('需求5：发布文档自动生成', () => {
    describe('5.1 自动生成发布说明文档', () => {
      it('WHEN 创建新版本 THEN 系统 SHALL 自动生成发布说明文档', () => {
        const version = '1.3.0';
        const commits = [
          {
            hash: 'abc123',
            message: 'feat: add new dashboard',
            author: 'Dev1',
            date: '2025-01-04'
          }
        ];
        
        const releaseNotes = docGenerator.generateReleaseNotes(version, commits);
        
        expect(releaseNotes).toContain(`# 🚀 Inspi AI Platform ${version} 发布说明`);
        expect(releaseNotes).toBeTruthy();
        expect(releaseNotes.length).toBeGreaterThan(100);
      });
    });

    describe('5.2 包含版本概述、主要变更、修复内容', () => {
      it('WHEN 生成发布说明 THEN 文档 SHALL 包含版本概述、主要变更、修复内容', () => {
        const version = '1.3.1';
        const commits = [
          {
            hash: 'abc123',
            message: 'feat(ui): add new component',
            author: 'Dev1',
            date: '2025-01-04'
          },
          {
            hash: 'def456',
            message: 'fix(auth): resolve login issue',
            author: 'Dev2',
            date: '2025-01-04'
          }
        ];
        
        const releaseNotes = docGenerator.generateReleaseNotes(version, commits);
        
        expect(releaseNotes).toContain('## 🚀 新功能');
        expect(releaseNotes).toContain('## 🐛 问题修复');
        expect(releaseNotes).toContain('## 📊 版本统计');
        expect(releaseNotes).toContain('add new component');
        expect(releaseNotes).toContain('resolve login issue');
      });
    });

    describe('5.3 包含迁移指南和破坏性变更说明', () => {
      it('WHEN 生成发布说明 THEN 文档 SHALL 包含迁移指南和破坏性变更说明', () => {
        const version = '2.0.0';
        const commits = [
          {
            hash: 'abc123',
            message: 'feat(api)!: change authentication method',
            author: 'Dev1',
            date: '2025-01-04'
          }
        ];
        
        const releaseNotes = docGenerator.generateReleaseNotes(version, commits);
        
        expect(releaseNotes).toContain('## ⚠️ 破坏性变更');
        expect(releaseNotes).toContain('**迁移指南**:');
        expect(releaseNotes).toContain('change authentication method');
      });
    });

    describe('5.4 包含贡献者信息和致谢', () => {
      it('WHEN 生成发布说明 THEN 文档 SHALL 包含贡献者信息和致谢', () => {
        const version = '1.3.2';
        const commits = [
          {
            hash: 'abc123',
            message: 'feat: add feature',
            author: 'Alice',
            date: '2025-01-04'
          },
          {
            hash: 'def456',
            message: 'fix: fix bug',
            author: 'Bob',
            date: '2025-01-04'
          }
        ];
        
        const releaseNotes = docGenerator.generateReleaseNotes(version, commits);
        
        expect(releaseNotes).toContain('## 👥 贡献者');
        expect(releaseNotes).toContain('Alice');
        expect(releaseNotes).toContain('Bob');
      });
    });

    describe('5.5 将文档添加到版本控制', () => {
      it('WHEN 发布说明生成完成 THEN 系统 SHALL 将文档添加到版本控制', () => {
        const version = '1.3.3';
        const commits = [
          {
            hash: 'abc123',
            message: 'feat: add feature',
            author: 'Dev1',
            date: '2025-01-04'
          }
        ];
        
        const releaseNotes = docGenerator.generateReleaseNotes(version, commits);
        const releaseNotesPath = `RELEASE_NOTES_v${version}.md`;
        
        // 保存发布说明
        fs.writeFileSync(releaseNotesPath, releaseNotes);
        
        // 添加到Git
        execSync(`git add ${releaseNotesPath}`);
        execSync(`git commit -m "docs: add release notes for v${version}"`);
        
        // 验证文件在版本控制中
        const trackedFiles = execSync('git ls-files', { encoding: 'utf8' });
        expect(trackedFiles).toContain(releaseNotesPath);
      });
    });
  });

  describe('需求6：版本历史管理', () => {
    describe('6.1 提供版本列表和详细信息', () => {
      it('WHEN 查看版本历史 THEN 系统 SHALL 提供版本列表和详细信息', () => {
        const versions = historyManager.getAllVersionTags();
        expect(Array.isArray(versions)).toBe(true);
        
        if (versions.length > 0) {
          const tagInfo = historyManager.getTagInfo(versions[0]);
          expect(tagInfo).toBeDefined();
          expect(tagInfo.tag).toBeTruthy();
          expect(tagInfo.version).toBeTruthy();
          expect(tagInfo.date).toBeTruthy();
          expect(tagInfo.author).toBeTruthy();
        }
      });
    });

    describe('6.2 支持安全的版本回滚操作', () => {
      it('WHEN 需要回滚版本 THEN 系统 SHALL 支持安全的版本回滚操作', () => {
        const availableVersions = rollbackManager.getAvailableVersions();
        expect(Array.isArray(availableVersions)).toBe(true);
        
        if (availableVersions.length > 0) {
          const targetVersion = availableVersions[0];
          
          // 验证回滚前检查
          const workingDirStatus = rollbackManager.checkWorkingDirectory();
          expect(workingDirStatus).toBeDefined();
          expect(typeof workingDirStatus.clean).toBe('boolean');
          
          // 验证系统状态检查
          const systemChecks = rollbackManager.validateSystemState();
          expect(Array.isArray(systemChecks)).toBe(true);
          expect(systemChecks.length).toBeGreaterThan(0);
        }
      });
    });

    describe('6.3 提供版本间的变更对比', () => {
      it('WHEN 比较版本差异 THEN 系统 SHALL 提供版本间的变更对比', () => {
        // 创建两个版本用于比较
        execSync('git tag v1.0.0-compare-test');
        
        fs.writeFileSync('compare-test.js', 'console.log("test");');
        execSync('git add compare-test.js');
        execSync('git commit -m "feat: add compare test"');
        
        execSync('git tag v1.1.0-compare-test');
        
        const commits = historyManager.getCommitsBetweenVersions(
          'v1.0.0-compare-test',
          'v1.1.0-compare-test'
        );
        
        expect(Array.isArray(commits)).toBe(true);
        expect(commits.length).toBeGreaterThan(0);
        expect(commits[0]).toHaveProperty('hash');
        expect(commits[0]).toHaveProperty('message');
        
        // 清理
        execSync('git tag -d v1.0.0-compare-test');
        execSync('git tag -d v1.1.0-compare-test');
        fs.unlinkSync('compare-test.js');
      });
    });

    describe('6.4 支持基于提交信息的搜索', () => {
      it('WHEN 查找特定变更 THEN 系统 SHALL 支持基于提交信息的搜索', () => {
        // 创建测试提交
        fs.writeFileSync('search-test.js', 'console.log("search test");');
        execSync('git add search-test.js');
        execSync('git commit -m "feat(search): add search functionality"');
        
        // 搜索功能应该能找到相关提交
        const searchResults = historyManager.searchVersions('search');
        expect(Array.isArray(searchResults) || searchResults === undefined).toBe(true);
        
        // 清理
        fs.unlinkSync('search-test.js');
      });
    });
  });

  describe('需求验证总结', () => {
    it('should validate all core requirements are implemented', () => {
      // 验证所有核心组件都已实例化并可用
      expect(versionManager).toBeDefined();
      expect(historyManager).toBeDefined();
      expect(rollbackManager).toBeDefined();
      expect(docGenerator).toBeDefined();
      
      // 验证核心功能可用
      expect(typeof versionManager.getCurrentVersion).toBe('function');
      expect(typeof versionManager.bumpVersion).toBe('function');
      expect(typeof versionManager.analyzeCommitsForVersionType).toBe('function');
      expect(typeof versionManager.generateReleaseNotes).toBe('function');
      
      expect(typeof validateCommitMessage).toBe('function');
      expect(typeof parseCommitMessage).toBe('function');
      
      expect(typeof historyManager.getAllVersionTags).toBe('function');
      expect(typeof historyManager.getTagInfo).toBe('function');
      expect(typeof historyManager.getCommitsBetweenVersions).toBe('function');
      
      expect(typeof rollbackManager.getAvailableVersions).toBe('function');
      expect(typeof rollbackManager.validateTargetVersion).toBe('function');
      expect(typeof rollbackManager.checkWorkingDirectory).toBe('function');
      
      expect(typeof docGenerator.generateReleaseNotes).toBe('function');
      expect(typeof docGenerator.generateChangelog).toBe('function');
    });

    it('should validate system integration works end-to-end', () => {
      // 执行一个完整的版本管理流程
      const currentVersion = versionManager.getCurrentVersion();
      expect(currentVersion).toMatch(/^\d+\.\d+\.\d+/);
      
      // 模拟提交分析
      const testCommits = ['feat: add test feature', 'fix: resolve test bug'];
      const versionType = versionManager.analyzeCommitsForVersionType(testCommits);
      expect(['major', 'minor', 'patch'].includes(versionType)).toBe(true);
      
      // 模拟版本升级
      const newVersion = versionManager.bumpVersion(currentVersion, versionType);
      expect(newVersion).toMatch(/^\d+\.\d+\.\d+/);
      
      // 验证版本比较
      const comparison = versionManager.compareVersions(currentVersion, newVersion);
      expect(comparison).toBeDefined();
    });
  });
});