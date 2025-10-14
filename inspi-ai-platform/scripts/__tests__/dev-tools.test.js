const DevTools = require('../dev-tools');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Mock child_process
jest.mock('child_process');
jest.mock('fs');

describe('DevTools', () => {
  let devTools;
  let mockExecSync;
  let mockReadFileSync;
  let mockExistsSync;

  beforeEach(() => {
    devTools = new DevTools();
    mockExecSync = execSync;
    mockReadFileSync = fs.readFileSync;
    mockExistsSync = fs.existsSync;
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock process.exit
    jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getVersionStatus', () => {
    it('should display version status correctly', () => {
      // Mock package.json
      mockReadFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
      
      // Mock git commands
      mockExecSync
        .mockReturnValueOnce('') // git status --porcelain
        .mockReturnValueOnce('main') // git branch --show-current
        .mockReturnValueOnce('v1.0.0') // git describe --tags --abbrev=0
        .mockReturnValueOnce('0') // git rev-list --count
        .mockReturnValueOnce(''); // git log @{u}..HEAD --oneline

      expect(() => devTools.getVersionStatus()).not.toThrow();

      expect(console.log).toHaveBeenCalledWith('🔍 Version Status Check\n');
      expect(console.log).toHaveBeenCalledWith('📦 Current Version: 1.0.0');
      expect(console.log).toHaveBeenCalledWith('✅ Working directory is clean');
      expect(console.log).toHaveBeenCalledWith('🌿 Current Branch: main');
    });

    it('should handle dirty working directory', () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
      mockExecSync
        .mockReturnValueOnce('M  package.json\n?? new-file.js') // git status --porcelain
        .mockReturnValueOnce('main'); // git branch --show-current

      devTools.getVersionStatus();

      expect(console.log).toHaveBeenCalledWith('⚠️  Working directory has changes:');
      expect(console.log).toHaveBeenCalledWith('M  package.json\n?? new-file.js');
    });

    it('should handle version mismatch', () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({ version: '1.0.1' }));
      mockExecSync
        .mockReturnValueOnce('') // git status --porcelain
        .mockReturnValueOnce('main') // git branch --show-current
        .mockReturnValueOnce('v1.0.0'); // git describe --tags --abbrev=0

      devTools.getVersionStatus();

      expect(console.log).toHaveBeenCalledWith('⚠️  Version mismatch between package.json and latest tag');
    });
  });

  describe('quickCommit', () => {
    it('should create commit with type and message', () => {
      mockExecSync
        .mockReturnValueOnce('M  package.json') // git status --porcelain
        .mockReturnValueOnce('') // git add .
        .mockReturnValueOnce(''); // git commit

      devTools.quickCommit('feat', null, 'add new feature');

      expect(mockExecSync).toHaveBeenCalledWith('git add .');
      expect(mockExecSync).toHaveBeenCalledWith('git commit -m "feat: add new feature"');
      expect(console.log).toHaveBeenCalledWith('✅ Committed: feat: add new feature');
    });

    it('should create commit with type, scope and message', () => {
      mockExecSync
        .mockReturnValueOnce('M  package.json') // git status --porcelain
        .mockReturnValueOnce('') // git add .
        .mockReturnValueOnce(''); // git commit

      devTools.quickCommit('fix', 'ui', 'fix button styling');

      expect(mockExecSync).toHaveBeenCalledWith('git commit -m "fix(ui): fix button styling"');
      expect(console.log).toHaveBeenCalledWith('✅ Committed: fix(ui): fix button styling');
    });

    it('should handle no changes to commit', () => {
      mockExecSync.mockReturnValueOnce(''); // git status --porcelain (empty)

      devTools.quickCommit('feat', null, 'add new feature');

      expect(console.log).toHaveBeenCalledWith('⚠️  No changes to commit');
      expect(mockExecSync).not.toHaveBeenCalledWith('git add .');
    });
  });

  describe('quickTag', () => {
    it('should create annotated tag', () => {
      mockExecSync
        .mockReturnValueOnce('') // git status --porcelain (clean)
        .mockReturnValueOnce(''); // git tag

      devTools.quickTag('v1.0.0', 'Release version 1.0.0');

      expect(mockExecSync).toHaveBeenCalledWith('git tag -a v1.0.0 -m "Release version 1.0.0"');
      expect(console.log).toHaveBeenCalledWith('✅ Created tag: v1.0.0');
    });

    it('should use default message if none provided', () => {
      mockExecSync
        .mockReturnValueOnce('') // git status --porcelain (clean)
        .mockReturnValueOnce(''); // git tag

      devTools.quickTag('v1.0.0');

      expect(mockExecSync).toHaveBeenCalledWith('git tag -a v1.0.0 -m "Release v1.0.0"');
    });

    it('should handle dirty working directory', () => {
      mockExecSync.mockReturnValueOnce('M  package.json'); // git status --porcelain (dirty)

      devTools.quickTag('v1.0.0');

      expect(console.log).toHaveBeenCalledWith('⚠️  Working directory has uncommitted changes. Commit first.');
      expect(mockExecSync).not.toHaveBeenCalledWith(expect.stringContaining('git tag'));
    });
  });

  describe('buildVerify', () => {
    it('should run all build verification steps', () => {
      // Mock all build steps to succeed
      mockExecSync
        .mockReturnValueOnce('') // type-check
        .mockReturnValueOnce('') // lint
        .mockReturnValueOnce('') // test:unit
        .mockReturnValueOnce(''); // build

      devTools.buildVerify();

      expect(mockExecSync).toHaveBeenCalledWith('npm run type-check');
      expect(mockExecSync).toHaveBeenCalledWith('npm run lint');
      expect(mockExecSync).toHaveBeenCalledWith('npm run test:unit');
      expect(mockExecSync).toHaveBeenCalledWith('npm run build');
      expect(console.log).toHaveBeenCalledWith('🎉 All build verification steps passed!');
    });

    it('should exit on build step failure', () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      mockExecSync
        .mockReturnValueOnce('') // type-check succeeds
        .mockImplementationOnce(() => { // lint fails
          throw new Error('Lint failed');
        });

      devTools.buildVerify();

      expect(console.error).toHaveBeenCalledWith('❌ Lint Check failed');
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });
  });

  describe('devCheck', () => {
    it('should check development environment', () => {
      mockExistsSync
        .mockReturnValueOnce(true) // node_modules exists
        .mockReturnValueOnce(true) // .env.local exists
        .mockReturnValueOnce(false) // .env.example missing
        .mockReturnValueOnce(true) // commit-msg hook exists
        .mockReturnValueOnce(false); // prepare-commit-msg hook missing

      mockExecSync.mockReturnValueOnce('8.0.0'); // npm version

      devTools.devCheck();

      expect(console.log).toHaveBeenCalledWith('✅ Dependencies installed');
      expect(console.log).toHaveBeenCalledWith('✅ .env.local exists');
      expect(console.log).toHaveBeenCalledWith('⚠️  .env.example missing');
      expect(console.log).toHaveBeenCalledWith('✅ Git hook commit-msg installed');
      expect(console.log).toHaveBeenCalledWith('⚠️  Git hook prepare-commit-
        msg missing. Run: npm run git:hooks:install');
    });
  });

  describe('showHelp', () => {
    it('should display help information', () => {
      devTools.showHelp();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('🛠️  Development Tools Help'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Commands:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Examples:'));
    });
  });
});