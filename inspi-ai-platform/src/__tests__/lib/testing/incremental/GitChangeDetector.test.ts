import { execSync } from 'child_process';

import { GitChangeDetector, GitChange, ChangeAnalysis } from '../../../../lib/testing/incremental/GitChangeDetector';

// Mock child_process
jest.mock('child_process');
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('GitChangeDetector', () => {
  let detector: GitChangeDetector;
  const mockWorkingDir = '/mock/project';

  beforeEach(() => {
    // Mock successful git repository check
    mockExecSync.mockImplementation((command: string) => {
      if (command.includes('rev-parse --git-dir')) {
        return '.git';
      }
      return '';
    });

    detector = new GitChangeDetector(mockWorkingDir);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully in a git repository', () => {
      expect(detector).toBeInstanceOf(GitChangeDetector);
    });

    it('should throw error if not a git repository', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      expect(() => new GitChangeDetector(mockWorkingDir)).toThrow('Not a git repository');
    });
  });

  describe('branch operations', () => {
    it('should get current branch name', () => {
      mockExecSync.mockReturnValue('feature/test-branch\n');

      const branch = detector.getCurrentBranch();
      expect(branch).toBe('feature/test-branch');
      expect(mockExecSync).toHaveBeenCalledWith(
        'git branch --show-current',
        expect.objectContaining({ cwd: mockWorkingDir }),
      );
    });

    it('should get current commit hash', () => {
      mockExecSync.mockReturnValue('abc123def456\n');

      const commit = detector.getCurrentCommit();
      expect(commit).toBe('abc123def456');
      expect(mockExecSync).toHaveBeenCalledWith(
        'git rev-parse HEAD',
        expect.objectContaining({ cwd: mockWorkingDir }),
      );
    });

    it('should get base commit', () => {
      mockExecSync.mockReturnValue('def456abc123\n');

      const baseCommit = detector.getBaseCommit('main');
      expect(baseCommit).toBe('def456abc123');
    });

    it('should fallback to local branch if remote not available', () => {
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('Remote branch not found');
        })
        .mockReturnValueOnce('local123\n');

      const baseCommit = detector.getBaseCommit('main');
      expect(baseCommit).toBe('local123');
    });
  });

  describe('change detection', () => {
    it('should detect changes between commits', () => {
      const mockDiffOutput = `M\tsrc/file1.ts
A\tsrc/file2.ts
D\tsrc/file3.ts
R100\tsrc/old.ts\tsrc/new.ts`;

      mockExecSync.mockReturnValue(mockDiffOutput);

      const changes = detector.getChangesBetweenCommits('abc123', 'def456');

      expect(changes).toHaveLength(4);
      expect(changes[0]).toEqual({
        type: 'modified',
        filePath: 'src/file1.ts',
        oldFilePath: undefined,
        status: 'M',
      });
      expect(changes[1]).toEqual({
        type: 'added',
        filePath: 'src/file2.ts',
        oldFilePath: undefined,
        status: 'A',
      });
      expect(changes[2]).toEqual({
        type: 'deleted',
        filePath: 'src/file3.ts',
        oldFilePath: undefined,
        status: 'D',
      });
      expect(changes[3]).toEqual({
        type: 'renamed',
        filePath: 'src/new.ts',
        oldFilePath: 'src/old.ts',
        status: 'R100',
      });
    });

    it('should handle empty diff output', () => {
      mockExecSync.mockReturnValue('');

      const changes = detector.getChangesBetweenCommits('abc123', 'def456');
      expect(changes).toHaveLength(0);
    });

    it('should detect working directory changes', () => {
      const mockStatusOutput = ` M src/modified.ts
A  src/added.ts
 D src/deleted.ts
?? src/untracked.ts`;

      mockExecSync.mockReturnValue(mockStatusOutput);

      const changes = detector.getWorkingDirectoryChanges();

      expect(changes).toHaveLength(4);
      expect(changes[0].type).toBe('modified');
      expect(changes[1].type).toBe('added');
      expect(changes[2].type).toBe('deleted');
    });

    it('should detect staged changes', () => {
      const mockStagedOutput = `M\tsrc/staged.ts
A\tsrc/new-staged.ts`;

      mockExecSync.mockReturnValue(mockStagedOutput);

      const changes = detector.getStagedChanges();

      expect(changes).toHaveLength(2);
      expect(changes[0].type).toBe('modified');
      expect(changes[1].type).toBe('added');
    });
  });

  describe('change analysis', () => {
    it('should analyze changes comprehensively', () => {
      // Mock different git commands
      mockExecSync
        .mockReturnValueOnce('main123\n') // getBaseCommit
        .mockReturnValueOnce('current456\n') // getCurrentCommit
        .mockReturnValueOnce('M\tsrc/component.tsx\nA\tsrc/utils.ts\n') // getChangesBetweenCommits
        .mockReturnValueOnce(' M src/test.spec.ts\n') // getWorkingDirectoryChanges
        .mockReturnValueOnce('A\tsrc/new.ts\n'); // getStagedChanges

      const analysis = detector.analyzeChanges('main', true);

      expect(analysis.baseCommit).toBe('main123');
      expect(analysis.currentCommit).toBe('current456');
      expect(analysis.changes).toHaveLength(4); // Deduplicated
      expect(analysis.affectedFiles).toContain('src/component.tsx');
      expect(analysis.affectedFiles).toContain('src/utils.ts');
      expect(analysis.testFiles).toContain('src/test.spec.ts');
      expect(analysis.sourceFiles).toContain('src/component.tsx');
      expect(analysis.sourceFiles).toContain('src/utils.ts');
    });

    it('should exclude working directory changes when requested', () => {
      mockExecSync
        .mockReturnValueOnce('main123\n')
        .mockReturnValueOnce('current456\n')
        .mockReturnValueOnce('M\tsrc/file.ts\n');

      const analysis = detector.analyzeChanges('main', false);

      expect(analysis.changes).toHaveLength(1);
      expect(mockExecSync).not.toHaveBeenCalledWith(
        expect.stringContaining('status --porcelain'),
        expect.any(Object),
      );
    });

    it('should deduplicate changes correctly', () => {
      mockExecSync
        .mockReturnValueOnce('main123\n')
        .mockReturnValueOnce('current456\n')
        .mockReturnValueOnce('M\tsrc/file.ts\n')
        .mockReturnValueOnce(' M src/file.ts\n') // Same file in working directory
        .mockReturnValueOnce('');

      const analysis = detector.analyzeChanges('main', true);

      expect(analysis.changes).toHaveLength(1);
      expect(analysis.changes[0].filePath).toBe('src/file.ts');
    });
  });

  describe('file operations', () => {
    it('should get last modified commit for file', () => {
      mockExecSync.mockReturnValue('commit789\n');

      const commit = detector.getLastModifiedCommit('src/file.ts');
      expect(commit).toBe('commit789');
      expect(mockExecSync).toHaveBeenCalledWith(
        'git log -1 --format="%H" -- "src/file.ts"',
        expect.objectContaining({ cwd: mockWorkingDir }),
      );
    });

    it('should check if file is modified since commit', () => {
      mockExecSync.mockReturnValue('src/file.ts\n');

      const isModified = detector.isFileModifiedSince('src/file.ts', 'abc123');
      expect(isModified).toBe(true);
    });

    it('should return false if file not modified since commit', () => {
      mockExecSync.mockReturnValue('');

      const isModified = detector.isFileModifiedSince('src/file.ts', 'abc123');
      expect(isModified).toBe(false);
    });

    it('should handle errors gracefully in file modification check', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git error');
      });

      const isModified = detector.isFileModifiedSince('src/file.ts', 'abc123');
      expect(isModified).toBe(true); // Assumes modified on error
    });

    it('should get file history', () => {
      const mockHistoryOutput = `commit1|Author1|2023-01-01|First commit
commit2|Author2|2023-01-02|Second commit`;

      mockExecSync.mockReturnValue(mockHistoryOutput);

      const history = detector.getFileHistory('src/file.ts', 5);

      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({
        hash: 'commit1',
        author: 'Author1',
        date: new Date('2023-01-01'),
        message: 'First commit',
      });
    });
  });

  describe('repository status', () => {
    it('should check if repository is clean', () => {
      mockExecSync.mockReturnValue('');

      const isClean = detector.isRepositoryClean();
      expect(isClean).toBe(true);
    });

    it('should detect dirty repository', () => {
      mockExecSync.mockReturnValue(' M src/file.ts\n');

      const isClean = detector.isRepositoryClean();
      expect(isClean).toBe(false);
    });

    it('should get ignored files', () => {
      mockExecSync.mockReturnValue('node_modules/\n.env\nbuild/\n');

      const ignoredFiles = detector.getIgnoredFiles();
      expect(ignoredFiles).toEqual(['node_modules/', '.env', 'build/']);
    });

    it('should handle empty ignored files list', () => {
      mockExecSync.mockReturnValue('');

      const ignoredFiles = detector.getIgnoredFiles();
      expect(ignoredFiles).toEqual([]);
    });
  });

  describe('commit info', () => {
    it('should get commit information', () => {
      const mockCommitOutput = 'abc123|John Doe|Mon Jan 1 12:00:00 2023|Test commit';
      mockExecSync.mockReturnValue(mockCommitOutput);

      const commitInfo = detector.getCommitInfo('abc123');

      expect(commitInfo).toEqual({
        hash: 'abc123',
        author: 'John Doe',
        date: new Date('Mon Jan 1 12:00:00 2023'),
        message: 'Test commit',
      });
    });
  });

  describe('error handling', () => {
    it('should handle git command failures gracefully', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });

      expect(() => detector.getCurrentBranch()).toThrow('Failed to get current branch');
    });

    it('should handle missing commits gracefully', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Commit not found');
      });

      expect(() => detector.getBaseCommit('nonexistent')).toThrow('Failed to get base commit');
    });
  });
});
