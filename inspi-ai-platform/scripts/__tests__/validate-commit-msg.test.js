/**
 * Tests for commit message validation script
 */

const {
  validateCommitMessage,
  parseCommitMessage,
  formatValidationResult,
  VALID_TYPES,
  VALID_SCOPES
} = require('../validate-commit-msg');

describe('parseCommitMessage', () => {
  test('should parse valid conventional commit', () => {
    const message = 'feat(ui): add responsive navigation menu';
    const result = parseCommitMessage(message);
    
    expect(result.valid).toBe(true);
    expect(result.type).toBe('feat');
    expect(result.scope).toBe('ui');
    expect(result.description).toBe('add responsive navigation menu');
    expect(result.subject).toBe('feat(ui): add responsive navigation menu');
  });
  
  test('should parse commit without scope', () => {
    const message = 'fix: resolve authentication timeout';
    const result = parseCommitMessage(message);
    
    expect(result.valid).toBe(true);
    expect(result.type).toBe('fix');
    expect(result.scope).toBeUndefined();
    expect(result.description).toBe('resolve authentication timeout');
  });
  
  test('should detect breaking changes', () => {
    const message = 'feat!: remove deprecated API\n\nBREAKING CHANGE: API v1 is no longer supported';
    const result = parseCommitMessage(message);
    
    expect(result.hasBreakingChange).toBe(true);
  });
  
  test('should handle invalid format', () => {
    const message = 'invalid commit message';
    const result = parseCommitMessage(message);
    
    expect(result.valid).toBe(false);
  });
});

describe('validateCommitMessage', () => {
  test('should validate correct commit message', () => {
    const message = 'feat(ui): add responsive navigation';
    const result = validateCommitMessage(message);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  test('should reject empty message', () => {
    const result = validateCommitMessage('');
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Commit message cannot be empty');
  });
  
  test('should reject invalid type', () => {
    const message = 'invalid(ui): add feature';
    const result = validateCommitMessage(message);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(error => error.includes('Invalid type'))).toBe(true);
  });
  
  test('should warn about invalid scope', () => {
    const message = 'feat(invalid): add feature';
    const result = validateCommitMessage(message);
    
    expect(result.valid).toBe(true); // Still valid, just a warning
    expect(result.warnings.some(warning => warning.includes('Scope'))).toBe(true);
  });
  
  test('should reject too long description', () => {
    const message = 'feat(ui): this is a very long description that exceeds the fifty character limit';
    const result = validateCommitMessage(message);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(error => error.includes('50 characters'))).toBe(true);
  });
  
  test('should reject too short description', () => {
    const message = 'feat: ab';
    const result = validateCommitMessage(message);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(error => error.includes('at least 3 characters'))).toBe(true);
  });
  
  test('should warn about capitalized description', () => {
    const message = 'feat(ui): Add responsive navigation';
    const result = validateCommitMessage(message);
    
    expect(result.valid).toBe(true);
    expect(result.warnings.some(warning => warning.includes('lowercase'))).toBe(true);
  });
  
  test('should warn about period at end', () => {
    const message = 'feat(ui): add responsive navigation.';
    const result = validateCommitMessage(message);
    
    expect(result.valid).toBe(true);
    expect(result.warnings.some(warning => warning.includes('period'))).toBe(true);
  });
  
  test('should warn about non-imperative mood', () => {
    const message = 'feat(ui): added responsive navigation';
    const result = validateCommitMessage(message);
    
    expect(result.valid).toBe(true);
    expect(result.warnings.some(warning => warning.includes('imperative'))).toBe(true);
  });
  
  test('should validate all commit types', () => {
    VALID_TYPES.forEach(type => {
      const message = `${type}: test description`;
      const result = validateCommitMessage(message);
      
      expect(result.valid).toBe(true);
    });
  });
  
  test('should accept all valid scopes', () => {
    VALID_SCOPES.forEach(scope => {
      const message = `feat(${scope}): test description`;
      const result = validateCommitMessage(message);
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });
});

describe('formatValidationResult', () => {
  test('should format successful validation', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };
    
    const output = formatValidationResult(result);
    expect(output).toContain('✅ Commit message is valid!');
  });
  
  test('should format validation with errors', () => {
    const result = {
      valid: false,
      errors: ['Invalid type'],
      warnings: ['Capitalized description'],
      suggestions: ['Use lowercase']
    };
    
    const output = formatValidationResult(result);
    expect(output).toContain('❌ Commit message validation failed:');
    expect(output).toContain('Invalid type');
    expect(output).toContain('⚠️  Warnings:');
    expect(output).toContain('Capitalized description');
    expect(output).toContain('💡 Suggestions:');
    expect(output).toContain('Use lowercase');
  });
});

describe('Integration tests', () => {
  test('should handle merge commit messages', () => {
    const message = 'Merge branch "feature/new-feature" into main';
    // Merge commits should be handled by the main script, not the validation function
    // This test ensures the validation function doesn't break on merge commits
    const result = validateCommitMessage(message);
    
    // The validation will fail because it's not conventional format,
    // but the main script should skip validation for merge commits
    expect(result.valid).toBe(false);
  });
  
  test('should handle revert commit messages', () => {
    const message = 'Revert "feat(ui): add responsive navigation"';
    // Similar to merge commits, revert commits should be handled by the main script
    const result = validateCommitMessage(message);
    
    expect(result.valid).toBe(false);
  });
  
  test('should validate complex commit with body and footer', () => {
    const message = `feat(api): add user authentication

Implement JWT-based authentication system with refresh tokens.
Includes middleware for route protection and user session management.

Closes #123
BREAKING CHANGE: Authentication is now required for all API endpoints`;
    
    const result = validateCommitMessage(message);
    expect(result.valid).toBe(true);
    expect(result.parsed.hasBreakingChange).toBe(true);
  });
});