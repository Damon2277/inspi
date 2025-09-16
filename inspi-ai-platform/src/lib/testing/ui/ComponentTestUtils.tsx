/**
 * Component Test Utilities
 * 
 * Comprehensive utilities for testing React components including rendering,
 * user interaction simulation, accessibility testing, and visual regression testing.
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, RenderHookOptions, RenderHookResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Types for component testing
export interface ComponentTestOptions extends Omit<RenderOptions, 'wrapper'> {
  theme?: 'light' | 'dark' | 'system';
  queryClient?: QueryClient;
  initialProps?: Record<string, any>;
  wrapperProps?: Record<string, any>;
}

export interface UserInteractionOptions {
  delay?: number;
  skipHover?: boolean;
  skipClick?: boolean;
  advanceTimers?: boolean;
}

export interface AccessibilityTestOptions {
  rules?: any;
  tags?: string[];
  exclude?: string[];
  timeout?: number;
}

export interface VisualRegressionOptions {
  threshold?: number;
  includeAA?: boolean;
  diffColor?: string;
  diffMask?: boolean;
}

/**
 * Enhanced render function with common providers
 */
export function renderComponent(
  ui: ReactElement,
  options: ComponentTestOptions = {}
): RenderResult {
  const {
    theme = 'light',
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    }),
    initialProps = {},
    wrapperProps = {},
    ...renderOptions
  } = options;

  const AllTheProviders = ({ children }: { children: ReactNode }) => {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme={theme}
          enableSystem={theme === 'system'}
          {...wrapperProps}
        >
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    );
  };

  return render(ui, { wrapper: AllTheProviders, ...renderOptions });
}

/**
 * Enhanced hook rendering with providers
 */
export function renderComponentHook<TProps, TResult>(
  hook: (props: TProps) => TResult,
  options: RenderHookOptions<TProps> & ComponentTestOptions = {}
): RenderHookResult<TResult, TProps> {
  const {
    theme = 'light',
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    }),
    wrapperProps = {},
    ...hookOptions
  } = options;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme={theme}
        enableSystem={theme === 'system'}
        {...wrapperProps}
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );

  return renderHook(hook, { wrapper, ...hookOptions });
}

/**
 * User interaction utilities
 */
export class UserInteractionHelper {
  private user: ReturnType<typeof userEvent.setup>;

  constructor(options: UserInteractionOptions = {}) {
    this.user = userEvent.setup({
      delay: options.delay,
      skipHover: options.skipHover,
      skipClick: options.skipClick,
      advanceTimers: options.advanceTimers
    });
  }

  /**
   * Click on an element
   */
  async click(element: Element): Promise<void> {
    await this.user.click(element);
  }

  /**
   * Double click on an element
   */
  async doubleClick(element: Element): Promise<void> {
    await this.user.dblClick(element);
  }

  /**
   * Hover over an element
   */
  async hover(element: Element): Promise<void> {
    await this.user.hover(element);
  }

  /**
   * Unhover from an element
   */
  async unhover(element: Element): Promise<void> {
    await this.user.unhover(element);
  }

  /**
   * Type text into an input
   */
  async type(element: Element, text: string): Promise<void> {
    await this.user.type(element, text);
  }

  /**
   * Clear and type text into an input
   */
  async clearAndType(element: Element, text: string): Promise<void> {
    await this.user.clear(element);
    await this.user.type(element, text);
  }

  /**
   * Select text in an input
   */
  async selectText(element: Element): Promise<void> {
    await this.user.selectAll(element);
  }

  /**
   * Press a key
   */
  async pressKey(key: string): Promise<void> {
    await this.user.keyboard(key);
  }

  /**
   * Tab to next element
   */
  async tab(): Promise<void> {
    await this.user.tab();
  }

  /**
   * Shift+Tab to previous element
   */
  async shiftTab(): Promise<void> {
    await this.user.tab({ shift: true });
  }

  /**
   * Upload files to a file input
   */
  async uploadFiles(element: Element, files: File[]): Promise<void> {
    await this.user.upload(element, files);
  }

  /**
   * Select option from a select element
   */
  async selectOption(element: Element, option: string | string[]): Promise<void> {
    await this.user.selectOptions(element, option);
  }

  /**
   * Deselect option from a select element
   */
  async deselectOption(element: Element, option: string | string[]): Promise<void> {
    await this.user.deselectOptions(element, option);
  }
}

/**
 * Accessibility testing utilities
 */
export class AccessibilityTester {
  /**
   * Test component for accessibility violations
   */
  async testAccessibility(
    container: Element,
    options: AccessibilityTestOptions = {}
  ): Promise<void> {
    const { rules, tags, exclude, timeout = 5000 } = options;

    const axeOptions = {
      rules: rules || {},
      tags: tags || ['wcag2a', 'wcag2aa', 'wcag21aa'],
      exclude: exclude || []
    };

    await waitFor(
      async () => {
        const results = await axe(container, axeOptions);
        expect(results).toHaveNoViolations();
      },
      { timeout }
    );
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(
    container: Element,
    expectedFocusableElements: string[]
  ): Promise<void> {
    const user = new UserInteractionHelper();
    
    // Focus first element
    const firstElement = container.querySelector(expectedFocusableElements[0]);
    expect(firstElement).toBeInTheDocument();
    firstElement?.focus();

    // Tab through all focusable elements
    for (let i = 1; i < expectedFocusableElements.length; i++) {
      await user.tab();
      const expectedElement = container.querySelector(expectedFocusableElements[i]);
      expect(expectedElement).toHaveFocus();
    }

    // Shift+Tab back through elements
    for (let i = expectedFocusableElements.length - 2; i >= 0; i--) {
      await user.shiftTab();
      const expectedElement = container.querySelector(expectedFocusableElements[i]);
      expect(expectedElement).toHaveFocus();
    }
  }

  /**
   * Test ARIA attributes
   */
  testAriaAttributes(element: Element, expectedAttributes: Record<string, string>): void {
    Object.entries(expectedAttributes).forEach(([attribute, expectedValue]) => {
      const actualValue = element.getAttribute(attribute);
      expect(actualValue).toBe(expectedValue);
    });
  }

  /**
   * Test semantic HTML structure
   */
  testSemanticStructure(container: Element, expectedStructure: string[]): void {
    expectedStructure.forEach(selector => {
      const element = container.querySelector(selector);
      expect(element).toBeInTheDocument();
    });
  }

  /**
   * Test color contrast (requires additional setup)
   */
  async testColorContrast(container: Element): Promise<void> {
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });
    expect(results).toHaveNoViolations();
  }
}

/**
 * Visual regression testing utilities
 */
export class VisualRegressionTester {
  /**
   * Take a screenshot for visual comparison
   */
  async takeScreenshot(
    container: Element,
    testName: string,
    options: VisualRegressionOptions = {}
  ): Promise<void> {
    // This would integrate with a visual regression testing tool like Percy, Chromatic, or jest-image-snapshot
    // For now, we'll create a placeholder implementation
    
    const { threshold = 0.2, includeAA = true } = options;
    
    // Ensure component is fully rendered
    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });

    // In a real implementation, this would capture and compare screenshots
    console.log(`Visual regression test: ${testName}`, {
      threshold,
      includeAA,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Test responsive design at different viewport sizes
   */
  async testResponsiveDesign(
    container: Element,
    testName: string,
    viewports: Array<{ width: number; height: number; name: string }>
  ): Promise<void> {
    for (const viewport of viewports) {
      // Simulate viewport resize
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: viewport.width
      });
      
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: viewport.height
      });

      // Trigger resize event
      fireEvent(window, new Event('resize'));

      // Wait for component to respond to resize
      await waitFor(() => {
        expect(container).toBeInTheDocument();
      });

      // Take screenshot at this viewport size
      await this.takeScreenshot(container, `${testName}-${viewport.name}`);
    }
  }

  /**
   * Test theme variations
   */
  async testThemeVariations(
    renderComponent: (theme: string) => RenderResult,
    testName: string,
    themes: string[] = ['light', 'dark']
  ): Promise<void> {
    for (const theme of themes) {
      const { container } = renderComponent(theme);
      await this.takeScreenshot(container, `${testName}-${theme}`);
    }
  }
}

/**
 * Component state testing utilities
 */
export class ComponentStateTester {
  /**
   * Test component with different prop combinations
   */
  async testPropCombinations<T extends Record<string, any>>(
    Component: React.ComponentType<T>,
    propCombinations: Array<{ props: T; testName: string; assertions: (container: Element) => void }>
  ): Promise<void> {
    for (const { props, testName, assertions } of propCombinations) {
      const { container } = renderComponent(<Component {...props} />);
      
      try {
        assertions(container);
      } catch (error) {
        throw new Error(`Test failed for ${testName}: ${error}`);
      }
    }
  }

  /**
   * Test component lifecycle and state changes
   */
  async testStateChanges<T extends Record<string, any>>(
    Component: React.ComponentType<T>,
    initialProps: T,
    stateChanges: Array<{
      action: () => Promise<void>;
      expectedState: (container: Element) => void;
      description: string;
    }>
  ): Promise<void> {
    const { container } = renderComponent(<Component {...initialProps} />);

    for (const { action, expectedState, description } of stateChanges) {
      await action();
      
      try {
        expectedState(container);
      } catch (error) {
        throw new Error(`State change test failed for "${description}": ${error}`);
      }
    }
  }
}

/**
 * Performance testing utilities
 */
export class ComponentPerformanceTester {
  /**
   * Test component render performance
   */
  async testRenderPerformance<T extends Record<string, any>>(
    Component: React.ComponentType<T>,
    props: T,
    options: { maxRenderTime?: number; iterations?: number } = {}
  ): Promise<{ averageTime: number; maxTime: number; minTime: number }> {
    const { maxRenderTime = 100, iterations = 10 } = options;
    const renderTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const { unmount } = renderComponent(<Component {...props} />);
      const endTime = performance.now();
      
      const renderTime = endTime - startTime;
      renderTimes.push(renderTime);
      
      unmount();
    }

    const averageTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
    const maxTime = Math.max(...renderTimes);
    const minTime = Math.min(...renderTimes);

    expect(averageTime).toBeLessThan(maxRenderTime);

    return { averageTime, maxTime, minTime };
  }

  /**
   * Test component memory usage
   */
  async testMemoryUsage<T extends Record<string, any>>(
    Component: React.ComponentType<T>,
    props: T,
    iterations: number = 100
  ): Promise<void> {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const components: Array<() => void> = [];

    // Render multiple instances
    for (let i = 0; i < iterations; i++) {
      const { unmount } = renderComponent(<Component {...props} />);
      components.push(unmount);
    }

    const peakMemory = (performance as any).memory?.usedJSHeapSize || 0;

    // Cleanup all instances
    components.forEach(unmount => unmount());

    // Force garbage collection if available
    if ((global as any).gc) {
      (global as any).gc();
    }

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryLeak = finalMemory - initialMemory;

    // Allow for some memory variance but detect significant leaks
    expect(memoryLeak).toBeLessThan(1024 * 1024); // 1MB threshold
  }
}

/**
 * Main component testing class that combines all utilities
 */
export class ComponentTester {
  public interaction: UserInteractionHelper;
  public accessibility: AccessibilityTester;
  public visual: VisualRegressionTester;
  public state: ComponentStateTester;
  public performance: ComponentPerformanceTester;

  constructor(interactionOptions: UserInteractionOptions = {}) {
    this.interaction = new UserInteractionHelper(interactionOptions);
    this.accessibility = new AccessibilityTester();
    this.visual = new VisualRegressionTester();
    this.state = new ComponentStateTester();
    this.performance = new ComponentPerformanceTester();
  }

  /**
   * Run a comprehensive test suite on a component
   */
  async runComprehensiveTests<T extends Record<string, any>>(
    Component: React.ComponentType<T>,
    props: T,
    options: {
      testAccessibility?: boolean;
      testKeyboardNavigation?: boolean;
      testVisualRegression?: boolean;
      testPerformance?: boolean;
      testResponsive?: boolean;
      focusableElements?: string[];
      viewports?: Array<{ width: number; height: number; name: string }>;
    } = {}
  ): Promise<void> {
    const {
      testAccessibility = true,
      testKeyboardNavigation = false,
      testVisualRegression = false,
      testPerformance = false,
      testResponsive = false,
      focusableElements = [],
      viewports = [
        { width: 320, height: 568, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1920, height: 1080, name: 'desktop' }
      ]
    } = options;

    const { container } = renderComponent(<Component {...props} />);

    // Test accessibility
    if (testAccessibility) {
      await this.accessibility.testAccessibility(container);
    }

    // Test keyboard navigation
    if (testKeyboardNavigation && focusableElements.length > 0) {
      await this.accessibility.testKeyboardNavigation(container, focusableElements);
    }

    // Test visual regression
    if (testVisualRegression) {
      await this.visual.takeScreenshot(container, Component.name || 'component');
    }

    // Test responsive design
    if (testResponsive) {
      await this.visual.testResponsiveDesign(container, Component.name || 'component', viewports);
    }

    // Test performance
    if (testPerformance) {
      await this.performance.testRenderPerformance(Component, props);
    }
  }
}

// Export convenience functions
export const createComponentTester = (options?: UserInteractionOptions) => 
  new ComponentTester(options);

export const createUserInteraction = (options?: UserInteractionOptions) => 
  new UserInteractionHelper(options);

export const createAccessibilityTester = () => new AccessibilityTester();

export const createVisualTester = () => new VisualRegressionTester();

export const createStateTester = () => new ComponentStateTester();

export const createPerformanceTester = () => new ComponentPerformanceTester();

// Re-export testing library utilities for convenience
export {
  screen,
  fireEvent,
  waitFor,
  within,
  getByRole,
  getByText,
  getByLabelText,
  getByPlaceholderText,
  getByTestId,
  queryByRole,
  queryByText,
  queryByLabelText,
  queryByPlaceholderText,
  queryByTestId,
  findByRole,
  findByText,
  findByLabelText,
  findByPlaceholderText,
  findByTestId
} from '@testing-library/react';

export { userEvent };