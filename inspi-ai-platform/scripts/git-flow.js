#!/usr/bin/env node

/**
 * Git Flow Management Script
 * Provides simplified Git flow operations for branch management
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Configuration
 */
const CONFIG = {
  mainBranch: 'main',
  developBranch: 'develop',
  featurePrefix: 'feature/',
  hotfixPrefix: 'hotfix/',
  releasePrefix: 'release/',
  bugfixPrefix: 'bugfix/'
};

/**
 * Execute git command and return output
 * @param {string} command - Git command to execute
 * @param {boolean} silent - Whether to suppress output
 * @returns {string} Command output
 */
function execGit(command, silent = false) {
  try {
    const output = execSync(`git ${command}`, { 
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return output.trim();
  } catch (error) {
    if (!silent) {
      console.error(`❌ Git command failed: git ${command}`);
      console.error(error.message);
    }
    throw error;
  }
}

/**
 * Check if we're in a Git repository
 */
function checkGitRepository() {
  try {
    execGit('rev-parse --git-dir', true);
  } catch (error) {
    console.error('❌ Not a Git repository. Please run this command from within a Git repository.');
    process.exit(1);
  }
}

/**
 * Get current branch name
 * @returns {string} Current branch name
 */
function getCurrentBranch() {
  try {
    return execGit('branch --show-current', true);
  } catch (error) {
    console.error('❌ Failed to get current branch');
    throw error;
  }
}

/**
 * Check if branch exists
 * @param {string} branchName - Branch name to check
 * @param {boolean} remote - Check remote branches
 * @returns {boolean} True if branch exists
 */
function branchExists(branchName, remote = false) {
  try {
    const command = remote ? 'branch -r' : 'branch';
    const branches = execGit(command, true);
    const branchPattern = remote ? `origin/${branchName}` : branchName;
    return branches.includes(branchPattern);
  } catch (error) {
    return false;
  }
}

/**
 * Get working directory status
 * @returns {object} Git status information
 */
function getWorkingDirectoryStatus() {
  try {
    const status = execGit('status --porcelain', true);
    const statusLines = status.split('\n').filter(line => line.trim());
    
    const staged = [];
    const modified = [];
    const untracked = [];
    
    statusLines.forEach(line => {
      const statusCode = line.substring(0, 2);
      const fileName = line.substring(3);
      
      if (statusCode[0] !== ' ' && statusCode[0] !== '?') {
        staged.push(fileName);
      }
      if (statusCode[1] !== ' ' && statusCode[1] !== '?') {
        modified.push(fileName);
      }
      if (statusCode === '??') {
        untracked.push(fileName);
      }
    });
    
    // Get ahead/behind information
    let ahead = 0;
    let behind = 0;
    
    try {
      const currentBranch = getCurrentBranch();
      const trackingInfo = execGit(`rev-list --left-right --count origin/${currentBranch}...HEAD`, true);
      const [behindCount, aheadCount] = trackingInfo.split('\t').map(Number);
      ahead = aheadCount || 0;
      behind = behindCount || 0;
    } catch (error) {
      // Branch might not have upstream, ignore
    }
    
    return {
      clean: statusLines.length === 0,
      staged,
      modified,
      untracked,
      ahead,
      behind,
      totalChanges: statusLines.length
    };
  } catch (error) {
    console.error('❌ Failed to get working directory status');
    throw error;
  }
}

/**
 * Display working directory status
 * @param {object} status - Status object from getWorkingDirectoryStatus
 */
function displayStatus(status) {
  console.log('\n📊 Working Directory Status:');
  
  if (status.clean) {
    console.log('✅ Working directory is clean');
  } else {
    console.log(`⚠️  Working directory has ${status.totalChanges} changes`);
    
    if (status.staged.length > 0) {
      console.log(`\n📝 Staged files (${status.staged.length}):`);
      status.staged.forEach(file => console.log(`   + ${file}`));
    }
    
    if (status.modified.length > 0) {
      console.log(`\n✏️  Modified files (${status.modified.length}):`);
      status.modified.forEach(file => console.log(`   ~ ${file}`));
    }
    
    if (status.untracked.length > 0) {
      console.log(`\n❓ Untracked files (${status.untracked.length}):`);
      status.untracked.forEach(file => console.log(`   ? ${file}`));
    }
  }
  
  if (status.ahead > 0) {
    console.log(`\n⬆️  ${status.ahead} commits ahead of origin`);
  }
  
  if (status.behind > 0) {
    console.log(`\n⬇️  ${status.behind} commits behind origin`);
  }
  
  console.log('');
}

/**
 * Ensure working directory is clean
 * @param {boolean} allowStaged - Allow staged changes
 */
function ensureCleanWorkingDirectory(allowStaged = false) {
  const status = getWorkingDirectoryStatus();
  
  if (!allowStaged && (status.modified.length > 0 || status.untracked.length > 0)) {
    console.error('❌ Working directory is not clean. Please commit or stash your changes first.');
    displayStatus(status);
    process.exit(1);
  }
  
  if (!allowStaged && status.staged.length > 0) {
    console.error('❌ You have staged changes. Please commit them first.');
    displayStatus(status);
    process.exit(1);
  }
}

/**
 * Create a new feature branch
 * @param {string} featureName - Name of the feature
 * @param {string} baseBranch - Base branch to create from
 */
function createFeatureBranch(featureName, baseBranch = CONFIG.developBranch) {
  console.log(`🌟 Creating feature branch: ${CONFIG.featurePrefix}${featureName}`);
  
  const branchName = `${CONFIG.featurePrefix}${featureName}`;
  
  // Check if branch already exists
  if (branchExists(branchName)) {
    console.error(`❌ Branch ${branchName} already exists`);
    process.exit(1);
  }
  
  // Ensure clean working directory
  ensureCleanWorkingDirectory();
  
  try {
    // Fetch latest changes
    console.log('📡 Fetching latest changes...');
    execGit('fetch origin');
    
    // Switch to base branch and pull latest
    console.log(`🔄 Switching to ${baseBranch}...`);
    execGit(`checkout ${baseBranch}`);
    execGit(`pull origin ${baseBranch}`);
    
    // Create and switch to new branch
    console.log(`🆕 Creating branch ${branchName}...`);
    execGit(`checkout -b ${branchName}`);
    
    console.log(`✅ Feature branch ${branchName} created successfully!`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Make your changes`);
    console.log(`   2. Commit with: git commit -m "feat(scope): description"`);
    console.log(`   3. Push with: git push -u origin ${branchName}`);
    console.log(`   4. Create a pull request when ready`);
    
  } catch (error) {
    console.error(`❌ Failed to create feature branch: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Create a new hotfix branch
 * @param {string} hotfixName - Name of the hotfix
 * @param {string} baseBranch - Base branch to create from
 */
function createHotfixBranch(hotfixName, baseBranch = CONFIG.mainBranch) {
  console.log(`🚨 Creating hotfix branch: ${CONFIG.hotfixPrefix}${hotfixName}`);
  
  const branchName = `${CONFIG.hotfixPrefix}${hotfixName}`;
  
  // Check if branch already exists
  if (branchExists(branchName)) {
    console.error(`❌ Branch ${branchName} already exists`);
    process.exit(1);
  }
  
  // Ensure clean working directory
  ensureCleanWorkingDirectory();
  
  try {
    // Fetch latest changes
    console.log('📡 Fetching latest changes...');
    execGit('fetch origin');
    
    // Switch to base branch and pull latest
    console.log(`🔄 Switching to ${baseBranch}...`);
    execGit(`checkout ${baseBranch}`);
    execGit(`pull origin ${baseBranch}`);
    
    // Create and switch to new branch
    console.log(`🆕 Creating branch ${branchName}...`);
    execGit(`checkout -b ${branchName}`);
    
    console.log(`✅ Hotfix branch ${branchName} created successfully!`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Fix the issue`);
    console.log(`   2. Commit with: git commit -m "fix(scope): description"`);
    console.log(`   3. Push with: git push -u origin ${branchName}`);
    console.log(`   4. Create a pull request for immediate review`);
    
  } catch (error) {
    console.error(`❌ Failed to create hotfix branch: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Create a new release branch
 * @param {string} version - Version number for the release
 * @param {string} baseBranch - Base branch to create from
 */
function createReleaseBranch(version, baseBranch = CONFIG.developBranch) {
  console.log(`🚀 Creating release branch: ${CONFIG.releasePrefix}${version}`);
  
  const branchName = `${CONFIG.releasePrefix}${version}`;
  
  // Check if branch already exists
  if (branchExists(branchName)) {
    console.error(`❌ Branch ${branchName} already exists`);
    process.exit(1);
  }
  
  // Ensure clean working directory
  ensureCleanWorkingDirectory();
  
  try {
    // Fetch latest changes
    console.log('📡 Fetching latest changes...');
    execGit('fetch origin');
    
    // Switch to base branch and pull latest
    console.log(`🔄 Switching to ${baseBranch}...`);
    execGit(`checkout ${baseBranch}`);
    execGit(`pull origin ${baseBranch}`);
    
    // Create and switch to new branch
    console.log(`🆕 Creating branch ${branchName}...`);
    execGit(`checkout -b ${branchName}`);
    
    console.log(`✅ Release branch ${branchName} created successfully!`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Update version numbers`);
    console.log(`   2. Update changelog`);
    console.log(`   3. Run final tests`);
    console.log(`   4. Commit with: git commit -m "chore: prepare release ${version}"`);
    console.log(`   5. Push and create pull request to ${CONFIG.mainBranch}`);
    
  } catch (error) {
    console.error(`❌ Failed to create release branch: ${error.message}`);
    process.exit(1);
  }
}

/**
 * List all branches with their status
 */
function listBranches() {
  console.log('🌳 Branch Overview:\n');
  
  try {
    const currentBranch = getCurrentBranch();
    
    // Get local branches
    const localBranches = execGit('branch', true)
      .split('\n')
      .map(branch => branch.replace(/^\*?\s*/, ''))
      .filter(branch => branch.length > 0);
    
    // Get remote branches
    const remoteBranches = execGit('branch -r', true)
      .split('\n')
      .map(branch => branch.replace(/^\s*origin\//, ''))
      .filter(branch => branch.length > 0 && !branch.includes('HEAD'));
    
    console.log(`📍 Current branch: ${currentBranch}\n`);
    
    // Categorize branches
    const features = localBranches.filter(b => b.startsWith(CONFIG.featurePrefix));
    const hotfixes = localBranches.filter(b => b.startsWith(CONFIG.hotfixPrefix));
    const releases = localBranches.filter(b => b.startsWith(CONFIG.releasePrefix));
    const others = localBranches.filter(b => 
      !b.startsWith(CONFIG.featurePrefix) && 
      !b.startsWith(CONFIG.hotfixPrefix) && 
      !b.startsWith(CONFIG.releasePrefix)
    );
    
    if (others.length > 0) {
      console.log('🏠 Main branches:');
      others.forEach(branch => {
        const marker = branch === currentBranch ? '👉' : '  ';
        const hasRemote = remoteBranches.includes(branch) ? '🌐' : '📱';
        console.log(`${marker} ${hasRemote} ${branch}`);
      });
      console.log('');
    }
    
    if (features.length > 0) {
      console.log('🌟 Feature branches:');
      features.forEach(branch => {
        const marker = branch === currentBranch ? '👉' : '  ';
        const hasRemote = remoteBranches.includes(branch) ? '🌐' : '📱';
        console.log(`${marker} ${hasRemote} ${branch}`);
      });
      console.log('');
    }
    
    if (hotfixes.length > 0) {
      console.log('🚨 Hotfix branches:');
      hotfixes.forEach(branch => {
        const marker = branch === currentBranch ? '👉' : '  ';
        const hasRemote = remoteBranches.includes(branch) ? '🌐' : '📱';
        console.log(`${marker} ${hasRemote} ${branch}`);
      });
      console.log('');
    }
    
    if (releases.length > 0) {
      console.log('🚀 Release branches:');
      releases.forEach(branch => {
        const marker = branch === currentBranch ? '👉' : '  ';
        const hasRemote = remoteBranches.includes(branch) ? '🌐' : '📱';
        console.log(`${marker} ${hasRemote} ${branch}`);
      });
      console.log('');
    }
    
    console.log('Legend: 👉 current, 🌐 has remote, 📱 local only');
    
  } catch (error) {
    console.error('❌ Failed to list branches:', error.message);
    process.exit(1);
  }
}

/**
 * Delete a branch safely
 * @param {string} branchName - Name of the branch to delete
 * @param {boolean} force - Force delete even if not merged
 */
function deleteBranch(branchName, force = false) {
  console.log(`🗑️  Deleting branch: ${branchName}`);
  
  const currentBranch = getCurrentBranch();
  
  if (currentBranch === branchName) {
    console.error(`❌ Cannot delete current branch. Switch to another branch first.`);
    process.exit(1);
  }
  
  try {
    const deleteFlag = force ? '-D' : '-d';
    execGit(`branch ${deleteFlag} ${branchName}`);
    
    // Also delete remote branch if it exists
    if (branchExists(branchName, true)) {
      console.log(`🌐 Deleting remote branch: origin/${branchName}`);
      execGit(`push origin --delete ${branchName}`);
    }
    
    console.log(`✅ Branch ${branchName} deleted successfully!`);
    
  } catch (error) {
    if (error.message.includes('not fully merged')) {
      console.error(`❌ Branch ${branchName} is not fully merged.`);
      console.log(`💡 Use --force flag to force delete: git-flow delete ${branchName} --force`);
    } else {
      console.error(`❌ Failed to delete branch: ${error.message}`);
    }
    process.exit(1);
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log('Git Flow Management Tool\n');
  console.log('Usage: node git-flow.js <command> [options]\n');
  console.log('Commands:');
  console.log('  feature <name>     - Create a new feature branch');
  console.log('  hotfix <name>      - Create a new hotfix branch');
  console.log('  release <version>  - Create a new release branch');
  console.log('  list               - List all branches with status');
  console.log('  status             - Show working directory status');
  console.log('  delete <branch>    - Delete a branch safely');
  console.log('  help               - Show this help message\n');
  console.log('Options:');
  console.log('  --force            - Force operation (use with delete)');
  console.log('  --base <branch>    - Specify base branch (default: develop for features, main for hotfixes)\n');
  console.log('Examples:');
  console.log('  node git-flow.js feature user-authentication');
  console.log('  node git-flow.js hotfix critical-security-fix');
  console.log('  node git-flow.js release v1.2.0');
  console.log('  node git-flow.js list');
  console.log('  node git-flow.js status');
  console.log('  node git-flow.js delete feature/old-feature --force');
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showHelp();
    process.exit(1);
  }
  
  const command = args[0];
  const options = {
    force: args.includes('--force'),
    base: args.includes('--base') ? args[args.indexOf('--base') + 1] : null
  };
  
  // Check if we're in a Git repository for most commands
  if (!['help', '--help', '-h'].includes(command)) {
    checkGitRepository();
  }
  
  switch (command) {
    case 'feature':
      if (args.length < 2) {
        console.error('❌ Feature name is required');
        console.log('Usage: node git-flow.js feature <name>');
        process.exit(1);
      }
      createFeatureBranch(args[1], options.base);
      break;
      
    case 'hotfix':
      if (args.length < 2) {
        console.error('❌ Hotfix name is required');
        console.log('Usage: node git-flow.js hotfix <name>');
        process.exit(1);
      }
      createHotfixBranch(args[1], options.base);
      break;
      
    case 'release':
      if (args.length < 2) {
        console.error('❌ Version is required');
        console.log('Usage: node git-flow.js release <version>');
        process.exit(1);
      }
      createReleaseBranch(args[1], options.base);
      break;
      
    case 'list':
      listBranches();
      break;
      
    case 'status':
      const status = getWorkingDirectoryStatus();
      displayStatus(status);
      break;
      
    case 'delete':
      if (args.length < 2) {
        console.error('❌ Branch name is required');
        console.log('Usage: node git-flow.js delete <branch>');
        process.exit(1);
      }
      deleteBranch(args[1], options.force);
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('');
      showHelp();
      process.exit(1);
  }
}

// Export for testing
if (require.main === module) {
  main();
} else {
  module.exports = {
    getCurrentBranch,
    getWorkingDirectoryStatus,
    branchExists,
    createFeatureBranch,
    createHotfixBranch,
    createReleaseBranch,
    listBranches,
    deleteBranch,
    CONFIG
  };
}