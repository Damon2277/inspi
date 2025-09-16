#!/usr/bin/env node

/**
 * Git hooks installation script
 * Installs and manages Git hooks for the project
 */

const fs = require('fs');
const path = require('path');

const HOOKS_DIR = '.git/hooks';
const PROJECT_DIR = 'inspi-ai-platform';

/**
 * Hook configurations
 */
const HOOKS = {
  'commit-msg': {
    content: `#!/bin/sh
#
# Git commit-msg hook
# Validates commit messages using the validation script
#

# Path to the validation script
SCRIPT_PATH="${PROJECT_DIR}/scripts/validate-commit-msg.js"

# Check if Node.js is available
if ! command -v node >/dev/null 2>&1; then
    echo "Warning: Node.js not found. Skipping commit message validation."
    exit 0
fi

# Check if validation script exists
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Warning: Commit message validation script not found at $SCRIPT_PATH"
    exit 0
fi

# Run validation
node "$SCRIPT_PATH" "$1"
exit_code=$?

if [ $exit_code -ne 0 ]; then
    echo ""
    echo "Commit aborted due to invalid commit message."
    echo "Please fix the issues above and try again."
    exit 1
fi

exit 0`,
    description: 'Validates commit messages against conventional commit format'
  },
  
  'prepare-commit-msg': {
    content: `#!/bin/sh
#
# Git prepare-commit-msg hook
# Prepares commit message with template for interactive commits
#

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2
SHA1=$3

# Only add template for regular commits (not merge, squash, etc.)
case "$COMMIT_SOURCE" in
  merge|squash|commit)
    # Don't modify the message for these types
    exit 0
    ;;
  *)
    # Check if message is empty or only contains comments
    if [ ! -s "$COMMIT_MSG_FILE" ] || ! grep -qv '^#' "$COMMIT_MSG_FILE"; then
      # Load the commit message template
      if [ -f "${PROJECT_DIR}/.gitmessage" ]; then
        cat "${PROJECT_DIR}/.gitmessage" > "$COMMIT_MSG_FILE"
      fi
    fi
    ;;
esac

exit 0`,
    description: 'Prepares commit message with template'
  }
};

/**
 * Check if Git repository exists
 */
function checkGitRepository() {
  if (!fs.existsSync('.git')) {
    console.error('❌ Not a Git repository. Please run this script from the root of a Git repository.');
    process.exit(1);
  }
  
  if (!fs.existsSync(HOOKS_DIR)) {
    console.error('❌ Git hooks directory not found.');
    process.exit(1);
  }
}

/**
 * Install a single hook
 * @param {string} hookName - Name of the hook
 * @param {object} hookConfig - Hook configuration
 */
function installHook(hookName, hookConfig) {
  const hookPath = path.join(HOOKS_DIR, hookName);
  
  try {
    // Write hook content
    fs.writeFileSync(hookPath, hookConfig.content, { mode: 0o755 });
    console.log(`✅ Installed ${hookName} hook: ${hookConfig.description}`);
  } catch (error) {
    console.error(`❌ Failed to install ${hookName} hook:`, error.message);
    return false;
  }
  
  return true;
}

/**
 * Uninstall a single hook
 * @param {string} hookName - Name of the hook
 */
function uninstallHook(hookName) {
  const hookPath = path.join(HOOKS_DIR, hookName);
  
  if (fs.existsSync(hookPath)) {
    try {
      fs.unlinkSync(hookPath);
      console.log(`✅ Uninstalled ${hookName} hook`);
    } catch (error) {
      console.error(`❌ Failed to uninstall ${hookName} hook:`, error.message);
      return false;
    }
  } else {
    console.log(`ℹ️  ${hookName} hook not found (already uninstalled)`);
  }
  
  return true;
}

/**
 * Install all hooks
 */
function installAllHooks() {
  console.log('🔧 Installing Git hooks...\n');
  
  let success = true;
  
  for (const [hookName, hookConfig] of Object.entries(HOOKS)) {
    if (!installHook(hookName, hookConfig)) {
      success = false;
    }
  }
  
  if (success) {
    console.log('\n🎉 All Git hooks installed successfully!');
    console.log('\nNext steps:');
    console.log('1. Configure Git to use the commit message template:');
    console.log(`   git config commit.template ${PROJECT_DIR}/.gitmessage`);
    console.log('2. Try making a commit to test the hooks');
  } else {
    console.log('\n⚠️  Some hooks failed to install. Please check the errors above.');
  }
  
  return success;
}

/**
 * Uninstall all hooks
 */
function uninstallAllHooks() {
  console.log('🗑️  Uninstalling Git hooks...\n');
  
  let success = true;
  
  for (const hookName of Object.keys(HOOKS)) {
    if (!uninstallHook(hookName)) {
      success = false;
    }
  }
  
  if (success) {
    console.log('\n✅ All Git hooks uninstalled successfully!');
  } else {
    console.log('\n⚠️  Some hooks failed to uninstall. Please check the errors above.');
  }
  
  return success;
}

/**
 * List installed hooks
 */
function listHooks() {
  console.log('📋 Git hooks status:\n');
  
  for (const [hookName, hookConfig] of Object.entries(HOOKS)) {
    const hookPath = path.join(HOOKS_DIR, hookName);
    const installed = fs.existsSync(hookPath);
    const status = installed ? '✅ Installed' : '❌ Not installed';
    
    console.log(`${hookName}: ${status}`);
    console.log(`   Description: ${hookConfig.description}`);
    console.log('');
  }
}

/**
 * Show help
 */
function showHelp() {
  console.log('Git Hooks Management Script\n');
  console.log('Usage: node install-git-hooks.js [command]\n');
  console.log('Commands:');
  console.log('  install   - Install all Git hooks (default)');
  console.log('  uninstall - Uninstall all Git hooks');
  console.log('  list      - List hook installation status');
  console.log('  help      - Show this help message\n');
  console.log('Examples:');
  console.log('  node install-git-hooks.js');
  console.log('  node install-git-hooks.js install');
  console.log('  node install-git-hooks.js uninstall');
  console.log('  node install-git-hooks.js list');
}

/**
 * Main function
 */
function main() {
  const command = process.argv[2] || 'install';
  
  switch (command) {
    case 'install':
      checkGitRepository();
      process.exit(installAllHooks() ? 0 : 1);
      break;
      
    case 'uninstall':
      checkGitRepository();
      process.exit(uninstallAllHooks() ? 0 : 1);
      break;
      
    case 'list':
      checkGitRepository();
      listHooks();
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
    installHook,
    uninstallHook,
    installAllHooks,
    uninstallAllHooks,
    listHooks,
    HOOKS
  };
}