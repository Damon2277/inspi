/**
 * Component Test Framework Tests
 *
 * Tests for the comprehensive UI component testing framework
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import {
  ComponentTestFramework,
  createComponentTestFramework,
  createTestSuite,
  ComponentTestSuite,
} from '../../../../lib/testing/ui/ComponentTestFramework';

// Mock components for testing
const SimpleButton: React.FC<{ onClick?: () => void; children: React.ReactNode; disabled?: boolean }> = ({
  onClick,
  children,
  disabled = false,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    data-testid="simple-button"
    className="btn btn-primary"
  >
    {children}
  </button>
);

const ComplexForm: React.FC<{ onSubmit?: (data: any) => void }> = ({ onSubmit }) => {
  const [formData, setFormData] = React.useState({ name: '', email: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit && onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} data-testid="complex-form">
      <div>
        <label htmlFor="name">Name:</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          data-testid="name-input"
        />
      </div>
      <div>
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          data-testid="email-input"
        />
      </div>
      <button type="submit" data-testid="submit-button">
        Submit
      </button>
    </form>
  );
};

const ThemeAwareComponent: React.FC<{ theme?: 'light' | 'dark' }> = ({ theme = 'light' }) => (
  <div
    className={`theme-component theme-${theme}`}
    data-testid="theme-component"
    style={{
      backgroundColor: theme === 'light' ? '#ffffff' : '#000000',
      color: theme === 'light' ? '#000000' : '#ffffff',
      padding: '16px',
    }}
  >
    <h1>Theme: {theme}</h1>
    <p>This component adapts to different themes</p>
  </div>
);

describe('ComponentTestFramework', () => {
  let framework: ComponentTestFramework;

  beforeEach(() => {
    framework = createComponentTestFramework({
      theme: 'light',
      viewport: { width: 1024, height: 768 },
      accessibility: { enabled: true },
      performance: { enabled: true },
      styles: { enabled: true },
    });
  });

  afterEach(() => {
    framework.cleanup();
  });

  describe('Component Rendering', () => {
    it('should render component with providers', () => {
      const { container } = framework.renderComponent(<SimpleButton>Click me</SimpleButton>);

      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByTestId('simple-button')).toBeInTheDocument();
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should track render time and count', () => {
      const result = framework.renderComponent(<SimpleButton>Test</SimpleButton>);

      expect(result.renderTime).toBeGreaterThan(0);
      expect(result.renderCount).toBe(1);
    });

    it('should handle component with props', () => {
      const mockClick = jest.fn();
      framework.renderComponent(
        <SimpleButton onClick={mockClick} disabled={true}>
          Disabled Button
        </SimpleButton>,
      );

      const button = screen.getByTestId('simple-button');
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Disabled Button');
    });
  });

  describe('Test Suite Execution', () => {
    it('should run basic test suite', async () => {
      const suite: ComponentTestSuite = {
        name: 'Simple Button Test',
        component: SimpleButton,
        props: { children: 'Test Button' },
      };

      const result = await framework.runTestSuite(suite);

      expect(result.renderTime).toBeGreaterThan(0);
      expect(result.reRenderCount).toBeGreaterThan(0);
      expect(result.accessibilityViolations).toBeDefined();
    });

    it('should test component variants', async () => {
      const suite: ComponentTestSuite = {
        name: 'Button Variants',
        component: SimpleButton,
        props: { children: 'Default' },
        variants: [
          { name: 'Disabled', props: { children: 'Disabled', disabled: true } },
          { name: 'With Click', props: { children: 'Clickable', onClick: jest.fn() } },
        ],
      };

      const result = await framework.runTestSuite(suite);

      expect(result.renderTime).toBeGreaterThan(0);
      expect(result.accessibilityViolations).toBeDefined();
    });

    it('should run interaction tests', async () => {
      const mockClick = jest.fn();
      const suite: ComponentTestSuite = {
        name: 'Button Interactions',
        component: SimpleButton,
        props: { children: 'Click me', onClick: mockClick },
        interactions: [
          {
            name: 'Click Button',
            action: async (user, container) => {
              const button = container.querySelector('[data-testid="simple-button"]') as HTMLElement;
              await user.click(button);
            },
            assertions: async (container) => {
              expect(mockClick).toHaveBeenCalledTimes(1);
            },
          },
        ],
      };

      const result = await framework.runTestSuite(suite);

      expect(result.interactions).toHaveLength(1);
      expect(result.interactions[0].success).toBe(true);
    });

    it('should handle complex form interactions', async () => {
      const mockSubmit = jest.fn();
      const suite: ComponentTestSuite = {
        name: 'Form Test',
        component: ComplexForm,
        props: { onSubmit: mockSubmit },
        interactions: [
          {
            name: 'Fill and Submit Form',
            action: async (user, container) => {
              const nameInput = container.querySelector('[data-testid="name-input"]') as HTMLElement;
              const emailInput = container.querySelector('[data-testid="email-input"]') as HTMLElement;
              const submitButton = container.querySelector('[data-testid="submit-button"]') as HTMLElement;

              await user.type(nameInput, 'John Doe');
              await user.type(emailInput, 'john@example.com');
              await user.click(submitButton);
            },
            assertions: async (container) => {
              expect(mockSubmit).toHaveBeenCalledWith({
                name: 'John Doe',
                email: 'john@example.com',
              });
            },
          },
        ],
      };

      const result = await framework.runTestSuite(suite);

      expect(result.interactions).toHaveLength(1);
      expect(result.interactions[0].success).toBe(true);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track memory usage', async () => {
      const suite: ComponentTestSuite = {
        name: 'Performance Test',
        component: ComplexForm,
        config: {
          performance: {
            enabled: true,
            renderTimeThreshold: 50,
            memoryThreshold: 1000000,
          },
        },
      };

      const result = await framework.runTestSuite(suite);

      expect(result.memoryUsage).toBeGreaterThanOrEqual(0);
    });

    it('should detect slow renders', async () => {
      const SlowComponent: React.FC = () => {
        // Simulate slow rendering
        const start = Date.now();
        while (Date.now() - start < 100) {
          // Busy wait
        }
        return <div>Slow component</div>;
      };

      const suite: ComponentTestSuite = {
        name: 'Slow Component',
        component: SlowComponent,
        config: {
          performance: {
            enabled: true,
            renderTimeThreshold: 50,
          },
        },
      };

      const result = await framework.runTestSuite(suite);

      expect(result.renderTime).toBeGreaterThan(50);
    });
  });

  describe('Theme Testing', () => {
    it('should test different themes', async () => {
      const lightSuite: ComponentTestSuite = {
        name: 'Light Theme',
        component: ThemeAwareComponent,
        props: { theme: 'light' },
        config: { theme: 'light' },
      };

      const darkSuite: ComponentTestSuite = {
        name: 'Dark Theme',
        component: ThemeAwareComponent,
        props: { theme: 'dark' },
        config: { theme: 'dark' },
      };

      const lightResult = await framework.runTestSuite(lightSuite);
      const darkResult = await framework.runTestSuite(darkSuite);

      expect(lightResult.renderTime).toBeGreaterThan(0);
      expect(darkResult.renderTime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle component render errors', async () => {
      const ErrorComponent: React.FC = () => {
        throw new Error('Component error');
      };

      const suite: ComponentTestSuite = {
        name: 'Error Component',
        component: ErrorComponent,
      };

      await expect(framework.runTestSuite(suite)).rejects.toThrow();
    });

    it('should handle interaction errors', async () => {
      const suite: ComponentTestSuite = {
        name: 'Error Interaction',
        component: SimpleButton,
        props: { children: 'Button' },
        interactions: [
          {
            name: 'Failing Interaction',
            action: async (user, container) => {
              throw new Error('Interaction failed');
            },
            assertions: async (container) => {
              // This should not be reached
            },
          },
        ],
      };

      const result = await framework.runTestSuite(suite);

      expect(result.interactions).toHaveLength(1);
      expect(result.interactions[0].success).toBe(false);
      expect(result.interactions[0].error).toContain('Interaction failed');
    });
  });

  describe('Test Utilities', () => {
    it('should provide useful test utilities', () => {
      const utils = framework.createTestUtils();

      expect(utils.findByTestId).toBeDefined();
      expect(utils.getByTestId).toBeDefined();
      expect(utils.queryByTestId).toBeDefined();
      expect(utils.click).toBeDefined();
      expect(utils.type).toBeDefined();
      expect(utils.hover).toBeDefined();
      expect(utils.waitForElement).toBeDefined();
      expect(utils.expectAccessible).toBeDefined();
      expect(utils.measureRenderTime).toBeDefined();
    });

    it('should measure render time with utility', async () => {
      const utils = framework.createTestUtils();

      const renderTime = await utils.measureRenderTime(() => {
        render(<SimpleButton>Test</SimpleButton>);
      });

      expect(renderTime).toBeGreaterThan(0);
    });
  });
});

describe('ComponentTestSuiteBuilder', () => {
  it('should build test suite with fluent API', () => {
    const mockClick = jest.fn();

    const suite = createTestSuite()
      .component(SimpleButton)
      .name('Button Test Suite')
      .props({ children: 'Test Button', onClick: mockClick })
      .variant('Disabled', { children: 'Disabled', disabled: true })
      .variant('Active', { children: 'Active', onClick: mockClick })
      .interaction(
        'Click Test',
        async (user, container) => {
          const button = container.querySelector('button') as HTMLElement;
          await user.click(button);
        },
        async (container) => {
          expect(mockClick).toHaveBeenCalled();
        },
      )
      .config({
        accessibility: { enabled: true },
        performance: { enabled: true },
      })
      .build();

    expect(suite.name).toBe('Button Test Suite');
    expect(suite.component).toBe(SimpleButton);
    expect(suite.props).toEqual({ children: 'Test Button', onClick: mockClick });
    expect(suite.variants).toHaveLength(2);
    expect(suite.interactions).toHaveLength(1);
    expect(suite.config?.accessibility?.enabled).toBe(true);
  });

  it('should require component and name', () => {
    expect(() => {
      createTestSuite().build();
    }).toThrow('Component and name are required for test suite');
  });

  it('should allow minimal configuration', () => {
    const suite = createTestSuite()
      .component(SimpleButton)
      .name('Minimal Suite')
      .build();

    expect(suite.name).toBe('Minimal Suite');
    expect(suite.component).toBe(SimpleButton);
    expect(suite.props).toBeUndefined();
    expect(suite.variants).toBeUndefined();
    expect(suite.interactions).toBeUndefined();
  });
});

describe('Integration Tests', () => {
  it('should work with real React components', async () => {
    const framework = createComponentTestFramework();

    const Counter: React.FC = () => {
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

    const suite: ComponentTestSuite = {
      name: 'Counter Component',
      component: Counter,
      interactions: [
        {
          name: 'Increment Counter',
          action: async (user, container) => {
            const button = container.querySelector('[data-testid="increment"]') as HTMLElement;
            await user.click(button);
            await user.click(button);
            await user.click(button);
          },
          assertions: async (container) => {
            const count = container.querySelector('[data-testid="count"]');
            expect(count).toHaveTextContent('3');
          },
        },
      ],
    };

    const result = await framework.runTestSuite(suite);

    expect(result.interactions[0].success).toBe(true);

    framework.cleanup();
  });

  it('should handle async components', async () => {
    const framework = createComponentTestFramework();

    const AsyncComponent: React.FC = () => {
      const [data, setData] = React.useState<string | null>(null);

      React.useEffect(() => {
        setTimeout(() => setData('Loaded'), 100);
      }, []);

      return (
        <div data-testid="async-component">
          {data ? data : 'Loading...'}
        </div>
      );
    };

    const suite: ComponentTestSuite = {
      name: 'Async Component',
      component: AsyncComponent,
      interactions: [
        {
          name: 'Wait for Data',
          action: async (user, container) => {
            await waitFor(() => {
              expect(container.querySelector('[data-testid="async-component"]'))
                .toHaveTextContent('Loaded');
            }, { timeout: 200 });
          },
          assertions: async (container) => {
            const component = container.querySelector('[data-testid="async-component"]');
            expect(component).toHaveTextContent('Loaded');
          },
        },
      ],
    };

    const result = await framework.runTestSuite(suite);

    expect(result.interactions[0].success).toBe(true);

    framework.cleanup();
  });
});
