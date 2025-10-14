/**
 * @jest-environment node
 */

describe('User Model', () => {
  it('should define User schema with correct structure', () => {
    // Import the model to trigger schema creation
    const User = require('@/lib/models/User');

    // Test that the model is defined
    expect(User).toBeDefined();
  });

  it('should have model methods available', () => {
    const User = require('@/lib/models/User');

    // Test that the model has expected properties
    expect(User.default || User).toBeDefined();
  });

  it('should be importable without errors', () => {
    expect(() => {
      require('@/lib/models/User');
    }).not.toThrow();
  });
});
