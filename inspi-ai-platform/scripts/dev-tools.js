#!/usr/bin/env node

/**
 * Development Helper Tools
 * Provides quick commands for version status, commits, and build verification
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class DevTools {
  constructor() {
    this.packagePath = path.join(__dirname, '..', 'package.json');
    this.versionConfigPath = path.join(__dirname, '..', 'version.config.json');
  }

  /**
   * Execute command and return output
   */
  exec(command, options = {}) {
    try {
      return execSync(command, { 
        encoding: 'utf8', 
        stdio: options.silent ? 'pipe' : 'inherit',
        ...options 
      }).trim();
    } catch (error) {
      if (!options.silent) {
        console.error(`Error executing: ${command}`);
        console.error(error.message);
      }
      throw error;
    }
  }

  /**
   * Get current version status
   */
  getVersionStatus() {
    console.log('🔍 Version Status Check\n');
    
    try {
      // Get current version
      const packageJson = JSON.parse(fs.readFileSync(this.packagePath, 'utf8'));
      console.log(`📦 Current Version: ${packageJson.version}`);
      
      // Get git status
      const gitStatus = this.exec('git status --porcelain', { silent: true });
      if (gitStatus) {
        console.log('⚠️  Working directory has changes:');
        console.log(gitStatus);
      } else {
        console.log('✅ Working directory is clean');
      }
      
      // Get current branch
      const currentBranch = this.exec('git branch --show-current', { silent: true });
      console.log(`🌿 Current Branch: ${currentBranch}`);
      
      // Get latest tag
      try {
        const latestTag = this.exec('git describe --tags --abbrev=0', { silent: true });
        console.log(`🏷️  Latest Tag: ${latestTag}`);
        
        // Check if current version matches latest tag
        if (`v${packageJson.version}` !== latestTag) {
          console.log('⚠️  Version mismatch between package.json and latest tag');
        }
      } catch (error) {
        console.log('🏷️  No tags found');
      }
      
      // Get commits since last tag
      try {
        const commitsSinceTag = this.exec('git rev-list --count HEAD ^$(git describe --tags --abbrev=0)', { silent: true });
        console.log(`📝 Commits since last tag: ${commitsSinceTag}`);
      } catch (error) {
        const totalCommits = this.exec('git rev-list --count HEAD', { silent: true });
        console.log(`📝 Total commits: ${totalCommits}`);
      }
      
      // Check for unpushed commits
      try {
        const unpushed = this.exec('git log @{u}..HEAD --oneline', { silent: true });
        if (unpushed) {
          const unpushedCount = unpushed.split('\n').length;
          console.log(`⬆️  Unpushed commits: ${unpushedCount}`);
        } else {
          console.log('✅ All commits are pushed');
        }
      } catch (error) {
        console.log('ℹ️  Cannot check unpushed commits (no upstream branch)');
      }
      
    } catch (error) {
      console.error('❌ Error checking version status:', error.message);
      process.exit(1);
    }
  }

  /**
   * Quick commit with conventional format
   */
  quickCommit(type, scope, message) {
    console.log(`🚀 Quick Commit: ${type}${scope ? `(${scope})` : ''}: ${message}\n`);
    
    try {
      // Check if there are changes to commit
      const status = this.exec('git status --porcelain', { silent: true });
      if (!status) {
        console.log('⚠️  No changes to commit');
        return;
      }
      
      // Stage all changes
      this.exec('git add .');
      console.log('✅ Staged all changes');
      
      // Create commit message
      const commitMessage = `${type}${scope ? `(${scope})` : ''}: ${message}`;
      
      // Commit with message
      this.exec(`git commit -m "${commitMessage}"`);
      console.log(`✅ Committed: ${commitMessage}`);
      
    } catch (error) {
      console.error('❌ Error creating commit:', error.message);
      process.exit(1);
    }
  }

  /**
   * Quick tag creation
   */
  quickTag(version, message) {
    console.log(`🏷️  Creating tag: ${version}\n`);
    
    try {
      // Check if working directory is clean
      const status = this.exec('git status --porcelain', { silent: true });
      if (status) {
        console.log('⚠️  Working directory has uncommitted changes. Commit first.');
        return;
      }
      
      // Create annotated tag
      const tagMessage = message || `Release ${version}`;
      this.exec(`git tag -a ${version} -m "${tagMessage}"`);
      console.log(`✅ Created tag: ${version}`);
      console.log(`📝 Message: ${tagMessage}`);
      
      console.log('\n💡 To push the tag, run: git push origin --tags');
      
    } catch (error) {
      console.error('❌ Error creating tag:', error.message);
      process.exit(1);
    }
  }

  /**
   * Local build verification
   */
  buildVerify() {
    console.log('🔨 Build Verification\n');
    
    const steps = [
      { name: 'Type Check', command: 'npm run type-check' },
      { name: 'Lint Check', command: 'npm run lint' },
      { name: 'Unit Tests', command: 'npm run test:unit' },
      { name: 'Build', command: 'npm run build' }
    ];
    
    for (const step of steps) {
      console.log(`⏳ Running ${step.name}...`);
      try {
        this.exec(step.command);
        console.log(`✅ ${step.name} passed\n`);
      } catch (error) {
        console.error(`❌ ${step.name} failed`);
        process.exit(1);
      }
    }
    
    console.log('🎉 All build verification steps passed!');
  }

  /**
   * Development environment check
   */
  devCheck() {
    console.log('🔍 Development Environment Check\n');
    
    try {
      // Check Node.js version
      const nodeVersion = process.version;
      console.log(`📦 Node.js: ${nodeVersion}`);
      
      // Check npm version
      const npmVersion = this.exec('npm --version', { silent: true });
      console.log(`📦 npm: ${npmVersion}`);
      
      // Check if dependencies are installed
      if (fs.existsSync(path.join(__dirname, '..', 'node_modules'))) {
        console.log('✅ Dependencies installed');
      } else {
        console.log('⚠️  Dependencies not installed. Run: npm install');
      }
      
      // Check environment files
      const envFiles = ['.env.local', '.env.example'];
      envFiles.forEach(file => {
        const filePath = path.join(__dirname, '..', file);
        if (fs.existsSync(filePath)) {
          console.log(`✅ ${file} exists`);
        } else {
          console.log(`⚠️  ${file} missing`);
        }
      });
      
      // Check git hooks
      const hooksDir = path.join(__dirname, '..', '.git', 'hooks');
      const requiredHooks = ['commit-msg', 'prepare-commit-msg'];
      requiredHooks.forEach(hook => {
        const hookPath = path.join(hooksDir, hook);
        if (fs.existsSync(hookPath)) {
          console.log(`✅ Git hook ${hook} installed`);
        } else {
          console.log(`⚠️  Git hook ${hook} missing. Run: npm run git:hooks:install`);
        }
      });
      
    } catch (error) {
      console.error('❌ Error checking development environment:', error.message);
    }
  }

  /**
   * Show help
   */
  showHelp() {
    console.log(`
🛠️  Development Tools Help

Usage: node scripts/dev-tools.js <command> [options]

Commands:
  status              Show version and git status
  commit <type> <message>  Quick commit with conventional format
  commit <type> <scope> <message>  Quick commit with scope
  tag <version> [message]  Create annotated tag
  build               Verify build process
  check               Check development environment
  help                Show this help

Examples:
  node scripts/dev-tools.js status
  node scripts/dev-tools.js commit feat "add new feature"
  node scripts/dev-tools.js commit fix ui "fix button styling"
  node scripts/dev-tools.js tag v1.2.3 "Release version 1.2.3"
  node scripts/dev-tools.js build
  node scripts/dev-tools.js check

Commit Types:
  feat     - New feature
  fix      - Bug fix
  docs     - Documentation changes
  style    - Code style changes
  refactor - Code refactoring
  test     - Test changes
  chore    - Build/tool changes
`);
  }
}

// Main execution
function main() {
  const devTools = new DevTools();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    devTools.showHelp();
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case 'status':
      devTools.getVersionStatus();
      break;
      
    case 'commit':
      if (args.length < 3) {
        console.error('❌ Usage: commit <type> <message> or commit <type> <scope> <message>');
        process.exit(1);
      }
      
      if (args.length === 3) {
        // commit type message
        devTools.quickCommit(args[1], null, args[2]);
      } else if (args.length === 4) {
        // commit type scope message
        devTools.quickCommit(args[1], args[2], args[3]);
      } else {
        console.error('❌ Too many arguments for commit command');
        process.exit(1);
      }
      break;
      
    case 'tag':
      if (args.length < 2) {
        console.error('❌ Usage: tag <version> [message]');
        process.exit(1);
      }
      devTools.quickTag(args[1], args[2]);
      break;
      
    case 'build':
      devTools.buildVerify();
      break;
      
    case 'check':
      devTools.devCheck();
      break;
      
    case 'help':
    case '--help':
    case '-h':
      devTools.showHelp();
      break;
      
    default:
      console.error(`❌ Unknown command: ${command}`);
      devTools.showHelp();
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DevTools;