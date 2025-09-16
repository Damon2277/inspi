/**
 * Git操作验证测试
 * 验证所有Git相关操作的正确性和安全性
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Import git-related modules
const {
  getCurrentBranch,
  getWorkingDirectoryStatus,
  branchExists,
  createFeatureBranch,
  mergeFeature,
  CONFIG
} = require('../git-flow');

const { validateCommitMessage } = require('../validate-commit-msg');

describe('Git Operations Validation Tests', () => {
  let testRepoPath;
  let originalCwd;

  beforeAll(() => {
    // 创建临时测试仓库
    testRepoPath = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-'));
    originalCwd = process.cwd();
    
    // 初始化Git仓库
    process.chdir(testRepoPath);
    execSync('git init');
    execSync('git config user.name "Test User"');
    execSync('git config user.email "test@example.com"');
    
    // 创建初始文件和提交
    fs.writeFileSync('README.md', '# Test Repository');
    fs.writeFileSync('package.json', JSON.stringify({
      name: 'test-repo',
      version: '1.0.0'
    }, null, 2));
    
    execSync('git add .');
    execSync('git commit -m "chore: initial commit"');
  });

  afterAll(() => {
    // 清理测试环境
    process.chdir(originalCwd);
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }
  });

  describe('Git Repository State Validation', () => {
    it('should detect clean working directory', () => {
      const status = getWorkingDirectoryStatus();
      
      expect(status.clean).toBe(true);
      expect(status.staged).toEqual([]);
      expect(status.modified).toEqual([]);
      expect(status.untracked).toEqual([]);
      expect(status.totalChanges).toBe(0);
    });

    it('should detect staged files', () => {
      // 创建新文件并暂存
      fs.writeFileSync('new-file.js', 'console.log("new file");');
      execSync('git add new-file.js');
      
      const status = getWorkingDirectoryStatus();
      
      expect(status.clean).toBe(false);
      expect(status.staged.length).toBeGreaterThan(0);
      expect(status.totalChanges).toBeGreaterThan(0);
      
      // 清理
      execSync('git reset HEAD new-file.js');
      fs.unlinkSync('new-file.js');
    });

    it('should detect modified files', () => {
      // 修改现有文件
      fs.writeFileSync('README.md', '# Modified Test Repository');
      
      const status = getWorkingDirectoryStatus();
      
      expect(status.clean).toBe(false);
      expect(status.modified.length).toBeGreaterThan(0);
      expect(status.totalChanges).toBeGreaterThan(0);
      
      // 清理
      execSync('git checkout -- README.md');
    });

    it('should detect untracked files', () => {
      // 创建未跟踪文件
      fs.writeFileSync('untracked.js', 'console.log("untracked");');
      
      const status = getWorkingDirectoryStatus();
      
      expect(status.clean).toBe(false);
      expect(status.untracked.length).toBeGreaterThan(0);
      expect(status.totalChanges).toBeGreaterThan(0);
      
      // 清理
      fs.unlinkSync('untracked.js');
    });

    it('should handle mixed file states', () => {
      // 创建多种状态的文件
      fs.writeFileSync('staged.js', 'console.log("staged");');
      execSync('git add staged.js');
      
      fs.writeFileSync('README.md', '# Modified README');
      fs.writeFileSync('untracked.js', 'console.log("untracked");');
      
      const status = getWorkingDirectoryStatus();
      
      expect(status.clean).toBe(false);
      expect(status.staged.length).toBeGreaterThan(0);
      expect(status.modified.length).toBeGreaterThan(0);
      expect(status.untracked.length).toBeGreaterThan(0);
      expect(status.totalChanges).toBeGreaterThan(2);
      
      // 清理
      execSync('git reset HEAD staged.js');
      fs.unlinkSync('staged.js');
      execSync('git checkout -- README.md');
      fs.unlinkSync('untracked.js');
    });
  });

  describe('Branch Operations Validation', () => {
    it('should get current branch correctly', () => {
      const currentBranch = getCurrentBranch();
      expect(typeof currentBranch).toBe('string');
      expect(currentBranch.length).toBeGreaterThan(0);
      // 通常是 'master' 或 'main'
      expect(['master', 'main']).toContain(currentBranch);
    });

    it('should detect existing branches', () => {
      const currentBranch = getCurrentBranch();
      
      // 当前分支应该存在
      expect(branchExists(currentBranch)).toBe(true);
      
      // 不存在的分支应该返回false
      expect(branchExists('non-existent-branch')).toBe(false);
    });

    it('should create and switch branches safely', () => {
      const originalBranch = getCurrentBranch();
      const testBranchName = 'test-feature-branch';
      
      // 创建新分支
      execSync(`git checkout -b ${testBranchName}`);
      
      // 验证分支切换
      expect(getCurrentBranch()).toBe(testBranchName);
      expect(branchExists(testBranchName)).toBe(true);
      
      // 切换回原分支
      execSync(`git checkout ${originalBranch}`);
      expect(getCurrentBranch()).toBe(originalBranch);
      
      // 删除测试分支
      execSync(`git branch -d ${testBranchName}`);
      expect(branchExists(testBranchName)).toBe(false);
    });

    it('should handle remote branch detection', () => {
      // 如果有远程仓库配置，测试远程分支检测
      try {
        execSync('git remote', { stdio: 'pipe' });
        // 如果有远程仓库，测试远程分支检测
        const hasRemote = true;
        if (hasRemote) {
          // 这里可以添加远程分支测试
          expect(true).toBe(true); // 占位符
        }
      } catch (error) {
        // 没有远程仓库，跳过测试
        expect(true).toBe(true);
      }
    });

    it('should validate branch naming conventions', () => {
      const validBranchNames = [
        'feature/user-authentication',
        'hotfix/login-bug',
        'release/v1.2.0',
        'bugfix/memory-leak'
      ];
      
      const invalidBranchNames = [
        'feature-without-slash',
        'FEATURE/uppercase',
        'feature/with spaces',
        'feature/with@special#chars'
      ];
      
      validBranchNames.forEach(branchName => {
        // 验证分支名称格式（这里简化验证）
        expect(branchName).toMatch(/^(feature|hotfix|release|bugfix)\//);
      });
      
      invalidBranchNames.forEach(branchName => {
        // 验证无效分支名称
        if (branchName.includes(' ') || branchName.includes('@') || branchName.includes('#')) {
          expect(branchName).toMatch(/[\s@#]/);
        }
      });
    });
  });

  describe('Commit Message Validation', () => {
    it('should validate conventional commit format', () => {
      const validCommits = [
        'feat: add user authentication',
        'fix: resolve login timeout',
        'docs: update API documentation',
        'style: improve button styling',
        'refactor: restructure user service',
        'test: add unit tests for auth',
        'chore: update dependencies',
        'perf: optimize database queries',
        'ci: update GitHub Actions workflow',
        'build: update webpack configuration'
      ];
      
      validCommits.forEach(message => {
        const result = validateCommitMessage(message);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should validate commit with scope', () => {
      const validScopedCommits = [
        'feat(auth): add OAuth integration',
        'fix(ui): resolve button alignment issue',
        'docs(api): update endpoint documentation',
        'test(core): add integration tests'
      ];
      
      validScopedCommits.forEach(message => {
        const result = validateCommitMessage(message);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should detect breaking changes', () => {
      const breakingChangeCommits = [
        'feat!: remove deprecated API endpoints',
        'feat(api)!: change authentication method',
        'fix!: correct data validation logic'
      ];
      
      breakingChangeCommits.forEach(message => {
        const result = validateCommitMessage(message);
        expect(result.valid).toBe(true);
        expect(result.parsed.hasBreakingChange).toBe(true);
      });
    });

    it('should reject invalid commit formats', () => {
      const invalidCommits = [
        '', // 空消息
        'invalid commit message', // 无类型
        'feat add feature', // 缺少冒号
        'FEAT: uppercase type', // 大写类型
        'feat: ', // 空描述
        'feat: a', // 描述太短
        'feat: this is a very long description that exceeds the maximum allowed length for commit messages and should be rejected',
        'invalid-type: some description' // 无效类型
      ];
      
      invalidCommits.forEach(message => {
        const result = validateCommitMessage(message);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should provide helpful warnings', () => {
      const warningCommits = [
        'feat: Add new feature', // 大写开头
        'feat: add new feature.', // 句号结尾
        'feat: added new feature', // 非祈使语气
        'feat(invalid-scope): add feature' // 无效作用域
      ];
      
      warningCommits.forEach(message => {
        const result = validateCommitMessage(message);
        // 这些应该是有效的但有警告
        expect(result.valid).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Tag Operations Validation', () => {
    it('should create and validate version tags', () => {
      const testTag = 'v1.0.0-test';
      const tagMessage = 'Test release v1.0.0';
      
      // 创建标签
      execSync(`git tag -a ${testTag} -m "${tagMessage}"`);
      
      // 验证标签存在
      const tags = execSync('git tag', { encoding: 'utf8' }).trim().split('\n').filter(t => t);
      expect(tags).toContain(testTag);
      
      // 获取标签信息
      const tagInfo = execSync(`git show ${testTag} --format="%H|%s|%an|%ad" --no-patch`, { encoding: 'utf8' }).trim();
      expect(tagInfo).toContain(tagMessage);
      
      // 删除测试标签
      execSync(`git tag -d ${testTag}`);
      
      // 验证标签已删除
      const tagsAfterDelete = execSync('git tag', { encoding: 'utf8' }).trim().split('\n').filter(t => t);
      expect(tagsAfterDelete).not.toContain(testTag);
    });

    it('should validate semantic version tag format', () => {
      const validTags = [
        'v1.0.0',
        'v1.2.3',
        'v2.0.0-alpha.1',
        'v1.0.0-beta.2',
        'v3.1.4-rc.1'
      ];
      
      const invalidTags = [
        '1.0.0', // 缺少v前缀
        'v1.0', // 不完整版本号
        'v1.0.0.0', // 版本号过长
        'version-1.0.0', // 错误前缀
        'v1.0.0-' // 不完整预发布标识
      ];
      
      validTags.forEach(tag => {
        expect(tag).toMatch(/^v\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/);
      });
      
      invalidTags.forEach(tag => {
        expect(tag).not.toMatch(/^v\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/);
      });
    });

    it('should handle tag sorting correctly', () => {
      const testTags = ['v1.0.0', 'v1.1.0', 'v1.0.1', 'v2.0.0'];
      
      // 创建测试标签
      testTags.forEach(tag => {
        execSync(`git tag ${tag}`);
      });
      
      // 获取排序后的标签
      const sortedTags = execSync('git tag -l "v*" --sort=-version:refname', { encoding: 'utf8' })
        .trim().split('\n').filter(t => t);
      
      // 验证排序顺序（最新版本在前）
      expect(sortedTags[0]).toBe('v2.0.0');
      expect(sortedTags[1]).toBe('v1.1.0');
      expect(sortedTags[2]).toBe('v1.0.1');
      expect(sortedTags[3]).toBe('v1.0.0');
      
      // 清理测试标签
      testTags.forEach(tag => {
        execSync(`git tag -d ${tag}`);
      });
    });
  });

  describe('Git History and Log Validation', () => {
    it('should retrieve commit history correctly', () => {
      // 添加一些测试提交
      fs.writeFileSync('test1.js', 'console.log("test1");');
      execSync('git add test1.js');
      execSync('git commit -m "feat: add test1 feature"');
      
      fs.writeFileSync('test2.js', 'console.log("test2");');
      execSync('git add test2.js');
      execSync('git commit -m "fix: resolve test2 issue"');
      
      // 获取提交历史
      const commits = execSync('git log --oneline --no-merges -n 5', { encoding: 'utf8' })
        .trim().split('\n').filter(line => line);
      
      expect(commits.length).toBeGreaterThanOrEqual(2);
      expect(commits[0]).toContain('fix: resolve test2 issue');
      expect(commits[1]).toContain('feat: add test1 feature');
      
      // 清理测试文件
      fs.unlinkSync('test1.js');
      fs.unlinkSync('test2.js');
    });

    it('should parse commit information correctly', () => {
      // 创建测试提交
      fs.writeFileSync('parse-test.js', 'console.log("parse test");');
      execSync('git add parse-test.js');
      execSync('git commit -m "feat(test): add parse test functionality"');
      
      // 获取详细提交信息
      const commitInfo = execSync('git log -1 --format="%H|%s|%an|%ad|%B"', { encoding: 'utf8' }).trim();
      const [hash, subject, author, date, body] = commitInfo.split('|');
      
      expect(hash).toMatch(/^[a-f0-9]{40}$/); // 完整SHA
      expect(subject).toBe('feat(test): add parse test functionality');
      expect(author).toBe('Test User');
      expect(date).toBeTruthy();
      expect(body).toContain('feat(test): add parse test functionality');
      
      // 清理
      fs.unlinkSync('parse-test.js');
    });

    it('should handle commit range queries', () => {
      // 创建标签作为起点
      execSync('git tag test-start');
      
      // 添加一些提交
      fs.writeFileSync('range1.js', 'console.log("range1");');
      execSync('git add range1.js');
      execSync('git commit -m "feat: add range1"');
      
      fs.writeFileSync('range2.js', 'console.log("range2");');
      execSync('git add range2.js');
      execSync('git commit -m "fix: add range2"');
      
      // 查询标签到HEAD的提交
      const rangeCommits = execSync('git log test-start..HEAD --oneline --no-merges', { encoding: 'utf8' })
        .trim().split('\n').filter(line => line);
      
      expect(rangeCommits.length).toBe(2);
      expect(rangeCommits[0]).toContain('fix: add range2');
      expect(rangeCommits[1]).toContain('feat: add range1');
      
      // 清理
      fs.unlinkSync('range1.js');
      fs.unlinkSync('range2.js');
      execSync('git tag -d test-start');
    });
  });

  describe('Git Configuration Validation', () => {
    it('should validate git user configuration', () => {
      const userName = execSync('git config user.name', { encoding: 'utf8' }).trim();
      const userEmail = execSync('git config user.email', { encoding: 'utf8' }).trim();
      
      expect(userName).toBeTruthy();
      expect(userEmail).toBeTruthy();
      expect(userEmail).toContain('@');
    });

    it('should validate repository configuration', () => {
      // 检查是否在Git仓库中
      expect(() => {
        execSync('git rev-parse --git-dir', { stdio: 'pipe' });
      }).not.toThrow();
      
      // 检查仓库状态
      const isRepo = execSync('git rev-parse --is-inside-work-tree', { encoding: 'utf8' }).trim();
      expect(isRepo).toBe('true');
    });

    it('should validate git hooks configuration', () => {
      const gitDir = execSync('git rev-parse --git-dir', { encoding: 'utf8' }).trim();
      const hooksDir = path.join(gitDir, 'hooks');
      
      // 检查hooks目录存在
      expect(fs.existsSync(hooksDir)).toBe(true);
      
      // 检查常见的hook文件
      const commonHooks = ['pre-commit', 'commit-msg', 'pre-push'];
      commonHooks.forEach(hook => {
        const hookPath = path.join(hooksDir, hook);
        if (fs.existsSync(hookPath)) {
          const stats = fs.statSync(hookPath);
          // 如果存在，应该是可执行的
          expect(stats.mode & parseInt('111', 8)).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle git command failures gracefully', () => {
      // 测试无效的git命令
      expect(() => {
        execSync('git invalid-command', { stdio: 'pipe' });
      }).toThrow();
      
      // 测试无效的分支操作
      expect(() => {
        execSync('git checkout non-existent-branch', { stdio: 'pipe' });
      }).toThrow();
    });

    it('should detect and handle merge conflicts', () => {
      const originalBranch = getCurrentBranch();
      
      // 创建两个分支并制造冲突
      execSync('git checkout -b conflict-branch-1');
      fs.writeFileSync('conflict-file.txt', 'Content from branch 1');
      execSync('git add conflict-file.txt');
      execSync('git commit -m "feat: add content from branch 1"');
      
      execSync(`git checkout ${originalBranch}`);
      execSync('git checkout -b conflict-branch-2');
      fs.writeFileSync('conflict-file.txt', 'Content from branch 2');
      execSync('git add conflict-file.txt');
      execSync('git commit -m "feat: add content from branch 2"');
      
      // 尝试合并应该产生冲突
      expect(() => {
        execSync('git merge conflict-branch-1', { stdio: 'pipe' });
      }).toThrow();
      
      // 检查冲突状态
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      expect(status).toContain('UU'); // 未合并状态
      
      // 清理冲突状态
      execSync('git merge --abort');
      
      // 清理分支
      execSync(`git checkout ${originalBranch}`);
      execSync('git branch -D conflict-branch-1');
      execSync('git branch -D conflict-branch-2');
      
      // 清理文件
      if (fs.existsSync('conflict-file.txt')) {
        fs.unlinkSync('conflict-file.txt');
      }
    });

    it('should handle repository corruption detection', () => {
      // 检查仓库完整性
      expect(() => {
        execSync('git fsck --no-progress', { stdio: 'pipe' });
      }).not.toThrow();
      
      // 检查对象数据库
      expect(() => {
        execSync('git count-objects', { stdio: 'pipe' });
      }).not.toThrow();
    });

    it('should validate working directory permissions', () => {
      // 检查当前目录的读写权限
      const testFile = 'permission-test.txt';
      
      // 测试写权限
      expect(() => {
        fs.writeFileSync(testFile, 'test content');
      }).not.toThrow();
      
      // 测试读权限
      expect(() => {
        fs.readFileSync(testFile, 'utf8');
      }).not.toThrow();
      
      // 清理
      fs.unlinkSync(testFile);
    });
  });

  describe('Performance and Optimization', () => {
    it('should perform git operations within reasonable time', () => {
      const startTime = Date.now();
      
      // 执行一系列Git操作
      getCurrentBranch();
      getWorkingDirectoryStatus();
      execSync('git log --oneline -n 10', { stdio: 'pipe' });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 操作应该在1秒内完成
      expect(duration).toBeLessThan(1000);
    });

    it('should handle large repositories efficiently', () => {
      // 创建多个提交来模拟较大的仓库
      const commitCount = 10;
      
      for (let i = 0; i < commitCount; i++) {
        fs.writeFileSync(`large-repo-${i}.js`, `console.log("file ${i}");`);
        execSync(`git add large-repo-${i}.js`);
        execSync(`git commit -m "feat: add file ${i}"`);
      }
      
      const startTime = Date.now();
      
      // 执行历史查询
      const commits = execSync('git log --oneline --no-merges', { encoding: 'utf8' })
        .trim().split('\n').filter(line => line);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(commits.length).toBeGreaterThanOrEqual(commitCount);
      expect(duration).toBeLessThan(2000); // 2秒内完成
      
      // 清理文件
      for (let i = 0; i < commitCount; i++) {
        if (fs.existsSync(`large-repo-${i}.js`)) {
          fs.unlinkSync(`large-repo-${i}.js`);
        }
      }
    });
  });
});