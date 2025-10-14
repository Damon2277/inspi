/**
 * Custom Jest Matchers for Component Testing
 *
 * Extended Jest matchers specifically designed for React component testing,
 * including accessibility, styling, and behavior assertions.
 */

import { ReactWrapper } from 'enzyme';
import { getComputedStyle } from 'jsdom-global';

declare global {
  namespace jest {
    interface Matchers<R> {
      // Accessibility matchers
      toBeAccessible(): R;
      toHaveAriaLabel(label: string): R;
      toHaveAriaRole(role: string): R;
      toBeKeyboardNavigable(): R;
      toHaveProperHeadingStructure(): R;
      toHaveAltText(): R;

      // Visual matchers
      toBeVisible(): R;
      toBeHidden(): R;
      toHaveComputedStyle(property: string, value: string): R;
      toHaveClass(className: string): R;
      toHaveInlineStyle(property: string, value: string): R;
      toMatchSnapshot(options?: any): R;

      // Interaction matchers
      toBeClickable(): R;
      toBeFocusable(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toHaveBeenTriggered(): R;

      // Content matchers
      toHaveTextContent(text: string | RegExp): R;
      toContainText(text: string): R;
      toHaveValue(value: string | number): R;
      toBeEmpty(): R;

      // Form matchers
      toBeRequired(): R;
      toBeValid(): R;
      toBeInvalid(): R;
      toHaveValidationError(message?: string): R;

      // Component state matchers
      toHaveState(state: Record<string, any>): R;
      toHaveProp(prop: string, value?: any): R;
      toBeLoading(): R;
      toHaveError(error?: string): R;

      // Performance matchers
      toRenderWithinTime(maxTime: number): R;
      toNotCauseMemoryLeak(): R;

      // Responsive matchers
      toBeResponsive(): R;
      toHaveBreakpoint(breakpoint: string): R;
    }
  }
}

/**
 * Accessibility matchers
 */
export const accessibilityMatchers = {
  toBeAccessible(received: Element) {
    // This would integrate with axe-core for full accessibility testing
    const hasAriaLabel = received.hasAttribute('aria-label') || received.hasAttribute('aria-labelledby');
    const hasRole = received.hasAttribute('role') || received.tagName.toLowerCase() in ['button', 'input', 'select', 'textarea', 'a'];
    const isKeyboardAccessible = received.hasAttribute('tabindex') || received.tagName.toLowerCase() in ['button', 'input', 'select', 'textarea', 'a'];

    const pass = hasAriaLabel && hasRole && isKeyboardAccessible;

    return {
      message: () => pass
        ? 'Expected element not to be accessible'
        : `Expected element to be accessible. Missing: ${[
            !hasAriaLabel && 'aria-label or aria-labelledby',
            !hasRole && 'role attribute',
            !isKeyboardAccessible && 'keyboard accessibility',
          ].filter(Boolean).join(', ')}`,
      pass,
    };
  },

  toHaveAriaLabel(received: Element, expectedLabel: string) {
    const ariaLabel = received.getAttribute('aria-label');
    const ariaLabelledBy = received.getAttribute('aria-labelledby');

    let actualLabel = ariaLabel;
    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy);
      actualLabel = labelElement?.textContent || '';
    }

    const pass = actualLabel === expectedLabel;

    return {
      message: () => pass
        ? `Expected element not to have aria-label "${expectedLabel}"`
        : `Expected element to have aria-label "${expectedLabel}", but got "${actualLabel}"`,
      pass,
    };
  },

  toHaveAriaRole(received: Element, expectedRole: string) {
    const role = received.getAttribute('role') || received.tagName.toLowerCase();
    const pass = role === expectedRole;

    return {
      message: () => pass
        ? `Expected element not to have role "${expectedRole}"`
        : `Expected element to have role "${expectedRole}", but got "${role}"`,
      pass,
    };
  },

  toBeKeyboardNavigable(received: Element) {
    const tabIndex = received.getAttribute('tabindex');
    const isInteractiveElement = ['button', 'input', 'select', 'textarea', 'a'].includes(
      received.tagName.toLowerCase(),
    );
    const hasTabIndex = tabIndex !== null && parseInt(tabIndex, 10) >= 0;

    const pass = isInteractiveElement || hasTabIndex;

    return {
      message: () => pass
        ? 'Expected element not to be keyboard navigable'
        : 'Expected element to be keyboard navigable (interactive element or tabindex >= 0)',
      pass,
    };
  },

  toHaveProperHeadingStructure(received: Element) {
    const headings = Array.from(received.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const headingLevels = headings.map(h => parseInt(h.tagName.charAt(1), 10));

    let isProper = true;
    let previousLevel = 0;

    for (const level of headingLevels) {
      if (level > previousLevel + 1) {
        isProper = false;
        break;
      }
      previousLevel = level;
    }

    return {
      message: () => isProper
        ? 'Expected element not to have proper heading structure'
        : 'Expected element to have proper heading structure (no skipped levels)',
      pass: isProper,
    };
  },

  toHaveAltText(received: Element) {
    const images = Array.from(received.querySelectorAll('img'));
    const allHaveAlt = images.every(img => img.hasAttribute('alt'));

    return {
      message: () => allHaveAlt
        ? 'Expected images not to have alt text'
        : 'Expected all images to have alt text',
      pass: allHaveAlt,
    };
  },
};

/**
 * Visual matchers
 */
export const visualMatchers = {
  toBeVisible(received: Element) {
    const style = window.getComputedStyle(received);
    const isVisible = style.display !== 'none' &&
                     style.visibility !== 'hidden' &&
                     style.opacity !== '0';

    return {
      message: () => isVisible
        ? 'Expected element not to be visible'
        : 'Expected element to be visible',
      pass: isVisible,
    };
  },

  toBeHidden(received: Element) {
    const style = window.getComputedStyle(received);
    const isHidden = style.display === 'none' ||
                    style.visibility === 'hidden' ||
                    style.opacity === '0';

    return {
      message: () => isHidden
        ? 'Expected element not to be hidden'
        : 'Expected element to be hidden',
      pass: isHidden,
    };
  },

  toHaveComputedStyle(received: Element, property: string, expectedValue: string) {
    const style = window.getComputedStyle(received);
    const actualValue = style.getPropertyValue(property);
    const pass = actualValue === expectedValue;

    return {
      message: () => pass
        ? `Expected element not to have computed style ${property}: ${expectedValue}`
        : `Expected element to have computed style ${property}: ${expectedValue}, but got ${actualValue}`,
      pass,
    };
  },

  toHaveClass(received: Element, expectedClass: string) {
    const pass = received.classList.contains(expectedClass);

    return {
      message: () => pass
        ? `Expected element not to have class "${expectedClass}"`
        : `Expected element to have class "${expectedClass}"`,
      pass,
    };
  },

  toHaveInlineStyle(received: Element, property: string, expectedValue: string) {
    const element = received as HTMLElement;
    const actualValue = element.style.getPropertyValue(property);
    const pass = actualValue === expectedValue;

    return {
      message: () => pass
        ? `Expected element not to have inline style ${property}: ${expectedValue}`
        : `Expected element to have inline style ${property}: ${expectedValue}, but got ${actualValue}`,
      pass,
    };
  },
};

/**
 * Interaction matchers
 */
export const interactionMatchers = {
  toBeClickable(received: Element) {
    const isButton = received.tagName.toLowerCase() === 'button';
    const isLink = received.tagName.toLowerCase() === 'a' && received.hasAttribute('href');
    const hasClickHandler = received.hasAttribute('onclick') ||
                           received.getAttribute('role') === 'button';
    const isDisabled = received.hasAttribute('disabled');

    const pass = (isButton || isLink || hasClickHandler) && !isDisabled;

    return {
      message: () => pass
        ? 'Expected element not to be clickable'
        : 'Expected element to be clickable',
      pass,
    };
  },

  toBeFocusable(received: Element) {
    const tabIndex = received.getAttribute('tabindex');
    const isInteractiveElement = ['button', 'input', 'select', 'textarea', 'a'].includes(
      received.tagName.toLowerCase(),
    );
    const hasTabIndex = tabIndex !== null && parseInt(tabIndex, 10) >= 0;
    const isDisabled = received.hasAttribute('disabled');

    const pass = (isInteractiveElement || hasTabIndex) && !isDisabled;

    return {
      message: () => pass
        ? 'Expected element not to be focusable'
        : 'Expected element to be focusable',
      pass,
    };
  },

  toBeDisabled(received: Element) {
    const isDisabled = received.hasAttribute('disabled') ||
                      received.getAttribute('aria-disabled') === 'true';

    return {
      message: () => isDisabled
        ? 'Expected element not to be disabled'
        : 'Expected element to be disabled',
      pass: isDisabled,
    };
  },

  toBeEnabled(received: Element) {
    const isDisabled = received.hasAttribute('disabled') ||
                      received.getAttribute('aria-disabled') === 'true';

    return {
      message: () => !isDisabled
        ? 'Expected element not to be enabled'
        : 'Expected element to be enabled',
      pass: !isDisabled,
    };
  },
};

/**
 * Content matchers
 */
export const contentMatchers = {
  toHaveTextContent(received: Element, expectedText: string | RegExp) {
    const actualText = received.textContent || '';
    const pass = typeof expectedText === 'string'
      ? actualText === expectedText
      : expectedText.test(actualText);

    return {
      message: () => pass
        ? `Expected element not to have text content "${expectedText}"`
        : `Expected element to have text content "${expectedText}", but got "${actualText}"`,
      pass,
    };
  },

  toContainText(received: Element, expectedText: string) {
    const actualText = received.textContent || '';
    const pass = actualText.includes(expectedText);

    return {
      message: () => pass
        ? `Expected element not to contain text "${expectedText}"`
        : `Expected element to contain text "${expectedText}", but got "${actualText}"`,
      pass,
    };
  },

  toHaveValue(received: Element, expectedValue: string | number) {
    const element = received as HTMLInputElement;
    const actualValue = element.value;
    const pass = actualValue === String(expectedValue);

    return {
      message: () => pass
        ? `Expected element not to have value "${expectedValue}"`
        : `Expected element to have value "${expectedValue}", but got "${actualValue}"`,
      pass,
    };
  },

  toBeEmpty(received: Element) {
    const isEmpty = !received.textContent?.trim() && received.children.length === 0;

    return {
      message: () => isEmpty
        ? 'Expected element not to be empty'
        : 'Expected element to be empty',
      pass: isEmpty,
    };
  },
};

/**
 * Form matchers
 */
export const formMatchers = {
  toBeRequired(received: Element) {
    const isRequired = received.hasAttribute('required') ||
                      received.getAttribute('aria-required') === 'true';

    return {
      message: () => isRequired
        ? 'Expected element not to be required'
        : 'Expected element to be required',
      pass: isRequired,
    };
  },

  toBeValid(received: Element) {
    const element = received as HTMLInputElement;
    const isValid = element.validity?.valid !== false;

    return {
      message: () => isValid
        ? 'Expected element not to be valid'
        : 'Expected element to be valid',
      pass: isValid,
    };
  },

  toBeInvalid(received: Element) {
    const element = received as HTMLInputElement;
    const isInvalid = element.validity?.valid === false;

    return {
      message: () => isInvalid
        ? 'Expected element not to be invalid'
        : 'Expected element to be invalid',
      pass: isInvalid,
    };
  },

  toHaveValidationError(received: Element, expectedMessage?: string) {
    const element = received as HTMLInputElement;
    const validationMessage = element.validationMessage;
    const hasError = !element.validity?.valid;

    if (!hasError) {
      return {
        message: () => 'Expected element to have validation error',
        pass: false,
      };
    }

    if (expectedMessage) {
      const pass = validationMessage === expectedMessage;
      return {
        message: () => pass
          ? `Expected element not to have validation error "${expectedMessage}"`
          : `Expected element to have validation error "${expectedMessage}", but got "${validationMessage}"`,
        pass,
      };
    }

    return {
      message: () => 'Expected element not to have validation error',
      pass: true,
    };
  },
};

/**
 * Component state matchers
 */
export const componentStateMatchers = {
  toHaveState(received: ReactWrapper, expectedState: Record<string, any>) {
    const actualState = received.state();
    const pass = Object.keys(expectedState).every(key =>
      actualState[key] === expectedState[key],
    );

    return {
      message: () => pass
        ? `Expected component not to have state ${JSON.stringify(expectedState)}`
        : `Expected component to have state ${JSON.stringify(expectedState)}, but got ${JSON.stringify(actualState)}`,
      pass,
    };
  },

  toHaveProp(received: ReactWrapper, propName: string, expectedValue?: any) {
    const props = received.props();
    const hasProp = propName in props;

    if (!hasProp) {
      return {
        message: () => `Expected component to have prop "${propName}"`,
        pass: false,
      };
    }

    if (expectedValue !== undefined) {
      const pass = props[propName] === expectedValue;
      return {
        message: () => pass
          ? `Expected component not to have prop "${propName}" with value ${expectedValue}`
          : `Expected component to have prop "${propName}" with value ${expectedValue}, but got ${props[propName]}`,
        pass,
      };
    }

    return {
      message: () => `Expected component not to have prop "${propName}"`,
      pass: true,
    };
  },

  toBeLoading(received: Element) {
    const hasLoadingAttribute = received.hasAttribute('aria-busy') &&
                               received.getAttribute('aria-busy') === 'true';
    const hasLoadingClass = received.classList.contains('loading') ||
                           received.classList.contains('spinner');
    const hasLoadingText = received.textContent?.toLowerCase().includes('loading');

    const pass = hasLoadingAttribute || hasLoadingClass || hasLoadingText;

    return {
      message: () => pass
        ? 'Expected element not to be loading'
        : 'Expected element to be loading',
      pass,
    };
  },

  toHaveError(received: Element, expectedError?: string) {
    const hasErrorAttribute = received.hasAttribute('aria-invalid') &&
                             received.getAttribute('aria-invalid') === 'true';
    const hasErrorClass = received.classList.contains('error') ||
                         received.classList.contains('invalid');
    const errorElement = received.querySelector('[role="alert"], .error-message');

    const hasError = hasErrorAttribute || hasErrorClass || errorElement;

    if (!hasError) {
      return {
        message: () => 'Expected element to have error',
        pass: false,
      };
    }

    if (expectedError) {
      const errorText = errorElement?.textContent || '';
      const pass = errorText.includes(expectedError);
      return {
        message: () => pass
          ? `Expected element not to have error "${expectedError}"`
          : `Expected element to have error "${expectedError}", but got "${errorText}"`,
        pass,
      };
    }

    return {
      message: () => 'Expected element not to have error',
      pass: true,
    };
  },
};

/**
 * Performance matchers
 */
export const performanceMatchers = {
  toRenderWithinTime(received: () => void, maxTime: number) {
    const startTime = performance.now();
    received();
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    const pass = renderTime <= maxTime;

    return {
      message: () => pass
        ? `Expected render time not to be within ${maxTime}ms`
        : `Expected render time to be within ${maxTime}ms, but took ${renderTime.toFixed(2)}ms`,
      pass,
    };
  },

  toNotCauseMemoryLeak(received: () => void) {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

    // Run the function multiple times
    for (let i = 0; i < 100; i++) {
      received();
    }

    // Force garbage collection if available
    if ((global as any).gc) {
      (global as any).gc();
    }

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;
    const pass = memoryIncrease < 1024 * 1024; // 1MB threshold

    return {
      message: () => pass
        ? 'Expected function not to cause memory leak'
        : `Expected function not to cause memory leak, but memory increased by ${(memoryIncrease / 1024).toFixed(2)}KB`,
      pass,
    };
  },
};

/**
 * Responsive matchers
 */
export const responsiveMatchers = {
  toBeResponsive(received: Element) {
    // Check if element has responsive classes or styles
    const hasResponsiveClasses = Array.from(received.classList).some(className =>
      className.includes('responsive') ||
      className.includes('mobile') ||
      className.includes('tablet') ||
      className.includes('desktop'),
    );

    const style = window.getComputedStyle(received);
    const hasFlexibleWidth = style.width.includes('%') || style.width === 'auto';
    const hasMediaQueries = style.getPropertyValue('--responsive') !== '';

    const pass = hasResponsiveClasses || hasFlexibleWidth || hasMediaQueries;

    return {
      message: () => pass
        ? 'Expected element not to be responsive'
        : 'Expected element to be responsive',
      pass,
    };
  },

  toHaveBreakpoint(received: Element, breakpoint: string) {
    const hasBreakpointClass = received.classList.contains(`${breakpoint}:`) ||
                              received.classList.contains(`${breakpoint}-`);

    return {
      message: () => hasBreakpointClass
        ? `Expected element not to have breakpoint "${breakpoint}"`
        : `Expected element to have breakpoint "${breakpoint}"`,
      pass: hasBreakpointClass,
    };
  },
};

// Combine all matchers
export const componentMatchers = {
  ...accessibilityMatchers,
  ...visualMatchers,
  ...interactionMatchers,
  ...contentMatchers,
  ...formMatchers,
  ...componentStateMatchers,
  ...performanceMatchers,
  ...responsiveMatchers,
};

// Setup function to extend Jest with all matchers
export function setupComponentMatchers() {
  expect.extend(componentMatchers);
}

export default componentMatchers;
