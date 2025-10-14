/**
 * Component Test Framework
 *
 * Comprehensive testing framework for React components including
 * rendering tests, interaction simulation, style regression testing,
 * and accessibility validation.
 */
import { QueryClient } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor, within, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';
// Mock theme provider for testing
const MockThemeProvider: React.FC<{ children: React.ReactNode; attribute?: string; defaultTheme?: string }> = ({ children }) => <React.Fragment>{children}</React.Fragment>;

// Mock query client provider for testing
const MockQueryClientProvider: React.FC<{ children: React.ReactNode; client: any }> = ({ children }) => <React.Fragment>{children}</React.Fragment>;

// Extend Jest matchers
expect.extend(toHaveNoViolations);

export interface ComponentTestConfig {
  theme?: 'light' | 'dark' | 'system';
  viewport?: ViewportSize;
  mockData?: Record<string, any>;
  providers?: React.ComponentType<any>[];
  accessibility?: AccessibilityConfig;
  performance?: PerformanceConfig;
  styles?: StyleTestConfig;
}

export interface ViewportSize {
  width: number;
  height: number;
  devicePixelRatio?: number;
}

export interface AccessibilityConfig {
  enabled: boolean;
  rules?: string[];
  tags?: string[];
  skipRules?: string[];
}

export interface PerformanceConfig {
  enabled: boolean;
  renderTimeThreshold?: number;
  memoryThreshold?: number;
  reRenderLimit?: number;
}

export interface StyleTestConfig {
  enabled: boolean;
  snapshotStyles?: boolean;
  checkResponsive?: boolean;
  breakpoints?: number[];
}

export interface ComponentTestResult {
  renderTime: number;
  memoryUsage: number;
  reRenderCount: number;
  accessibilityViolations: any[];
  styleSnapshot?: string;
  interactions: InteractionResult[];
}

export interface InteractionResult {
  action: string;
  element: string;
  success: boolean;
  duration: number;
  error?: string;
}

export interface ComponentTestSuite {
  name: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
  variants?: ComponentVariant[];
  interactions?: ComponentInteraction[];
  config?: ComponentTestConfig;
}

export interface ComponentVariant {
  name: string;
  props: Record<string, any>;
  description?: string;
}

export interface ComponentInteraction {
  name: string;
  action: (user: any, container: HTMLElement) => Promise<void>;
  assertions: (container: HTMLElement) => Promise<void>;
  timeout?: number;
}

export class ComponentTestFramework {
  private config: ComponentTestConfig;
  private queryClient: QueryClient;
  private performanceObserver?: PerformanceObserver;
  private renderCount: number = 0;

  constructor(config: ComponentTestConfig = {}) {
    this.config = {
      theme: 'light',
      viewport: { width: 1024, height: 768 },
      accessibility: { enabled: true },
      performance: { enabled: true, renderTimeThreshold: 100 },
      styles: { enabled: true },
      ...config,
    };

    this.queryClient = {
      clear: jest.fn(),
      // Mock query client for testing
    };

    this.setupViewport();
    this.setupPerformanceMonitoring();
  }

  /**
   * Render component with all necessary providers and wrappers
   */
  renderComponent(
    component: React.ReactElement,
    options: ComponentTestConfig = {},
  ) {
    const mergedConfig = { ...this.config, ...options };
    this.renderCount = 0;

    const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      this.renderCount++;

      let wrappedChildren = children;

      // Wrap with theme provider
      if (mergedConfig.theme) {
        wrappedChildren = (
          <MockThemeProvider attribute="class" defaultTheme={mergedConfig.theme}>
            {wrappedChildren}
          </MockThemeProvider>
        );
      }

      // Wrap with query client
      wrappedChildren = (
        <MockQueryClientProvider client={this.queryClient}>
          {wrappedChildren}
        </MockQueryClientProvider>
      );

      // Wrap with custom providers
      if (mergedConfig.providers) {
        mergedConfig.providers.forEach(Provider => {
          wrappedChildren = <Provider>{wrappedChildren}</Provider>;
        });
      }

      return <React.Fragment>{wrappedChildren}</React.Fragment>;
    };

    const startTime = performance.now();
    const result = render(component, {
      wrapper: AllProviders,
      ...options,
    });
    const renderTime = performance.now() - startTime;

    return {
      ...result,
      renderTime,
      renderCount: this.renderCount,
    };
  }

  /**
   * Run comprehensive component test suite
   */
  async runTestSuite(suite: ComponentTestSuite): Promise<ComponentTestResult> {
    const startTime = performance.now();
    const memoryBefore = this.getMemoryUsage();

    // Render base component
    const { container, renderTime } = this.renderComponent(
      React.createElement(suite.component, suite.props || {}),
    );

    const result: ComponentTestResult = {
      renderTime,
      memoryUsage: 0,
      reRenderCount: this.renderCount,
      accessibilityViolations: [],
      interactions: [],
    };

    try {
      // Test component variants
      if (suite.variants) {
        for (const variant of suite.variants) {
          await this.testVariant(suite.component, variant, suite.config);
        }
      }

      // Run accessibility tests
      if (this.config.accessibility?.enabled) {
        result.accessibilityViolations = await this.testAccessibility(container);
      }

      // Run style tests
      if (this.config.styles?.enabled) {
        result.styleSnapshot = await this.testStyles(container);
      }

      // Run interaction tests
      if (suite.interactions) {
        for (const interaction of suite.interactions) {
          const interactionResult = await this.testInteraction(
            container,
            interaction,
          );
          result.interactions.push(interactionResult);
        }
      }

      // Calculate memory usage
      const memoryAfter = this.getMemoryUsage();
      result.memoryUsage = memoryAfter - memoryBefore;

      return result;
    } catch (error) {
      throw new Error(`Component test suite failed: ${error}`);
    }
  }

  /**
   * Test component variant
   */
  private async testVariant(
    Component: React.ComponentType<any>,
    variant: ComponentVariant,
    config?: ComponentTestConfig,
  ): Promise<void> {
    const { container } = this.renderComponent(
      React.createElement(Component, variant.props),
      config,
    );

    // Basic rendering test
    expect(container.firstChild).toBeInTheDocument();

    // Accessibility test for variant
    if (this.config.accessibility?.enabled) {
      const violations = await this.testAccessibility(container);
      expect(violations).toHaveLength(0);
    }
  }

  /**
   * Test component accessibility
   */
  async testAccessibility(container: HTMLElement): Promise<any[]> {
    const config = this.config.accessibility;
    if (!config?.enabled) return [];

    const axeConfig = {
      rules: config.rules ? this.buildRulesConfig(config.rules) : undefined,
      tags: config.tags,
      exclude: config.skipRules,
    };

    const results = await axe(container, axeConfig);
    return results.violations;
  }

  /**
   * Test component styles and responsive behavior
   */
  async testStyles(container: HTMLElement): Promise<string> {
    const config = this.config.styles;
    if (!config?.enabled) return '';

    let styleSnapshot = '';

    // Capture base styles
    if (config.snapshotStyles) {
      styleSnapshot = this.captureStyleSnapshot(container);
    }

    // Test responsive behavior
    if (config.checkResponsive && config.breakpoints) {
      for (const breakpoint of config.breakpoints) {
        await this.testResponsiveBreakpoint(container, breakpoint);
      }
    }

    return styleSnapshot;
  }

  /**
   * Test component interaction
   */
  async testInteraction(
    container: HTMLElement,
    interaction: ComponentInteraction,
  ): Promise<InteractionResult> {
    const user = userEvent.setup();
    const startTime = performance.now();

    try {
      // Execute interaction
      await interaction.action(user, container);

      // Run assertions
      await interaction.assertions(container);

      const duration = performance.now() - startTime;
      return {
        action: interaction.name,
        element: container.tagName,
        success: true,
        duration,
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        action: interaction.name,
        element: container.tagName,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Test responsive breakpoint
   */
  private async testResponsiveBreakpoint(
    container: HTMLElement,
    breakpoint: number,
  ): Promise<void> {
    // Simulate viewport resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: breakpoint,
    });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));

    // Wait for any responsive changes
    await waitFor(() => {
      // Component should still be rendered
      expect(container.firstChild).toBeInTheDocument();
    });
  }

  /**
   * Capture style snapshot for regression testing
   */
  private captureStyleSnapshot(container: HTMLElement): string {
    const elements = container.querySelectorAll('*');
    const styles: string[] = [];

    elements.forEach(element => {
      const computedStyle = window.getComputedStyle(element);
      const relevantStyles = [
        'display', 'position', 'width', 'height', 'margin', 'padding',
        'color', 'background-color', 'font-size', 'font-weight',
      ];

      const elementStyles = relevantStyles
        .map(prop => `${prop}: ${computedStyle.getPropertyValue(prop)}`)
        .join('; ');

      styles.push(`${element.tagName.toLowerCase()}: ${elementStyles}`);
    });

    return styles.join('\n');
  }

  /**
   * Build accessibility rules configuration
   */
  private buildRulesConfig(rules: string[]): Record<string, { enabled: boolean }> {
    const config: Record<string, { enabled: boolean }> = {};
    rules.forEach(rule => {
      config[rule] = { enabled: true };
    });
    return config;
  }

  /**
   * Setup viewport for testing
   */
  private setupViewport(): void {
    const { width, height, devicePixelRatio = 1 } = this.config.viewport!;

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });

    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      configurable: true,
      value: devicePixelRatio,
    });
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    if (!this.config.performance?.enabled) return;

    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'measure' && entry.name.includes('React')) {
            const threshold = this.config.performance?.renderTimeThreshold || 100;
            if (entry.duration > threshold) {
              console.warn(`Slow render detected: ${entry.name} took ${entry.duration}ms`);
            }
          }
        });
      });

      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
    }
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Create test utilities for common patterns
   */
  createTestUtils() {
    return {
      // Find elements by test ID
      findByTestId: (testId: string) => screen.findByTestId(testId),
      getByTestId: (testId: string) => screen.getByTestId(testId),
      queryByTestId: (testId: string) => screen.queryByTestId(testId),

      // Find elements by role
      findByRole: (role: string, options?: any) => screen.findByRole(role, options),
      getByRole: (role: string, options?: any) => screen.getByRole(role, options),
      queryByRole: (role: string, options?: any) => screen.queryByRole(role, options),

      // User interactions
      click: async (element: HTMLElement) => {
        const user = userEvent.setup();
        await user.click(element);
      },

      type: async (element: HTMLElement, text: string) => {
        const user = userEvent.setup();
        await user.type(element, text);
      },

      hover: async (element: HTMLElement) => {
        const user = userEvent.setup();
        await user.hover(element);
      },

      // Wait utilities
      waitForElement: (callback: () => HTMLElement) => waitFor(callback),
      waitForElementToBeRemoved: (element: HTMLElement) =>
        waitFor(() => expect(element).not.toBeInTheDocument()),

      // Accessibility utilities
      expectAccessible: async (container: HTMLElement) => {
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      },

      // Style utilities
      expectVisible: (element: HTMLElement) => {
        expect(element).toBeVisible();
      },

      expectHidden: (element: HTMLElement) => {
        expect(element).not.toBeVisible();
      },

      // Performance utilities
      measureRenderTime: async (renderFn: () => void) => {
        const start = performance.now();
        renderFn();
        await waitFor(() => {});
        return performance.now() - start;
      },
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    this.queryClient.clear();
  }
}

/**
 * Create component test framework instance
 */
export function createComponentTestFramework(config?: ComponentTestConfig): ComponentTestFramework {
  return new ComponentTestFramework(config);
}

/**
 * Higher-order function for component testing
 */
export function withComponentTest<P extends object>(
  Component: React.ComponentType<P>,
  config?: ComponentTestConfig,
) {
  return (props: P) => {
    const framework = createComponentTestFramework(config);
    return framework.renderComponent(<Component {...props} />);
  };
}

/**
 * Test suite builder for components
 */
export class ComponentTestSuiteBuilder {
  private suite: Partial<ComponentTestSuite> = {};

  component(component: React.ComponentType<any>): this {
    this.suite.component = component;
    return this;
  }

  name(name: string): this {
    this.suite.name = name;
    return this;
  }

  props(props: Record<string, any>): this {
    this.suite.props = props;
    return this;
  }

  variant(name: string, props: Record<string, any>, description?: string): this {
    if (!this.suite.variants) this.suite.variants = [];
    this.suite.variants.push({ name, props, description });
    return this;
  }

  interaction(
    name: string,
    action: ComponentInteraction['action'],
    assertions: ComponentInteraction['assertions'],
    timeout?: number,
  ): this {
    if (!this.suite.interactions) this.suite.interactions = [];
    this.suite.interactions.push({ name, action, assertions, timeout });
    return this;
  }

  config(config: ComponentTestConfig): this {
    this.suite.config = config;
    return this;
  }

  build(): ComponentTestSuite {
    if (!this.suite.component || !this.suite.name) {
      throw new Error('Component and name are required for test suite');
    }
    return this.suite as ComponentTestSuite;
  }
}

/**
 * Create component test suite builder
 */
export function createTestSuite(): ComponentTestSuiteBuilder {
  return new ComponentTestSuiteBuilder();
}
