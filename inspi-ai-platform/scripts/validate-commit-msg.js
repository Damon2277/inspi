#!/usr/bin/env node

/**
 * Git commit message validation script
 * Validates commit messages against conventional commit format
 */

const fs = require('fs');
const path = require('path');

// Conventional commit pattern
const COMMIT_PATTERN = /^(feat|fix|docs|style|refactor|test|chore)(\([a-z-]+\))?: .{1,50}$/;

// Valid types
const VALID_TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'];

// Valid scopes (optional)
const VALID_SCOPES = ['ui', 'api', 'core', 'test', 'build', 'ci'];

/**
 * Parse commit message
 * @param {string} message - The commit message
 * @returns {object} Parsed commit components
 */
function parseCommitMessage(message) {
  const lines = message.trim().split('\n');
  const subject = lines[0];
  const body = lines.slice(1).join('\n').trim();
  
  // Parse subject line (handle breaking change indicator with !)
  const match = subject.match(/^(\w+)!?(\(([^)]+)\))?: (.+)$/);
  
  if (!match) {
    return { valid: false, subject, body, hasBreakingChange: message.includes('BREAKING CHANGE:') };
  }
  
  const [, type, , scope, description] = match;
  
  return {
    valid: true,
    type,
    scope,
    description,
    subject,
    body,
    hasBreakingChange: message.includes('BREAKING CHANGE:')
  };
}

/**
 * Validate commit message
 * @param {string} message - The commit message
 * @returns {object} Validation result
 */
function validateCommitMessage(message) {
  const errors = [];
  const warnings = [];
  const suggestions = [];
  
  if (!message || message.trim().length === 0) {
    errors.push('Commit message cannot be empty');
    return { valid: false, errors, warnings, suggestions };
  }
  
  const parsed = parseCommitMessage(message);
  
  if (!parsed.valid) {
    errors.push('Commit message does not follow conventional format');
    suggestions.push('Use format: type(scope): description');
    suggestions.push('Example: feat(ui): add responsive navigation');
    return { valid: false, errors, warnings, suggestions };
  }
  
  // Validate type
  if (!VALID_TYPES.includes(parsed.type)) {
    errors.push(`Invalid type "${parsed.type}". Valid types: ${VALID_TYPES.join(', ')}`);
  }
  
  // Validate scope (if provided)
  if (parsed.scope && !VALID_SCOPES.includes(parsed.scope)) {
    warnings.push(`Scope "${parsed.scope}" is not in recommended list: ${VALID_SCOPES.join(', ')}`);
  }
  
  // Validate description
  if (parsed.description.length > 50) {
    errors.push('Description should be 50 characters or less');
  }
  
  if (parsed.description.length < 3) {
    errors.push('Description should be at least 3 characters');
  }
  
  if (parsed.description[0] === parsed.description[0].toUpperCase()) {
    warnings.push('Description should start with lowercase letter');
  }
  
  if (parsed.description.endsWith('.')) {
    warnings.push('Description should not end with a period');
  }
  
  // Check for imperative mood (basic check)
  const nonImperativeWords = ['added', 'fixed', 'updated', 'changed', 'removed'];
  const firstWord = parsed.description.split(' ')[0].toLowerCase();
  if (nonImperativeWords.includes(firstWord)) {
    warnings.push('Use imperative mood (e.g., "add" instead of "added")');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    parsed
  };
}

/**
 * Format validation result for display
 * @param {object} result - Validation result
 * @returns {string} Formatted message
 */
function formatValidationResult(result) {
  let output = '';
  
  if (result.errors.length > 0) {
    output += '\n❌ Commit message validation failed:\n';
    result.errors.forEach(error => {
      output += `   • ${error}\n`;
    });
  }
  
  if (result.warnings.length > 0) {
    output += '\n⚠️  Warnings:\n';
    result.warnings.forEach(warning => {
      output += `   • ${warning}\n`;
    });
  }
  
  if (result.suggestions.length > 0) {
    output += '\n💡 Suggestions:\n';
    result.suggestions.forEach(suggestion => {
      output += `   • ${suggestion}\n`;
    });
  }
  
  if (result.valid) {
    output += '\n✅ Commit message is valid!\n';
  } else {
    output += '\nPlease fix the errors above and try again.\n';
    output += '\nFor help with commit message format, see .gitmessage template.\n';
  }
  
  return output;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node validate-commit-msg.js <commit-message-file>');
    process.exit(1);
  }
  
  const messageFile = args[0];
  
  if (!fs.existsSync(messageFile)) {
    console.error(`Commit message file not found: ${messageFile}`);
    process.exit(1);
  }
  
  const message = fs.readFileSync(messageFile, 'utf8');
  
  // Skip validation for merge commits and revert commits
  if (message.startsWith('Merge ') || message.startsWith('Revert ')) {
    console.log('Skipping validation for merge/revert commit');
    process.exit(0);
  }
  
  const result = validateCommitMessage(message);
  const output = formatValidationResult(result);
  
  console.log(output);
  
  if (!result.valid) {
    process.exit(1);
  }
  
  process.exit(0);
}

// Export for testing
if (require.main === module) {
  main();
} else {
  module.exports = {
    validateCommitMessage,
    parseCommitMessage,
    formatValidationResult,
    VALID_TYPES,
    VALID_SCOPES
  };
}