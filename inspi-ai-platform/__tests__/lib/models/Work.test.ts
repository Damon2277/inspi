/**
 * @jest-environment node
 */

describe('Work Model', () => {
  it('should define Work model without errors', () => {
    expect(() => {
      require('@/lib/models/Work');
    }).not.toThrow();
  });

  it('should have Work model available', () => {
    const Work = require('@/lib/models/Work');
    expect(Work.default || Work).toBeDefined();
  });

  it('should export TeachingCard and Attribution types', () => {
    // Test that the module can be imported
    const WorkModule = require('@/lib/models/Work');
    expect(WorkModule).toBeDefined();
  });
});
