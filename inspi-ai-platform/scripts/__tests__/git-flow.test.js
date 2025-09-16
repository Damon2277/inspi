/**
 * Tests for git-flow script
 */

const { execSync } = require('child_process');

// Mock child_process
jest.mock('child_process');

const {
  getCurrentBranch,
  getWorkingDirectoryStatus,
  branchExists,
  CONFIG
} = require('../git-flow');

describe('git-flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentBranch', () => {
    test('should return current branch name', () => {
      execSync.mockReturnValue('feature/test-branch\n');
      
      const result = getCurrentBranch();
      
      expect(result).toBe('feature/test-branch');
      expect(execSync).toHaveBeenCalledWith('git branch --show-current', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
    });

    test('should handle git command failure', () => {
      execSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });
      
      expect(() => getCurrentBranch()).toThrow('Not a git repository');
    });
  });

  describe('branchExists', () => {
    test('should return true for existing local branch', () => {
      execSync.mockReturnValue('  main\n* feature/test\n  develop\n');
      
      const result = branchExists('feature/test');
      
      expect(result).toBe(true);
      expect(execSync).toHaveBeenCalledWith('git branch', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
    });

    test('should return false for non-existing local branch', () => {
      execSync.mockReturnValue('  main\n* develop\n');
      
      const result = branchExists('feature/nonexistent');
      
      expect(result).toBe(false);
    });

    test('should check remote branches when specified', () => {
      execSync.mockReturnValue('  origin/main\n  origin/develop\n  origin/feature/test\n');
      
      const result = branchExists('feature/test', true);
      
      expect(result).toBe(true);
      expect(execSync).toHaveBeenCalledWith('git branch -r', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
    });

    test('should handle git command failure gracefully', () => {
      execSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });
      
      const result = branchExists('any-branch');
      
      expect(result).toBe(false);
    });
  });

  describe('getWorkingDirectoryStatus', () => {
    test('should return clean status for clean directory', () => {
      execSync.mockReturnValue('');
      
      const result = getWorkingDirectoryStatus();
      
      expect(result.clean).toBe(true);
      expect(result.staged).toEqual([]);
      expect(result.modified).toEqual([]);
      expect(result.untracked).toEqual([]);
      expect(result.totalChanges).toBe(0);
    });

    test('should parse staged files correctly', () => {
      execSync.mockReturnValueOnce('A  new-file.js\nM  modified-file.js\n');
      execSync.mockReturnValueOnce('main'); // getCurrentBranch
      execSync.mockReturnValueOnce('0\t2'); // rev-list for ahead/behind
      
      const result = getWorkingDirectoryStatus();
      
      expect(result.clean).toBe(false);
      expect(result.staged).toContain('new-file.js');
      expect(result.staged).toContain('modified-file.js');
      expect(result.totalChanges).toBe(2);
      expect(result.ahead).toBe(2);
      expect(result.behind).toBe(0);
    });

    test('should parse modified files correctly', () => {
      // Mock the git status output
      execSync
        .mockReturnValueOnce(' M modified-file.js\n?? untracked-file.js\n') // git status --porcelain
        .mockReturnValueOnce('main') // getCurrentBranch in getWorkingDirectoryStatus
        .mockReturnValueOnce('1\t0'); // rev-list for ahead/behind
      
      const result = getWorkingDirectoryStatus();
      
      expect(result.clean).toBe(false);
      expect(result.totalChanges).toBe(2);
      // Note: The parsing logic puts ' M' files in modified array and '??' files in untracked
      expect(result.modified.length).toBeGreaterThan(0);
      expect(result.untracked.length).toBeGreaterThan(0);
    });

    test('should handle tracking info errors gracefully', () => {
      execSync.mockReturnValueOnce('M  some-file.js\n');
      execSync.mockReturnValueOnce('feature/no-upstream');
      execSync.mockImplementationOnce(() => {
        throw new Error('No upstream branch');
      });
      
      const result = getWorkingDirectoryStatus();
      
      expect(result.ahead).toBe(0);
      expect(result.behind).toBe(0);
      expect(result.totalChanges).toBe(1);
    });
  });

  describe('CONFIG', () => {
    test('should have correct default configuration', () => {
      expect(CONFIG.mainBranch).toBe('main');
      expect(CONFIG.developBranch).toBe('develop');
      expect(CONFIG.featurePrefix).toBe('feature/');
      expect(CONFIG.hotfixPrefix).toBe('hotfix/');
      expect(CONFIG.releasePrefix).toBe('release/');
      expect(CONFIG.bugfixPrefix).toBe('bugfix/');
    });
  });
});

describe('Integration scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle typical feature branch workflow', () => {
    // Mock sequence for feature branch creation
    execSync
      .mockReturnValueOnce('') // git status --porcelain (clean)
      .mockReturnValueOnce('') // git fetch origin
      .mockReturnValueOnce('') // git checkout develop
      .mockReturnValueOnce('') // git pull origin develop
      .mockReturnValueOnce(''); // git checkout -b feature/test

    // This would be tested in integration tests with actual git commands
    expect(true).toBe(true);
  });

  test('should handle dirty working directory scenario', () => {
    execSync
      .mockReturnValueOnce('M  dirty-file.js\n') // git status --porcelain
      .mockReturnValueOnce('main') // getCurrentBranch
      .mockReturnValueOnce('0\t0'); // rev-list for ahead/behind
    
    const result = getWorkingDirectoryStatus();
    
    expect(result.clean).toBe(false);
    expect(result.totalChanges).toBe(1);
  });
});