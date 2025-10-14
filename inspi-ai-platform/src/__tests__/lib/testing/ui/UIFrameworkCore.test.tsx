/**
 * UI Testing Framework Core Tests
 *
 * Basic tests for the core UI testing framework functionality
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import {
  ComponentTestFramework,
  createComponentTestFramework,
  AccessibilityTester,
  createAccessibilityTester,
} from '../../../../lib/testing/ui/ComponentTestFramework';

// Mock jest-axe
jest.mock('jest-axe', () => ({
  axe: jest.fn().mockResolvedValue({ violations: [] }),
  toHaveNoViolations: {},
}));

// Simple test components
const SimpleButton = ({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} data-testid="simple-button">
    {children}
  </button>
);

const AccessibleButton = ({ onClick }: { onClick?: () => void }) => (
  <button
    onClick={onClick}
    data-testid="accessible-button"
    aria-label="Accessible test button"
  >
    Click me
  </button>
);

describe('UI Testing Framework - Core Tests', () => {
  describe('ComponentTestFramework', () => {
    let framework: ComponentTestFramework;

    beforeEach(() => {
      framework = createComponentTestFramework({
        theme: 'light',
        viewport: { width: 1024, height: 768 },
        accessibility: { enabled: false }, // Disable for basic tests
        performance: { enabled: true },
        styles: { enabled: false },
      });
    });

    afterEach(() => {
      framework.cleanup();
    });

    it('should render component successfully', () => {
      const { container } = framework.renderComponent(
        <SimpleButton>Test Button</SimpleButton>,
      );

      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByTestId('simple-button')).toBeInTheDocument();
      expect(screen.getByText('Test Button')).toBeInTheDocument();
    });

    it('should track render performance', () => {
      const result = framework.renderComponent(
        <SimpleButton>Performance Test</SimpleButton>,
      );

      expect(result.renderTime).toBeGreaterThan(0);
      expect(result.renderCount).toBe(1);
    });

    it('should handle component with props', () => {
      const mockClick = jest.fn();
      framework.renderComponent(
        <SimpleButton onClick={mockClick}>Clickable Button</SimpleButton>,
      );

      const button = screen.getByTestId('simple-button');
      expect(button).toHaveTextContent('Clickable Button');
    });

    it('should provide test utilities', () => {
      const utils = framework.createTestUtils();

      expect(utils.findByTestId).toBeDefined();
      expect(utils.getByTestId).toBeDefined();
      expect(utils.click).toBeDefined();
      expect(utils.type).toBeDefined();
      expect(utils.measureRenderTime).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should work with real React components', async () => {
      const Counter = () => {
        const [count, setCount] = React.useState(0);

        return (
          <div data-testid="counter">
            <span data-testid="count">{count}</span>
            <button
              data-testid="increment"
              onClick={() => setCount(c => c + 1)}
            >
              Increment
            </button>
          </div>
        );
      };

      const framework = createComponentTestFramework();
      const { container } = framework.renderComponent(<Counter />);

      expect(screen.getByTestId('counter')).toBeInTheDocument();
      expect(screen.getByTestId('count')).toHaveTextContent('0');

      const user = userEvent.setup();
      const button = screen.getByTestId('increment');

      await user.click(button);
      expect(screen.getByTestId('count')).toHaveTextContent('1');

      framework.cleanup();
    });

    it('should handle async components', async () => {
      const AsyncComponent = () => {
        const [data, setData] = React.useState<string | null>(null);

        React.useEffect(() => {
          setTimeout(() => setData('Loaded'), 50);
        }, []);

        return (
          <div data-testid="async-component">
            {data ? data : 'Loading...'}
          </div>
        );
      };

      const framework = createComponentTestFramework();
      framework.renderComponent(<AsyncComponent />);

      expect(screen.getByTestId('async-component')).toHaveTextContent('Loading...');

      // Wait for async update
      await screen.findByText('Loaded');
      expect(screen.getByTestId('async-component')).toHaveTextContent('Loaded');

      framework.cleanup();
    });
  });
});
