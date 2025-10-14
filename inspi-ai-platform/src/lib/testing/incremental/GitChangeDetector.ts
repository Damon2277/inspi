import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface GitChange {
  type: 'added' | 'modified' | 'deleted' | 'renamed';
  filePath: string;
  oldFilePath?: string; // For renamed files
  status: string;
}

export interface GitCommitInfo {
  hash: string;
  author: string;
  date: Date;
  message: string;
}

export interface ChangeAnalysis {
  changes: GitChange[];
  baseCommit: string;
  currentCommit: string;
  affectedFiles: string[];
  testFiles: string[];
  sourceFiles: string[];
}

/**
 * Git变更检测器
 * 检测代码变更并分析影响范围
 */
export class GitChangeDetector {
  private workingDirectory: string;
  private gitCommand: string;

  constructor(workingDirectory: string = process.cwd()) {
    this.workingDirectory = workingDirectory;
    this.gitCommand = 'git';

    if (!this.isGitRepository()) {
      throw new Error('Not a git repository');
    }
  }

  /**
   * 检查是否为Git仓库
   */
  private isGitRepository(): boolean {
    try {
      execSync(`${this.gitCommand} rev-parse --git-dir`, {
        cwd: this.workingDirectory,
        stdio: 'ignore',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取当前分支名称
   */
  getCurrentBranch(): string {
    try {
      const result = execSync(`${this.gitCommand} branch --show-current`, {
        cwd: this.workingDirectory,
        encoding: 'utf8',
      });
      return result.trim();
    } catch (error) {
      throw new Error(`Failed to get current branch: ${error.message}`);
    }
  }

  /**
   * 获取当前提交哈希
   */
  getCurrentCommit(): string {
    try {
      const result = execSync(`${this.gitCommand} rev-parse HEAD`, {
        cwd: this.workingDirectory,
        encoding: 'utf8',
      });
      return result.trim();
    } catch (error) {
      throw new Error(`Failed to get current commit: ${error.message}`);
    }
  }

  /**
   * 获取基准提交（通常是主分支的最新提交）
   */
  getBaseCommit(baseBranch: string = 'main'): string {
    try {
      // 首先尝试获取远程分支
      let result: string;
      try {
        result = execSync(`${this.gitCommand} rev-parse origin/${baseBranch}`, {
          cwd: this.workingDirectory,
          encoding: 'utf8',
        });
      } catch {
        // 如果远程分支不存在，使用本地分支
        result = execSync(`${this.gitCommand} rev-parse ${baseBranch}`, {
          cwd: this.workingDirectory,
          encoding: 'utf8',
        });
      }
      return result.trim();
    } catch (error) {
      throw new Error(`Failed to get base commit for ${baseBranch}: ${error.message}`);
    }
  }

  /**
   * 获取两个提交之间的变更
   */
  getChangesBetweenCommits(baseCommit: string, targetCommit: string = 'HEAD'): GitChange[] {
    try {
      const result = execSync(
        `${this.gitCommand} diff --name-status ${baseCommit}..${targetCommit}`,
        {
          cwd: this.workingDirectory,
          encoding: 'utf8',
        },
      );

      return this.parseGitDiffOutput(result);
    } catch (error) {
      throw new Error(`Failed to get changes between commits: ${error.message}`);
    }
  }

  /**
   * 获取工作区的未提交变更
   */
  getWorkingDirectoryChanges(): GitChange[] {
    try {
      const result = execSync(`${this.gitCommand} status --porcelain`, {
        cwd: this.workingDirectory,
        encoding: 'utf8',
      });

      return this.parseGitStatusOutput(result);
    } catch (error) {
      throw new Error(`Failed to get working directory changes: ${error.message}`);
    }
  }

  /**
   * 获取暂存区的变更
   */
  getStagedChanges(): GitChange[] {
    try {
      const result = execSync(`${this.gitCommand} diff --cached --name-status`, {
        cwd: this.workingDirectory,
        encoding: 'utf8',
      });

      return this.parseGitDiffOutput(result);
    } catch (error) {
      throw new Error(`Failed to get staged changes: ${error.message}`);
    }
  }

  /**
   * 解析git diff输出
   */
  private parseGitDiffOutput(output: string): GitChange[] {
    if (!output.trim()) return [];

    return output.trim().split('\n').map(line => {
      const parts = line.split('\t');
      const status = parts[0];
      const filePath = parts[1];
      const oldFilePath = parts[2]; // For renamed files

      let type: GitChange['type'];
      switch (status[0]) {
        case 'A':
          type = 'added';
          break;
        case 'M':
          type = 'modified';
          break;
        case 'D':
          type = 'deleted';
          break;
        case 'R':
          type = 'renamed';
          break;
        default:
          type = 'modified';
      }

      return {
        type,
        filePath,
        oldFilePath,
        status,
      };
    });
  }

  /**
   * 解析git status输出
   */
  private parseGitStatusOutput(output: string): GitChange[] {
    if (!output.trim()) return [];

    return output.trim().split('\n').map(line => {
      const status = line.substring(0, 2);
      const filePath = line.substring(3);

      let type: GitChange['type'];
      const indexStatus = status[0];
      const workTreeStatus = status[1];

      // 优先考虑工作树状态，然后是索引状态
      const effectiveStatus = workTreeStatus !== ' ' ? workTreeStatus : indexStatus;

      switch (effectiveStatus) {
        case 'A':
          type = 'added';
          break;
        case 'M':
          type = 'modified';
          break;
        case 'D':
          type = 'deleted';
          break;
        case 'R':
          type = 'renamed';
          break;
        default:
          type = 'modified';
      }

      return {
        type,
        filePath,
        status,
      };
    });
  }

  /**
   * 获取提交信息
   */
  getCommitInfo(commitHash: string): GitCommitInfo {
    try {
      const result = execSync(
        `${this.gitCommand} show --format="%H|%an|%ad|%s" --no-patch ${commitHash}`,
        {
          cwd: this.workingDirectory,
          encoding: 'utf8',
        },
      );

      const [hash, author, dateStr, message] = result.trim().split('|');

      return {
        hash,
        author,
        date: new Date(dateStr),
        message,
      };
    } catch (error) {
      throw new Error(`Failed to get commit info: ${error.message}`);
    }
  }

  /**
   * 分析变更影响
   */
  analyzeChanges(baseBranch: string = 'main', includeWorkingDirectory: boolean = true): ChangeAnalysis {
    const baseCommit = this.getBaseCommit(baseBranch);
    const currentCommit = this.getCurrentCommit();

    let changes = this.getChangesBetweenCommits(baseCommit, currentCommit);

    // 包含工作区变更
    if (includeWorkingDirectory) {
      const workingChanges = this.getWorkingDirectoryChanges();
      const stagedChanges = this.getStagedChanges();
      changes = [...changes, ...workingChanges, ...stagedChanges];
    }

    // 去重
    const uniqueChanges = this.deduplicateChanges(changes);

    // 分类文件
    const affectedFiles = uniqueChanges.map(change => change.filePath);
    const testFiles = affectedFiles.filter(file => this.isTestFile(file));
    const sourceFiles = affectedFiles.filter(file => !this.isTestFile(file));

    return {
      changes: uniqueChanges,
      baseCommit,
      currentCommit,
      affectedFiles,
      testFiles,
      sourceFiles,
    };
  }

  /**
   * 去重变更
   */
  private deduplicateChanges(changes: GitChange[]): GitChange[] {
    const seen = new Set<string>();
    return changes.filter(change => {
      const key = `${change.type}:${change.filePath}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 判断是否为测试文件
   */
  private isTestFile(filePath: string): boolean {
    const testPatterns = [
      /\.test\.(ts|tsx|js|jsx)$/,
      /\.spec\.(ts|tsx|js|jsx)$/,
      /\/__tests__\//,
      /\/test\//,
      /\/tests\//,
    ];

    return testPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * 获取文件的最后修改提交
   */
  getLastModifiedCommit(filePath: string): string {
    try {
      const result = execSync(
        `${this.gitCommand} log -1 --format="%H" -- "${filePath}"`,
        {
          cwd: this.workingDirectory,
          encoding: 'utf8',
        },
      );
      return result.trim();
    } catch (error) {
      throw new Error(`Failed to get last modified commit for ${filePath}: ${error.message}`);
    }
  }

  /**
   * 检查文件是否在指定提交后被修改
   */
  isFileModifiedSince(filePath: string, sinceCommit: string): boolean {
    try {
      const result = execSync(
        `${this.gitCommand} diff --name-only ${sinceCommit}..HEAD -- "${filePath}"`,
        {
          cwd: this.workingDirectory,
          encoding: 'utf8',
        },
      );
      return result.trim().length > 0;
    } catch (error) {
      return true; // 如果出错，假设文件已修改
    }
  }

  /**
   * 获取文件历史
   */
  getFileHistory(filePath: string, maxCount: number = 10): GitCommitInfo[] {
    try {
      const result = execSync(
        `${this.gitCommand} log --format="%H|%an|%ad|%s" -${maxCount} -- "${filePath}"`,
        {
          cwd: this.workingDirectory,
          encoding: 'utf8',
        },
      );

      if (!result.trim()) return [];

      return result.trim().split('\n').map(line => {
        const [hash, author, dateStr, message] = line.split('|');
        return {
          hash,
          author,
          date: new Date(dateStr),
          message,
        };
      });
    } catch (error) {
      throw new Error(`Failed to get file history for ${filePath}: ${error.message}`);
    }
  }

  /**
   * 检查仓库是否干净（没有未提交的变更）
   */
  isRepositoryClean(): boolean {
    try {
      const result = execSync(`${this.gitCommand} status --porcelain`, {
        cwd: this.workingDirectory,
        encoding: 'utf8',
      });
      return result.trim().length === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取忽略的文件列表
   */
  getIgnoredFiles(): string[] {
    try {
      const result = execSync(`${this.gitCommand} ls-files --others --ignored --exclude-standard`, {
        cwd: this.workingDirectory,
        encoding: 'utf8',
      });

      if (!result.trim()) return [];

      return result.trim().split('\n');
    } catch (error) {
      return [];
    }
  }
}
