/**
 * Accessibility Tester Tests
 * 
 * Tests for the comprehensive accessibility testing framework
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  AccessibilityTester,
  createAccessibilityTester,
  AccessibilityTestConfig
} from '../../../../lib/testing/ui/AccessibilityTester';

// Mock axe-core for testing
jest.mock('jest-axe', () => ({
  axe: jest.fn(),
  toHaveNoViolations: {}
}));

// Mock components for testing
const AccessibleButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <button
    data-testid="accessible-button"
    onClick={onClick}
    aria-label="Accessible button for testing"
  >
    Click me
  </button>
);

const InaccessibleButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <div
    data-testid="inaccessible-button"
    onClick={onClick}
    style={{ cursor: 'pointer' }}
  >
    Click me (not accessible)
  </div>
);

const AccessibleForm: React.FC = () => (
  <form data-testid="accessible-form">
    <div>
      <label htmlFor="name">Name:</label>
      <input
        id="name"
        type="text"
        aria-required="true"
        aria-describedby="name-help"
      />
      <div id="name-help">Enter your full name</div>
    </div>
    <div>
      <label htmlFor="email">Email:</label>
      <input
        id="email"
        type="email"
        aria-required="true"
        aria-invalid="false"
      />
    </div>
    <button type="submit" aria-describedby="submit-help">
      Submit
    </button>
    <div id="submit-help">Submit the form</div>
  </form>
);

const InaccessibleForm: React.FC = () => (
  <form data-testid="inaccessible-form">
    <input type="text" placeholder="Name" />
    <input type="email" placeholder="Email" />
    <div onClick={() => {}}>Submit</div>
  </form>
);

const AccessiblePage: React.FC = () => (
  <div data-testid="accessible-page">
    <header role="banner">
      <h1>Page Title</h1>
      <nav role="navigation" aria-label="Main navigation">
        <a href="#main" className="skip-link">Skip to main content</a>
        <ul>
          <li><a href="/home">Home</a></li>
          <li><a href="/about">About</a></li>
        </ul>
      </nav>
    </header>
    <main role="main" id="main">
      <h2>Main Content</h2>
      <p>This is the main content area.</p>
      <img src="test.jpg" alt="Test image description" />
    </main>
    <aside role="complementary">
      <h3>Sidebar</h3>
      <p>Additional information</p>
    </aside>
    <footer role="contentinfo">
      <p>&copy; 2024 Test Site</p>
    </footer>
  </div>
);

const InaccessiblePage: React.FC = () => (
  <div data-testid="inaccessible-page">
    <div>
      <h3>Page Title</h3>
      <div>
        <div onClick={() => {}}>Home</div>
        <div onClick={() => {}}>About</div>
      </div>
    </div>
    <div>
      <h1>Main Content</h1>
      <p>This is the main content area.</p>
      <img src="test.jpg" />
    </div>
    <div>
      <h2>Sidebar</h2>
      <p>Additional information</p>
    </div>
  </div>
);

const ColorContrastComponent: React.FC<{ 
  textColor?: string; 
  backgroundColor?: string;
  fontSize?: string;
  fontWeight?: string;
}> = ({ 
  textColor = '#000000', 
  backgroundColor = '#ffffff',
  fontSize = '16px',
  fontWeight = 'normal'
}) => (
  <div
    data-testid="color-contrast-component"
    style={{
      color: textColor,
      backgroundColor,
      fontSize,
      fontWeight,
      padding: '16px'
    }}
  >
    This text should have sufficient contrast
  </div>
);

const ModalComponent: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      data-testid="modal"
    >
      <h2 id="modal-title">Modal Title</h2>
      <p>Modal content</p>
      <button data-testid="modal-close">Close</button>
      <button data-testid="modal-action">Action</button>
    </div>
  );
};

describe('AccessibilityTester', () => {
  let tester: AccessibilityTester;

  beforeEach(() => {
    const config: Partial<AccessibilityTestConfig> = {
      wcagLevel: 'AA',
      keyboardNavigation: true,
      screenReaderTesting: true,
      colorContrastTesting: true,
      focusManagement: true
    };
    
    tester = createAccessibilityTester(config);

    // Mock axe results
    const { axe } = require('jest-axe');
    axe.mockResolvedValue({
      violations: []
    });
  });

  afterEach(() => {
    tester.cleanup();
    jest.clearAllMocks();
  });

  describe('Basic Accessibility Testing', () => {
    it('should pass accessibility test for accessible button', async () => {
      const { container } = render(<AccessibleButton />);
      
      const result = await tester.testAccessibility(container);
      
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(80);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect accessibility violations in inaccessible button', async () => {
      const { container } = render(<InaccessibleButton />);
      
      // Mock axe to return violations
      const { axe } = require('jest-axe');
      axe.mockResolvedValue({
        violations: [
          {
            id: 'button-name',
            impact: 'serious',
            description: 'Buttons must have discernible text',
            help: 'Button elements must have accessible text',
            helpUrl: 'https://example.com/help',
            tags: ['wcag2a'],
            nodes: [
              {
                element: container.querySelector('[data-testid="inaccessible-button"]'),
                target: ['[data-testid="inaccessible-button"]']
              }
            ]
          }
        ]
      });
      
      const result = await tester.testAccessibility(container);
      
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].ruleId).toBe('button-name');
      expect(result.violations[0].impact).toBe('serious');
    });

    it('should test accessible form', async () => {
      const { container } = render(<AccessibleForm />);
      
      const result = await tester.testAccessibility(container);
      
      expect(result.passed).toBe(true);
      expect(result.screenReader?.ariaLabels).toBeGreaterThan(0);
    });

    it('should detect form accessibility issues', async () => {
      const { container } = render(<InaccessibleForm />);
      
      const result = await tester.testAccessibility(container);
      
      // Should detect missing labels
      expect(result.screenReader?.issues.some(
        issue => issue.type === 'missing-label'
      )).toBe(true);
    });
  });

  describe('Keyboard Navigation Testing', () => {
    it('should test keyboard navigation for accessible elements', async () => {
      const { container } = render(
        <div>
          <button data-testid="button1">Button 1</button>
          <button data-testid="button2">Button 2</button>
          <a href="#" data-testid="link1">Link 1</a>
        </div>
      );
      
      const result = await tester.testAccessibility(container);
      
      expect(result.keyboardNavigation?.focusableElements).toBe(3);
      expect(result.keyboardNavigation?.tabbableElements).toBe(3);
      expect(result.keyboardNavigation?.passed).toBe(true);
    });

    it('should detect keyboard navigation issues', async () => {
      const { container } = render(
        <div>
          <div onClick={() => {}} data-testid="clickable-div">
            Clickable but not focusable
          </div>
          <button tabIndex={-1} data-testid="non-tabbable">
            Non-tabbable button
          </button>
        </div>
      );
      
      const result = await tester.testAccessibility(container);
      
      expect(result.keyboardNavigation?.issues.some(
        issue => issue.type === 'missing-focus'
      )).toBe(true);
    });

    it('should test focus trapping in modals', async () => {
      const { container } = render(<ModalComponent isOpen={true} />);
      
      const result = await tester.testAccessibility(container);
      
      expect(result.focusManagement?.focusTrapping).toBeDefined();
    });
  });

  describe('Screen Reader Testing', () => {
    it('should validate accessible page structure', async () => {
      const { container } = render(<AccessiblePage />);
      
      const result = await tester.testAccessibility(container);
      
      expect(result.screenReader?.landmarks).toBeGreaterThan(0);
      expect(result.screenReader?.headingStructure).toBe(true);
      expect(result.screenReader?.altTexts).toBeGreaterThan(0);
      expect(result.screenReader?.passed).toBe(true);
    });

    it('should detect screen reader issues', async () => {
      const { container } = render(<InaccessiblePage />);
      
      const result = await tester.testAccessibility(container);
      
      expect(result.screenReader?.issues.some(
        issue => issue.type === 'missing-landmark'
      )).toBe(true);
      
      expect(result.screenReader?.issues.some(
        issue => issue.type === 'missing-alt'
      )).toBe(true);
      
      expect(result.screenReader?.issues.some(
        issue => issue.type === 'heading-structure'
      )).toBe(true);
    });

    it('should count ARIA labels correctly', async () => {
      const { container } = render(
        <div>
          <button aria-label="Close">×</button>
          <input aria-labelledby="label1" />
          <div id="label1">Input label</div>
          <div aria-describedby="desc1">Content</div>
          <div id="desc1">Description</div>
        </div>
      );
      
      const result = await tester.testAccessibility(container);
      
      expect(result.screenReader?.ariaLabels).toBeGreaterThan(0);
    });
  });

  describe('Color Contrast Testing', () => {
    it('should pass color contrast test for sufficient contrast', async () => {
      const { container } = render(
        <ColorContrastComponent 
          textColor="#000000" 
          backgroundColor="#ffffff" 
        />
      );
      
      const result = await tester.testAccessibility(container);
      
      expect(result.colorContrast?.passed).toBe(true);
      expect(result.colorContrast?.failedChecks).toBe(0);
    });

    it('should detect insufficient color contrast', async () => {
      const { container } = render(
        <ColorContrastComponent 
          textColor="#cccccc" 
          backgroundColor="#ffffff" 
        />
      );
      
      const result = await tester.testAccessibility(container);
      
      expect(result.colorContrast?.failedChecks).toBeGreaterThan(0);
      expect(result.colorContrast?.issues.length).toBeGreaterThan(0);
    });

    it('should handle large text contrast requirements', async () => {
      const { container } = render(
        <ColorContrastComponent 
          textColor="#767676" 
          backgroundColor="#ffffff"
          fontSize="18px"
          fontWeight="bold"
        />
      );
      
      const result = await tester.testAccessibility(container);
      
      // Large text has lower contrast requirements
      expect(result.colorContrast?.issues[0]?.size).toBe('large');
    });
  });

  describe('Focus Management Testing', () => {
    it('should test focus indicators', async () => {
      const { container } = render(
        <div>
          <button style={{ outline: '2px solid blue' }}>
            Button with focus indicator
          </button>
          <a href="#" style={{ outline: 'none' }}>
            Link without focus indicator
          </a>
        </div>
      );
      
      const result = await tester.testAccessibility(container);
      
      expect(result.focusManagement?.focusIndicators).toBeDefined();
    });

    it('should test focus order', async () => {
      const { container } = render(
        <div>
          <button tabIndex={3}>Third</button>
          <button tabIndex={1}>First</button>
          <button tabIndex={2}>Second</button>
        </div>
      );
      
      const result = await tester.testAccessibility(container);
      
      expect(result.focusManagement?.focusOrder).toBeDefined();
    });
  });

  describe('Custom Rules', () => {
    it('should execute custom accessibility rules', async () => {
      tester.addRule({
        id: 'custom-test-rule',
        name: 'Custom Test Rule',
        description: 'Test custom rule execution',
        impact: 'moderate',
        tags: ['custom'],
        check: (container) => [
          {
            ruleId: 'custom-test-rule',
            impact: 'moderate',
            message: 'Custom rule violation',
            element: container,
            selector: 'div',
            help: 'Fix custom issue',
            suggestion: 'Apply custom fix',
            wcagCriteria: ['custom']
          }
        ]
      });

      const { container } = render(<div>Test content</div>);
      
      const result = await tester.testAccessibility(container);
      
      expect(result.violations.some(v => v.ruleId === 'custom-test-rule')).toBe(true);
    });

    it('should handle custom rule errors gracefully', async () => {
      tester.addRule({
        id: 'error-rule',
        name: 'Error Rule',
        description: 'Rule that throws error',
        impact: 'serious',
        tags: ['error'],
        check: (container) => {
          throw new Error('Custom rule error');
        }
      });

      const { container } = render(<div>Test content</div>);
      
      // Should not throw, should handle error gracefully
      const result = await tester.testAccessibility(container);
      
      expect(result).toBeDefined();
    });

    it('should allow rule management', () => {
      const rule = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'Test rule',
        impact: 'minor' as const,
        tags: ['test'],
        check: () => []
      };

      tester.addRule(rule);
      expect(tester.getRules().some(r => r.id === 'test-rule')).toBe(true);

      const removed = tester.removeRule('test-rule');
      expect(removed).toBe(true);
      expect(tester.getRules().some(r => r.id === 'test-rule')).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should respect WCAG level configuration', async () => {
      const aaaTester = createAccessibilityTester({ wcagLevel: 'AAA' });
      const { container } = render(<AccessibleButton />);
      
      const result = await aaaTester.testAccessibility(container);
      
      expect(result.summary.wcagLevel).toBe('AAA');
      
      aaaTester.cleanup();
    });

    it('should allow disabling specific tests', async () => {
      const limitedTester = createAccessibilityTester({
        keyboardNavigation: false,
        screenReaderTesting: false,
        colorContrastTesting: false,
        focusManagement: false
      });
      
      const { container } = render(<AccessibleButton />);
      
      const result = await limitedTester.testAccessibility(container);
      
      expect(result.keyboardNavigation).toBeUndefined();
      expect(result.screenReader).toBeUndefined();
      expect(result.colorContrast).toBeUndefined();
      expect(result.focusManagement).toBeUndefined();
      
      limitedTester.cleanup();
    });

    it('should allow configuration updates', () => {
      tester.updateConfig({
        wcagLevel: 'AAA',
        includeRules: ['color-contrast', 'keyboard']
      });

      const config = tester.getConfig();
      expect(config.wcagLevel).toBe('AAA');
      expect(config.includeRules).toContain('color-contrast');
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive accessibility report', async () => {
      const { container } = render(<InaccessibleButton />);
      
      // Mock violations for report
      const { axe } = require('jest-axe');
      axe.mockResolvedValue({
        violations: [
          {
            id: 'button-name',
            impact: 'serious',
            description: 'Buttons must have discernible text',
            help: 'Button elements must have accessible text',
            helpUrl: 'https://example.com/help',
            tags: ['wcag2a'],
            nodes: [
              {
                element: container.querySelector('[data-testid="inaccessible-button"]'),
                target: ['[data-testid="inaccessible-button"]']
              }
            ]
          }
        ]
      });
      
      const result = await tester.testAccessibility(container);
      const report = tester.generateReport(result);
      
      expect(report).toContain('# Accessibility Test Report');
      expect(report).toContain('Overall Score:');
      expect(report).toContain('WCAG Level:');
      expect(report).toContain('## Summary');
      expect(report).toContain('## Violations');
      expect(report).toContain('button-name');
    });

    it('should generate report for passing tests', async () => {
      const { container } = render(<AccessibleButton />);
      
      const result = await tester.testAccessibility(container);
      const report = tester.generateReport(result);
      
      expect(report).toContain('# Accessibility Test Report');
      expect(report).toContain('PASSED');
      expect(report).not.toContain('## Violations');
    });
  });

  describe('Built-in Custom Rules', () => {
    it('should test form validation accessibility', async () => {
      const { container } = render(
        <form>
          <input type="text" required />
          <button type="submit">Submit</button>
        </form>
      );
      
      const result = await tester.testAccessibility(container);
      
      // Should detect missing validation attributes
      expect(result.violations.some(v => v.ruleId === 'form-validation')).toBe(true);
    });

    it('should test interactive elements accessibility', async () => {
      const { container } = render(
        <div onClick={() => {}}>Clickable div without role</div>
      );
      
      const result = await tester.testAccessibility(container);
      
      // Should detect missing role for interactive element
      expect(result.violations.some(v => v.ruleId === 'interactive-elements')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty containers', async () => {
      const { container } = render(<div></div>);
      
      const result = await tester.testAccessibility(container);
      
      expect(result).toBeDefined();
      expect(result.summary.totalElements).toBeGreaterThanOrEqual(0);
    });

    it('should handle containers with only text', async () => {
      const { container } = render(<div>Just some text</div>);
      
      const result = await tester.testAccessibility(container);
      
      expect(result).toBeDefined();
      expect(result.passed).toBe(true);
    });

    it('should handle deeply nested structures', async () => {
      const { container } = render(
        <div>
          <div>
            <div>
              <div>
                <button>Deep button</button>
              </div>
            </div>
          </div>
        </div>
      );
      
      const result = await tester.testAccessibility(container);
      
      expect(result).toBeDefined();
      expect(result.keyboardNavigation?.focusableElements).toBe(1);
    });
  });
});