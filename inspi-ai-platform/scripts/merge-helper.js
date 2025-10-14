#!/usr/bin/env node

/**
 * Git Merge Helper Script
 * Provides safe merge operations with pre-merge checks
 */

const { execSync } = require('child_process');
const readline = require('readline');

/**
 * Configuration
 */
const CONFIG = {
  mainBranch: 'main',
  developBranch: 'develop',
  featurePrefix: 'feature/',
  hotfixPrefix: 'hotfix/',
  releasePrefix: 'release/'
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
    
    return {
      clean: statusLines.length === 0,
      totalChanges: statusLines.length,
      files: statusLines
    };
  } catch (error) {
    console.error('❌ Failed to get working directory status');
    throw error;
  }
}

/**
 * Check if branch is up to date with remote
 * @param {string} branchName - Branch name to check
 * @returns {object} Status information
 */
function checkBranchStatus(branchName) {
  try {
    // Fetch latest changes
    execGit('fetch origin', true);
    
    let ahead = 0;
    let behind = 0;
    let hasRemote = false;
    
    if (branchExists(branchName, true)) {
      hasRemote = true;
      try {
        const trackingInfo = execGit(`rev-list --left-right --
          count origin/${branchName}...${branchName}`, true);
        const [behindCount, aheadCount] = trackingInfo.split('\t').map(Number);
        ahead = aheadCount || 0;
        behind = behindCount || 0;
      } catch (error) {
        // Ignore errors for branches without tracking
      }
    }
    
    return {
      hasRemote,
      ahead,
      behind,
      upToDate: ahead === 0 && behind === 0
    };
  } catch (error) {
    console.error(`❌ Failed to check branch status for ${branchName}`);
    throw error;
  }
}

/**
 * Get merge conflicts
 * @returns {array} List of conflicted files
 */
function getMergeConflicts() {
  try {
    const status = execGit('status --porcelain', true);
    const conflicts = status
      .split('\n')
      .filter(line => line.startsWith('UU ') || line.startsWith('AA ') || line.startsWith('DD '))
      .map(line => line.substring(3));
    
    return conflicts;
  } catch (error) {
    return [];
  }
}

/**
 * Prompt user for confirmation
 * @param {string} question - Question to ask
 * @returns {Promise<boolean>} User's response
 */
function promptConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`${question} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Perform pre-merge checks
 * @param {string} sourceBranch - Branch to merge from
 * @param {string} targetBranch - Branch to merge into
 * @returns {Promise<boolean>} True if checks pass
 */
async function performPreMergeChecks(sourceBranch, targetBranch) {
  console.log('🔍 Performing pre-merge checks...\n');
  
  let checksPass = true;
  
  // Check if branches exist
  if (!branchExists(sourceBranch)) {
    console.error(`❌ Source branch '${sourceBranch}' does not exist`);
    checksPass = false;
  }
  
  if (!branchExists(targetBranch)) {
    console.error(`❌ Target branch '${targetBranch}' does not exist`);
    checksPass = false;
  }
  
  if (!checksPass) {
    return false;
  }
  
  // Check working directory
  const workingStatus = getWorkingDirectoryStatus();
  if (!workingStatus.clean) {
    console.error(`❌ Working directory is not clean (${workingStatus.totalChanges} changes)`);
    console.log('Please commit or stash your changes before merging.');
    checksPass = false;
  } else {
    console.log('✅ Working directory is clean');
  }
  
  // Check if target branch is up to date
  const targetStatus = checkBranchStatus(targetBranch);
  if (targetStatus.hasRemote && targetStatus.behind > 0) {
    console.error(`❌ Target branch '${targetBranch}' is ${targetStatus.behind} commits behind origin`);
    console.log('Please pull latest changes before merging.');
    checksPass = false;
  } else if (targetStatus.hasRemote) {
    console.log(`✅ Target branch '${targetBranch}' is up to date`);
  }
  
  // Check if source branch is up to date
  const sourceStatus = checkBranchStatus(sourceBranch);
  if (sourceStatus.hasRemote && sourceStatus.behind > 0) {
    console.warn(`⚠️  Source branch '${sourceBranch}' is ${sourceStatus.behind} commits behind origin`);
    const shouldContinue = await promptConfirmation('Continue with merge anyway?');
    if (!shouldContinue) {
      checksPass = false;
    }
  } else if (sourceStatus.hasRemote) {
    console.log(`✅ Source branch '${sourceBranch}' is up to date`);
  }
  
  // Check for potential conflicts (dry run)
  try {
    console.log('🔍 Checking for potential merge conflicts...');
    execGit(`merge --no-commit --no-ff ${sourceBranch}`, true);
    execGit('merge --abort', true);
    console.log('✅ No merge conflicts detected');
  } catch (error) {
    console.warn('⚠️  Potential merge conflicts detected');
    const shouldContinue = await promptConfirmation('Continue with merge anyway?');
    if (!shouldContinue) {
      checksPass = false;
    }
  }
  
  return checksPass;
}

/**
 * Merge a feature branch
 * @param {string} featureBranch - Feature branch to merge
 * @param {string} targetBranch - Target branch (default: develop)
 */
async function mergeFeature(featureBranch, targetBranch = CONFIG.developBranch) {
  console.log(`🌟 Merging feature branch: ${featureBranch} → ${targetBranch}\n`);
  
  // Add feature prefix if not present
  if (!featureBranch.startsWith(CONFIG.featurePrefix)) {
    featureBranch = CONFIG.featurePrefix + featureBranch;
  }
  
  // Perform pre-merge checks
  const checksPass = await performPreMergeChecks(featureBranch, targetBranch);
  if (!checksPass) {
    console.error('\n❌ Pre-merge checks failed. Please fix the issues above.');
    process.exit(1);
  }
  
  try {
    // Switch to target branch
    console.log(`\n🔄 Switching to ${targetBranch}...`);
    execGit(`checkout ${targetBranch}`);
    
    // Pull latest changes
    console.log('📡 Pulling latest changes...');
    execGit(`pull origin ${targetBranch}`);
    
    // Perform the merge
    console.log(`🔀 Merging ${featureBranch}...`);
    execGit(`merge --no-ff ${featureBranch} -m "Merge ${featureBranch} into ${targetBranch}"`);
    
    console.log('✅ Feature branch merged successfully!');
    
    // Ask if user wants to delete the feature branch
    const shouldDelete = await promptConfirmation(`Delete feature branch ${featureBranch}?`);
    if (shouldDelete) {
      try {
        execGit(`branch -d ${featureBranch}`);
        if (branchExists(featureBranch, true)) {
          execGit(`push origin --delete ${featureBranch}`);
        }
        console.log(`🗑️  Feature branch ${featureBranch} deleted`);
      } catch (error) {
        console.warn(`⚠️  Failed to delete feature branch: ${error.message}`);
      }
    }
    
    // Ask if user wants to push changes
    const shouldPush = await promptConfirmation(`Push ${targetBranch} to origin?`);
    if (shouldPush) {
      console.log('📤 Pushing changes...');
      execGit(`push origin ${targetBranch}`);
      console.log('✅ Changes pushed successfully!');
    }
    
  } catch (error) {
    console.error(`❌ Merge failed: ${error.message}`);
    
    // Check for conflicts
    const conflicts = getMergeConflicts();
    if (conflicts.length > 0) {
      console.log('\n🔥 Merge conflicts detected in:');
      conflicts.forEach(file => console.log(`   - ${file}`));
      console.log('\n💡 To resolve conflicts:');
      console.log('   1. Edit the conflicted files');
      console.log('   2. Stage the resolved files: git add <file>');
      console.log('   3. Complete the merge: git commit');
      console.log('   4. Or abort the merge: git merge --abort');
    }
    
    process.exit(1);
  }
}

/**
 * Merge a hotfix branch
 * @param {string} hotfixBranch - Hotfix branch to merge
 */
async function mergeHotfix(hotfixBranch) {
  console.log(`🚨 Merging hotfix branch: ${hotfixBranch}\n`);
  
  // Add hotfix prefix if not present
  if (!hotfixBranch.startsWith(CONFIG.hotfixPrefix)) {
    hotfixBranch = CONFIG.hotfixPrefix + hotfixBranch;
  }
  
  // Merge into main first
  console.log(`📍 Step 1: Merging into ${CONFIG.mainBranch}`);
  const mainChecksPass = await performPreMergeChecks(hotfixBranch, CONFIG.mainBranch);
  if (!mainChecksPass) {
    console.error('\n❌ Pre-merge checks failed for main branch.');
    process.exit(1);
  }
  
  try {
    // Merge into main
    execGit(`checkout ${CONFIG.mainBranch}`);
    execGit(`pull origin ${CONFIG.mainBranch}`);
    execGit(`merge --no-ff ${hotfixBranch} -m "Merge ${hotfixBranch} into ${CONFIG.mainBranch}"`);
    console.log(`✅ Hotfix merged into ${CONFIG.mainBranch}`);
    
    // Merge into develop
    console.log(`\n📍 Step 2: Merging into ${CONFIG.developBranch}`);
    execGit(`checkout ${CONFIG.developBranch}`);
    execGit(`pull origin ${CONFIG.developBranch}`);
    execGit(`merge --no-ff ${hotfixBranch} -
      m "Merge ${hotfixBranch} into ${CONFIG.developBranch}"`);
    console.log(`✅ Hotfix merged into ${CONFIG.developBranch}`);
    
    // Ask if user wants to delete the hotfix branch
    const shouldDelete = await promptConfirmation(`Delete hotfix branch ${hotfixBranch}?`);
    if (shouldDelete) {
      try {
        execGit(`branch -d ${hotfixBranch}`);
        if (branchExists(hotfixBranch, true)) {
          execGit(`push origin --delete ${hotfixBranch}`);
        }
        console.log(`🗑️  Hotfix branch ${hotfixBranch} deleted`);
      } catch (error) {
        console.warn(`⚠️  Failed to delete hotfix branch: ${error.message}`);
      }
    }
    
    // Ask if user wants to push changes
    const shouldPush = await promptConfirmation('Push all changes to origin?');
    if (shouldPush) {
      console.log('📤 Pushing changes...');
      execGit(`push origin ${CONFIG.mainBranch}`);
      execGit(`push origin ${CONFIG.developBranch}`);
      console.log('✅ All changes pushed successfully!');
    }
    
  } catch (error) {
    console.error(`❌ Hotfix merge failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Merge a release branch
 * @param {string} releaseBranch - Release branch to merge
 */
async function mergeRelease(releaseBranch) {
  console.log(`🚀 Merging release branch: ${releaseBranch}\n`);
  
  // Add release prefix if not present
  if (!releaseBranch.startsWith(CONFIG.releasePrefix)) {
    releaseBranch = CONFIG.releasePrefix + releaseBranch;
  }
  
  // Merge into main first
  console.log(`📍 Step 1: Merging into ${CONFIG.mainBranch}`);
  const mainChecksPass = await performPreMergeChecks(releaseBranch, CONFIG.mainBranch);
  if (!mainChecksPass) {
    console.error('\n❌ Pre-merge checks failed for main branch.');
    process.exit(1);
  }
  
  try {
    // Merge into main
    execGit(`checkout ${CONFIG.mainBranch}`);
    execGit(`pull origin ${CONFIG.mainBranch}`);
    execGit(`merge --no-ff ${releaseBranch} -m "Merge ${releaseBranch} into ${CONFIG.mainBranch}"`);
    console.log(`✅ Release merged into ${CONFIG.mainBranch}`);
    
    // Create tag
    const version = releaseBranch.replace(CONFIG.releasePrefix, '');
    const shouldTag = await promptConfirmation(`Create tag v${version}?`);
    if (shouldTag) {
      execGit(`tag -a v${version} -m "Release v${version}"`);
      console.log(`🏷️  Tag v${version} created`);
    }
    
    // Merge back into develop
    console.log(`\n📍 Step 2: Merging back into ${CONFIG.developBranch}`);
    execGit(`checkout ${CONFIG.developBranch}`);
    execGit(`pull origin ${CONFIG.developBranch}`);
    execGit(`merge --no-ff ${releaseBranch} -
      m "Merge ${releaseBranch} back into ${CONFIG.developBranch}"`);
    console.log(`✅ Release merged back into ${CONFIG.developBranch}`);
    
    // Ask if user wants to delete the release branch
    const shouldDelete = await promptConfirmation(`Delete release branch ${releaseBranch}?`);
    if (shouldDelete) {
      try {
        execGit(`branch -d ${releaseBranch}`);
        if (branchExists(releaseBranch, true)) {
          execGit(`push origin --delete ${releaseBranch}`);
        }
        console.log(`🗑️  Release branch ${releaseBranch} deleted`);
      } catch (error) {
        console.warn(`⚠️  Failed to delete release branch: ${error.message}`);
      }
    }
    
    // Ask if user wants to push changes
    const shouldPush = await promptConfirmation('Push all changes and tags to origin?');
    if (shouldPush) {
      console.log('📤 Pushing changes...');
      execGit(`push origin ${CONFIG.mainBranch}`);
      execGit(`push origin ${CONFIG.developBranch}`);
      if (shouldTag) {
        execGit(`push origin v${version}`);
      }
      console.log('✅ All changes and tags pushed successfully!');
    }
    
  } catch (error) {
    console.error(`❌ Release merge failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log('Git Merge Helper Tool\n');
  console.log('Usage: node merge-helper.js <command> <branch-name> [options]\n');
  console.log('Commands:');
  console.log('  feature <name>     - Merge a feature branch into develop');
  console.log('  hotfix <name>      - Merge a hotfix branch into main and develop');
  console.log('  release <version>  - Merge a release branch into main and develop');
  console.log('  help               - Show this help message\n');
  console.log('Examples:');
  console.log('  node merge-helper.js feature user-authentication');
  console.log('  node merge-helper.js feature feature/user-authentication');
  console.log('  node merge-helper.js hotfix critical-security-fix');
  console.log('  node merge-helper.js release v1.2.0');
  console.log('\nNote: Branch prefixes (feature/, hotfix/,
    release/) are added automatically if not provided.');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showHelp();
    process.exit(1);
  }
  
  const command = args[0];
  
  switch (command) {
    case 'feature':
      if (args.length < 2) {
        console.error('❌ Feature branch name is required');
        console.log('Usage: node merge-helper.js feature <name>');
        process.exit(1);
      }
      await mergeFeature(args[1]);
      break;
      
    case 'hotfix':
      if (args.length < 2) {
        console.error('❌ Hotfix branch name is required');
        console.log('Usage: node merge-helper.js hotfix <name>');
        process.exit(1);
      }
      await mergeHotfix(args[1]);
      break;
      
    case 'release':
      if (args.length < 2) {
        console.error('❌ Release branch name is required');
        console.log('Usage: node merge-helper.js release <version>');
        process.exit(1);
      }
      await mergeRelease(args[1]);
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
  main().catch(error => {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  });
} else {
  module.exports = {
    mergeFeature,
    mergeHotfix,
    mergeRelease,
    performPreMergeChecks,
    getWorkingDirectoryStatus,
    checkBranchStatus,
    CONFIG
  };
}