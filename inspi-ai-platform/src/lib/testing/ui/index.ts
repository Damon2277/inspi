/**
 * UI Testing Framework - Main Export
 *
 * Comprehensive UI component testing framework that provides
 * all necessary tools for testing React components including
 * rendering, interactions, styles, and accessibility.
 */

// Core framework exports
export {
  ComponentTestFramework,
  createComponentTestFramework,
  withComponentTest,
  ComponentTestSuiteBuilder,
  createTestSuite,
} from './ComponentTestFramework';

export type {
  ComponentTestConfig,
  ViewportSize,
  AccessibilityConfig,
  PerformanceConfig,
  StyleTestConfig,
  ComponentTestResult,
  InteractionResult,
  ComponentTestSuite,
  ComponentVariant,
  ComponentInteraction,
} from './ComponentTestFramework';

// Interaction simulator exports
export {
  InteractionSimulator,
  createInteractionSimulator,
  createInteractionSequence,
} from './InteractionSimulator';

export type {
  InteractionConfig,
  TouchGesture,
  KeyboardSequence,
  MouseInteraction,
  InteractionSequence,
  InteractionStep,
  InteractionResult,
  StepResult,
} from './InteractionSimulator';

// Style regression tester exports
export {
  StyleRegressionTester,
  createStyleRegressionTester,
} from './StyleRegressionTester';

export type {
  StyleSnapshot,
  ComputedStyleMap,
  ViewportConfig,
  StyleComparisonResult,
  StyleDifference,
  ComparisonSummary,
  StyleTestConfig,
  StyleTolerances,
  ResponsiveTestResult,
  ResponsiveIssue,
} from './StyleRegressionTester';

// Accessibility tester exports
export {
  AccessibilityTester,
  createAccessibilityTester,
} from './AccessibilityTester';

export type {
  AccessibilityTestConfig,
  AccessibilityRule,
  AccessibilityViolation,
  AccessibilityTestResult,
  AccessibilitySummary,
  KeyboardNavigationResult,
  KeyboardIssue,
  ScreenReaderResult,
  ScreenReaderIssue,
  ColorContrastResult,
  ColorContrastIssue,
  FocusManagementResult,
  FocusIssue,
} from './AccessibilityTester';

// Utility exports from existing files
export {
  ComponentMatchers,
  createComponentMatchers,
} from './ComponentMatchers';

export {
  ComponentTestUtils,
  createComponentTestUtils,
} from './ComponentTestUtils';

/**
 * Complete UI testing suite that combines all testing capabilities
 */
export class UITestingSuite {
  private componentFramework: ComponentTestFramework;
  private interactionSimulator: InteractionSimulator;
  private styleRegressionTester: StyleRegressionTester;
  private accessibilityTester: AccessibilityTester;

  constructor(config: {
    component?: ComponentTestConfig;
    interaction?: InteractionConfig;
    style?: Partial<StyleTestConfig>;
    accessibility?: Partial<AccessibilityTestConfig>;
  } = {}) {
    this.componentFramework = createComponentTestFramework(config.component);
    this.interactionSimulator = createInteractionSimulator(config.interaction);
    this.styleRegressionTester = createStyleRegressionTester(config.style);
    this.accessibilityTester = createAccessibilityTester(config.accessibility);
  }

  /**
   * Run complete UI test suite for a component
   */
  async runCompleteTest(suite: ComponentTestSuite) {
    const results = {
      component: null as any,
      interactions: [] as any[],
      styles: null as any,
      accessibility: null as any,
    };

    try {
      // Run component tests
      results.component = await this.componentFramework.runTestSuite(suite);

      // Run interaction tests
      if (suite.interactions) {
        for (const interaction of suite.interactions) {
          const sequence = createInteractionSequence(
            interaction.name,
            [{
              type: 'mouse',
              action: interaction.action,
              assertion: interaction.assertions,
            }],
          );
          const result = await this.interactionSimulator.executeSequence(sequence);
          results.interactions.push(result);
        }
      }

      // Run style regression tests
      const { container } = this.componentFramework.renderComponent(
        React.createElement(suite.component, suite.props || {}),
      );

      results.styles = await this.styleRegressionTester.testResponsive(
        container,
        suite.name,
      );

      // Run accessibility tests
      results.accessibility = await this.accessibilityTester.testAccessibility(container);

      return results;
    } catch (error) {
      throw new Error(`Complete UI test failed: ${error}`);
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateReport(results: any): string {
    let report = '# UI Component Test Report\n\n';

    // Component test results
    if (results.component) {
      report += '## Component Tests\n';
      report += `- Render Time: ${results.component.renderTime}ms\n`;
      report += `- Memory Usage: ${results.component.memoryUsage} bytes\n`;
      report += `- Re-render Count: ${results.component.reRenderCount}\n\n`;
    }

    // Interaction test results
    if (results.interactions.length > 0) {
      report += '## Interaction Tests\n';
      results.interactions.forEach((result: any, index: number) => {
        report += `### Interaction ${index + 1}\n`;
        report += `- Success: ${result.success}\n`;
        report += `- Duration: ${result.duration}ms\n`;
        if (result.error) {
          report += `- Error: ${result.error}\n`;
        }
        report += '\n';
      });
    }

    // Style test results
    if (results.styles) {
      report += '## Style Tests\n';
      results.styles.forEach((result: any) => {
        report += `- Breakpoint ${result.breakpoint}px: ${result.passed ? 'PASSED' : 'FAILED'}\n`;
        if (result.issues.length > 0) {
          report += `  Issues: ${result.issues.length}\n`;
        }
      });
      report += '\n';
    }

    // Accessibility test results
    if (results.accessibility) {
      report += '## Accessibility Tests\n';
      report += `- Overall Score: ${results.accessibility.score}/100\n`;
      report += `- Status: ${results.accessibility.passed ? 'PASSED' : 'FAILED'}\n`;
      report += `- Violations: ${results.accessibility.violations.length}\n\n`;
    }

    return report;
  }

  /**
   * Cleanup all testing resources
   */
  cleanup(): void {
    this.componentFramework.cleanup();
    this.interactionSimulator.cleanup();
    this.styleRegressionTester.cleanup();
    this.accessibilityTester.cleanup();
  }
}

/**
 * Create complete UI testing suite
 */
export function createUITestingSuite(config?: {
  component?: ComponentTestConfig;
  interaction?: InteractionConfig;
  style?: Partial<StyleTestConfig>;
  accessibility?: Partial<AccessibilityTestConfig>;
}): UITestingSuite {
  return new UITestingSuite(config);
}

/**
 * Helper function to create a basic component test
 */
export function createBasicComponentTest(
  component: React.ComponentType<any>,
  props?: Record<string, any>,
) {
  return createTestSuite()
    .component(component)
    .name(component.name || 'Component')
    .props(props || {})
    .build();
}

/**
 * Helper function to create accessibility-focused test
 */
export function createAccessibilityTest(
  component: React.ComponentType<any>,
  props?: Record<string, any>,
) {
  return createTestSuite()
    .component(component)
    .name(`${component.name || 'Component'} Accessibility`)
    .props(props || {})
    .config({
      accessibility: { enabled: true },
      performance: { enabled: false },
      styles: { enabled: false },
    })
    .build();
}

/**
 * Helper function to create responsive design test
 */
export function createResponsiveTest(
  component: React.ComponentType<any>,
  props?: Record<string, any>,
) {
  return createTestSuite()
    .component(component)
    .name(`${component.name || 'Component'} Responsive`)
    .props(props || {})
    .config({
      styles: {
        enabled: true,
        checkResponsive: true,
        breakpoints: [320, 768, 1024, 1440],
      },
    })
    .build();
}

/**
 * Helper function to create interaction test
 */
export function createInteractionTest(
  component: React.ComponentType<any>,
  interactions: ComponentInteraction[],
  props?: Record<string, any>,
) {
  const suite = createTestSuite()
    .component(component)
    .name(`${component.name || 'Component'} Interactions`)
    .props(props || {});

  interactions.forEach(interaction => {
    suite.interaction(
      interaction.name,
      interaction.action,
      interaction.assertions,
      interaction.timeout,
    );
  });

  return suite.build();
}

// Re-export React for convenience
import React from 'react';
