/**
 * Accessibility Tester
 *
 * Comprehensive accessibility testing framework that validates
 * WCAG compliance, keyboard navigation, screen reader compatibility,
 * and other accessibility standards.
 */
import { fireEvent, waitFor } from '@testing-library/react';
import { axe, AxeResults, Result as AxeResult } from 'jest-axe';

export interface AccessibilityTestConfig {
  wcagLevel: 'A' | 'AA' | 'AAA';
  includeRules: string[];
  excludeRules: string[];
  tags: string[];
  customRules: AccessibilityRule[];
  keyboardNavigation: boolean;
  screenReaderTesting: boolean;
  colorContrastTesting: boolean;
  focusManagement: boolean;
}

export interface AccessibilityRule {
  id: string;
  name: string;
  description: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  tags: string[];
  check: (element: HTMLElement) => AccessibilityViolation[];
}

export interface AccessibilityViolation {
  ruleId: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  message: string;
  element: HTMLElement;
  selector: string;
  help: string;
  helpUrl?: string;
  suggestion: string;
  wcagCriteria: string[];
}

export interface AccessibilityTestResult {
  passed: boolean;
  score: number;
  violations: AccessibilityViolation[];
  summary: AccessibilitySummary;
  keyboardNavigation?: KeyboardNavigationResult;
  screenReader?: ScreenReaderResult;
  colorContrast?: ColorContrastResult;
  focusManagement?: FocusManagementResult;
}

export interface AccessibilitySummary {
  totalElements: number;
  violatingElements: number;
  criticalViolations: number;
  seriousViolations: number;
  moderateViolations: number;
  minorViolations: number;
  wcagLevel: string;
  complianceScore: number;
}

export interface KeyboardNavigationResult {
  passed: boolean;
  focusableElements: number;
  tabbableElements: number;
  trapFocus: boolean;
  skipLinks: boolean;
  issues: KeyboardIssue[];
}

export interface KeyboardIssue {
  type: 'missing-focus' | 'focus-trap' | 'skip-link' | 'tab-order' | 'keyboard-activation';
  element: HTMLElement;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface ScreenReaderResult {
  passed: boolean;
  ariaLabels: number;
  landmarks: number;
  headingStructure: boolean;
  altTexts: number;
  issues: ScreenReaderIssue[];
}

export interface ScreenReaderIssue {
  type: 'missing-label' | 'missing-landmark' | 'heading-structure' | 'missing-alt' | 'aria-invalid';
  element: HTMLElement;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface ColorContrastResult {
  passed: boolean;
  totalChecks: number;
  failedChecks: number;
  issues: ColorContrastIssue[];
}

export interface ColorContrastIssue {
  element: HTMLElement;
  foreground: string;
  background: string;
  ratio: number;
  requiredRatio: number;
  level: 'AA' | 'AAA';
  size: 'normal' | 'large';
  suggestion: string;
}

export interface FocusManagementResult {
  passed: boolean;
  focusIndicators: boolean;
  focusOrder: boolean;
  focusTrapping: boolean;
  issues: FocusIssue[];
}

export interface FocusIssue {
  type: 'missing-indicator' | 'wrong-order' | 'no-trap' | 'lost-focus';
  element: HTMLElement;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export class AccessibilityTester {
  private config: AccessibilityTestConfig;
  private customRules: Map<string, AccessibilityRule> = new Map();

  constructor(config: Partial<AccessibilityTestConfig> = {}) {
    this.config = {
      wcagLevel: 'AA',
      includeRules: [],
      excludeRules: [],
      tags: ['wcag2a', 'wcag2aa'],
      customRules: [],
      keyboardNavigation: true,
      screenReaderTesting: true,
      colorContrastTesting: true,
      focusManagement: true,
      ...config,
    };

    this.initializeCustomRules();
  }

  /**
   * Run comprehensive accessibility test
   */
  async testAccessibility(container: HTMLElement): Promise<AccessibilityTestResult> {
    const violations: AccessibilityViolation[] = [];

    // Run axe-core tests
    const axeResults = await this.runAxeTests(container);
    violations.push(...this.convertAxeViolations(axeResults.violations));

    // Run custom rule tests
    const customViolations = await this.runCustomRules(container);
    violations.push(...customViolations);

    // Run specific accessibility tests
    const keyboardNavigation = this.config.keyboardNavigation
      ? await this.testKeyboardNavigation(container)
      : undefined;

    const screenReader = this.config.screenReaderTesting
      ? await this.testScreenReaderCompatibility(container)
      : undefined;

    const colorContrast = this.config.colorContrastTesting
      ? await this.testColorContrast(container)
      : undefined;

    const focusManagement = this.config.focusManagement
      ? await this.testFocusManagement(container)
      : undefined;

    // Calculate summary
    const summary = this.calculateSummary(violations, container);

    // Calculate overall score
    const score = this.calculateAccessibilityScore(summary, keyboardNavigation, screenReader, colorContrast, focusManagement);

    return {
      passed: violations.filter(v => v.impact === 'critical' || v.impact === 'serious').length === 0,
      score,
      violations,
      summary,
      keyboardNavigation,
      screenReader,
      colorContrast,
      focusManagement,
    };
  }

  /**
   * Run axe-core accessibility tests
   */
  private async runAxeTests(container: HTMLElement): Promise<AxeResults> {
    const axeConfig = {
      rules: this.buildAxeRulesConfig(),
      tags: this.config.tags,
      exclude: this.config.excludeRules.map(rule => `[data-rule="${rule}"]`),
    };

    return await axe(container, axeConfig);
  }

  /**
   * Convert axe violations to our format
   */
  private convertAxeViolations(axeViolations: AxeResult[]): AccessibilityViolation[] {
    return axeViolations.flatMap(violation =>
      violation.nodes.map(node => ({
        ruleId: violation.id,
        impact: violation.impact as 'minor' | 'moderate' | 'serious' | 'critical',
        message: violation.description,
        element: node.element as HTMLElement,
        selector: node.target.join(' '),
        help: violation.help,
        helpUrl: violation.helpUrl,
        suggestion: this.generateSuggestion(violation.id, node.element as HTMLElement),
        wcagCriteria: violation.tags.filter(tag => tag.startsWith('wcag')),
      })),
    );
  }

  /**
   * Test keyboard navigation
   */
  private async testKeyboardNavigation(container: HTMLElement): Promise<KeyboardNavigationResult> {
    const issues: KeyboardIssue[] = [];
    const focusableElements = this.getFocusableElements(container);
    const tabbableElements = this.getTabbableElements(container);

    // Test focus indicators
    for (const element of focusableElements) {
      if (!this.hasFocusIndicator(element)) {
        issues.push({
          type: 'missing-focus',
          element,
          description: 'Element lacks visible focus indicator',
          severity: 'high',
          suggestion: 'Add CSS focus styles or ensure default focus indicators are visible',
        });
      }
    }

    // Test tab order
    const tabOrderIssues = await this.testTabOrder(tabbableElements);
    issues.push(...tabOrderIssues);

    // Test keyboard activation
    const activationIssues = await this.testKeyboardActivation(focusableElements);
    issues.push(...activationIssues);

    // Test focus trapping (for modals, dialogs)
    const trapFocus = await this.testFocusTrapping(container);

    // Test skip links
    const skipLinks = this.hasSkipLinks(container);

    return {
      passed: issues.filter(i => i.severity === 'high').length === 0,
      focusableElements: focusableElements.length,
      tabbableElements: tabbableElements.length,
      trapFocus,
      skipLinks,
      issues,
    };
  }

  /**
   * Test screen reader compatibility
   */
  private async testScreenReaderCompatibility(container: HTMLElement): Promise<ScreenReaderResult> {
    const issues: ScreenReaderIssue[] = [];

    // Test ARIA labels
    const ariaLabels = this.countAriaLabels(container);
    const missingLabels = this.findMissingLabels(container);
    issues.push(...missingLabels);

    // Test landmarks
    const landmarks = this.countLandmarks(container);
    const landmarkIssues = this.validateLandmarks(container);
    issues.push(...landmarkIssues);

    // Test heading structure
    const headingStructure = this.validateHeadingStructure(container);
    if (!headingStructure.valid) {
      issues.push({
        type: 'heading-structure',
        element: container,
        description: 'Heading structure is not logical',
        severity: 'medium',
        suggestion: 'Ensure headings follow a logical hierarchy (h1 → h2 → h3, etc.)',
      });
    }

    // Test alt texts
    const altTexts = this.countAltTexts(container);
    const missingAltTexts = this.findMissingAltTexts(container);
    issues.push(...missingAltTexts);

    return {
      passed: issues.filter(i => i.severity === 'high').length === 0,
      ariaLabels,
      landmarks,
      headingStructure: headingStructure.valid,
      altTexts,
      issues,
    };
  }

  /**
   * Test color contrast
   */
  private async testColorContrast(container: HTMLElement): Promise<ColorContrastResult> {
    const issues: ColorContrastIssue[] = [];
    const textElements = container.querySelectorAll('*');
    let totalChecks = 0;
    let failedChecks = 0;

    for (const element of textElements) {
      if (this.hasTextContent(element as HTMLElement)) {
        totalChecks++;
        const contrastIssue = await this.checkColorContrast(element as HTMLElement);
        if (contrastIssue) {
          issues.push(contrastIssue);
          failedChecks++;
        }
      }
    }

    return {
      passed: failedChecks === 0,
      totalChecks,
      failedChecks,
      issues,
    };
  }

  /**
   * Test focus management
   */
  private async testFocusManagement(container: HTMLElement): Promise<FocusManagementResult> {
    const issues: FocusIssue[] = [];

    // Test focus indicators
    const focusIndicators = await this.testFocusIndicators(container);
    if (!focusIndicators) {
      issues.push({
        type: 'missing-indicator',
        element: container,
        description: 'Some elements lack proper focus indicators',
        severity: 'high',
        suggestion: 'Ensure all interactive elements have visible focus indicators',
      });
    }

    // Test focus order
    const focusOrder = await this.testFocusOrder(container);
    if (!focusOrder) {
      issues.push({
        type: 'wrong-order',
        element: container,
        description: 'Focus order does not match visual order',
        severity: 'medium',
        suggestion: 'Adjust tab order to match visual layout',
      });
    }

    // Test focus trapping
    const focusTrapping = await this.testFocusTrapping(container);
    if (!focusTrapping && this.isModal(container)) {
      issues.push({
        type: 'no-trap',
        element: container,
        description: 'Modal does not trap focus',
        severity: 'high',
        suggestion: 'Implement focus trapping for modal dialogs',
      });
    }

    return {
      passed: issues.filter(i => i.severity === 'high').length === 0,
      focusIndicators,
      focusOrder,
      focusTrapping,
      issues,
    };
  }

  /**
   * Run custom accessibility rules
   */
  private async runCustomRules(container: HTMLElement): Promise<AccessibilityViolation[]> {
    const violations: AccessibilityViolation[] = [];

    for (const rule of this.customRules.values()) {
      try {
        const ruleViolations = rule.check(container);
        violations.push(...ruleViolations);
      } catch (error) {
        console.error(`Custom rule ${rule.id} failed:`, error);
      }
    }

    return violations;
  }

  /**
   * Get focusable elements
   */
  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ];

    return Array.from(container.querySelectorAll(focusableSelectors.join(', '))) as HTMLElement[];
  }

  /**
   * Get tabbable elements
   */
  private getTabbableElements(container: HTMLElement): HTMLElement[] {
    return this.getFocusableElements(container).filter(element => {
      const tabIndex = element.getAttribute('tabindex');
      return tabIndex !== '-1';
    });
  }

  /**
   * Check if element has focus indicator
   */
  private hasFocusIndicator(element: HTMLElement): boolean {
    // Simulate focus
    element.focus();
    const computedStyle = window.getComputedStyle(element, ':focus');

    // Check for common focus indicators
    const hasOutline = computedStyle.outline !== 'none' && computedStyle.outline !== '0px';
    const hasBoxShadow = computedStyle.boxShadow !== 'none';
    const hasBorder = computedStyle.borderColor !== computedStyle.getPropertyValue('border-color');

    return hasOutline || hasBoxShadow || hasBorder;
  }

  /**
   * Test tab order
   */
  private async testTabOrder(elements: HTMLElement[]): Promise<KeyboardIssue[]> {
    const issues: KeyboardIssue[] = [];

    for (let i = 0; i < elements.length - 1; i++) {
      const current = elements[i];
      const next = elements[i + 1];

      // Check if visual order matches tab order
      const currentRect = current.getBoundingClientRect();
      const nextRect = next.getBoundingClientRect();

      // Simple heuristic: next element should be to the right or below
      if (nextRect.top < currentRect.top ||
          (nextRect.top === currentRect.top && nextRect.left < currentRect.left)) {
        issues.push({
          type: 'tab-order',
          element: next,
          description: 'Tab order does not match visual order',
          severity: 'medium',
          suggestion: 'Adjust tabindex or DOM order to match visual layout',
        });
      }
    }

    return issues;
  }

  /**
   * Test keyboard activation
   */
  private async testKeyboardActivation(elements: HTMLElement[]): Promise<KeyboardIssue[]> {
    const issues: KeyboardIssue[] = [];

    for (const element of elements) {
      if (this.isInteractiveElement(element)) {
        const canActivate = await this.testElementActivation(element);
        if (!canActivate) {
          issues.push({
            type: 'keyboard-activation',
            element,
            description: 'Element cannot be activated with keyboard',
            severity: 'high',
            suggestion: 'Add keyboard event handlers for Enter and Space keys',
          });
        }
      }
    }

    return issues;
  }

  /**
   * Test element activation with keyboard
   */
  private async testElementActivation(element: HTMLElement): Promise<boolean> {
    let activated = false;

    // Add temporary event listener
    const handleActivation = () => { activated = true; };
    element.addEventListener('click', handleActivation);

    try {
      // Test Enter key
      element.focus();
      fireEvent.keyDown(element, { key: 'Enter', code: 'Enter' });
      await waitFor(() => {}, { timeout: 100 });

      if (!activated) {
        // Test Space key
        fireEvent.keyDown(element, { key: ' ', code: 'Space' });
        await waitFor(() => {}, { timeout: 100 });
      }

      return activated;
    } finally {
      element.removeEventListener('click', handleActivation);
    }
  }

  /**
   * Test focus trapping
   */
  private async testFocusTrapping(container: HTMLElement): Promise<boolean> {
    if (!this.isModal(container)) return true;

    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return true;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Test forward trapping
    lastElement.focus();
    fireEvent.keyDown(lastElement, { key: 'Tab', code: 'Tab' });
    await waitFor(() => {}, { timeout: 100 });

    if (document.activeElement !== firstElement) return false;

    // Test backward trapping
    firstElement.focus();
    fireEvent.keyDown(firstElement, { key: 'Tab', code: 'Tab', shiftKey: true });
    await waitFor(() => {}, { timeout: 100 });

    return document.activeElement === lastElement;
  }

  /**
   * Check if container has skip links
   */
  private hasSkipLinks(container: HTMLElement): boolean {
    const skipLinks = container.querySelectorAll('a[href^="#"]');
    return Array.from(skipLinks).some(link =>
      link.textContent?.toLowerCase().includes('skip') ||
      link.getAttribute('aria-label')?.toLowerCase().includes('skip'),
    );
  }

  /**
   * Count ARIA labels
   */
  private countAriaLabels(container: HTMLElement): number {
    return container.querySelectorAll('[aria-label], [aria-labelledby]').length;
  }

  /**
   * Find elements missing labels
   */
  private findMissingLabels(container: HTMLElement): ScreenReaderIssue[] {
    const issues: ScreenReaderIssue[] = [];
    const interactiveElements = container.querySelectorAll('button, input, select, textarea');

    interactiveElements.forEach(element => {
      if (!this.hasAccessibleName(element as HTMLElement)) {
        issues.push({
          type: 'missing-label',
          element: element as HTMLElement,
          description: 'Interactive element lacks accessible name',
          severity: 'high',
          suggestion: 'Add aria-label, aria-labelledby, or associated label element',
        });
      }
    });

    return issues;
  }

  /**
   * Check if element has accessible name
   */
  private hasAccessibleName(element: HTMLElement): boolean {
    return !!(
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.getAttribute('title') ||
      element.textContent?.trim() ||
      (element.tagName === 'INPUT' && element.getAttribute('placeholder'))
    );
  }

  /**
   * Count landmarks
   */
  private countLandmarks(container: HTMLElement): number {
    const landmarkSelectors = [
      'main', 'nav', 'aside', 'header', 'footer', 'section',
      '[role="main"]', '[role="navigation"]', '[role="complementary"]',
      '[role="banner"]', '[role="contentinfo"]', '[role="region"]',
    ];

    return container.querySelectorAll(landmarkSelectors.join(', ')).length;
  }

  /**
   * Validate landmarks
   */
  private validateLandmarks(container: HTMLElement): ScreenReaderIssue[] {
    const issues: ScreenReaderIssue[] = [];

    // Check for main landmark
    const mainLandmarks = container.querySelectorAll('main, [role="main"]');
    if (mainLandmarks.length === 0) {
      issues.push({
        type: 'missing-landmark',
        element: container,
        description: 'Page lacks main landmark',
        severity: 'medium',
        suggestion: 'Add <main> element or role="main" to identify main content',
      });
    } else if (mainLandmarks.length > 1) {
      issues.push({
        type: 'missing-landmark',
        element: container,
        description: 'Multiple main landmarks found',
        severity: 'medium',
        suggestion: 'Use only one main landmark per page',
      });
    }

    return issues;
  }

  /**
   * Validate heading structure
   */
  private validateHeadingStructure(container: HTMLElement): { valid: boolean; issues: string[] } {
    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const issues: string[] = [];
    let previousLevel = 0;

    for (const heading of headings) {
      const level = parseInt(heading.tagName.charAt(1), 10);

      if (level > previousLevel + 1) {
        issues.push(`Heading level ${level} follows level ${previousLevel}, skipping levels`);
      }

      previousLevel = level;
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Count alt texts
   */
  private countAltTexts(container: HTMLElement): number {
    return container.querySelectorAll('img[alt]').length;
  }

  /**
   * Find missing alt texts
   */
  private findMissingAltTexts(container: HTMLElement): ScreenReaderIssue[] {
    const issues: ScreenReaderIssue[] = [];
    const images = container.querySelectorAll('img');

    images.forEach(img => {
      if (!img.hasAttribute('alt')) {
        issues.push({
          type: 'missing-alt',
          element: img,
          description: 'Image lacks alt attribute',
          severity: 'high',
          suggestion: 'Add descriptive alt text or empty alt="" for decorative images',
        });
      }
    });

    return issues;
  }

  /**
   * Check if element has text content
   */
  private hasTextContent(element: HTMLElement): boolean {
    return !!(element.textContent?.trim() || element.getAttribute('aria-label'));
  }

  /**
   * Check color contrast
   */
  private async checkColorContrast(element: HTMLElement): Promise<ColorContrastIssue | null> {
    const computedStyle = window.getComputedStyle(element);
    const color = computedStyle.color;
    const backgroundColor = computedStyle.backgroundColor;

    if (color === 'rgba(0, 0, 0, 0)' || backgroundColor === 'rgba(0, 0, 0, 0)') {
      return null; // Skip transparent elements
    }

    const ratio = this.calculateContrastRatio(color, backgroundColor);
    const fontSize = parseFloat(computedStyle.fontSize);
    const fontWeight = computedStyle.fontWeight;

    const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight, 10) >= 700));
    const requiredRatio = this.config.wcagLevel === 'AAA'
      ? (isLargeText ? 4.5 : 7)
      : (isLargeText ? 3 : 4.5);

    if (ratio < requiredRatio) {
      return {
        element,
        foreground: color,
        background: backgroundColor,
        ratio,
        requiredRatio,
        level: this.config.wcagLevel,
        size: isLargeText ? 'large' : 'normal',
        suggestion: `Increase contrast ratio to at least ${requiredRatio}:1`,
      };
    }

    return null;
  }

  /**
   * Calculate contrast ratio between two colors
   */
  private calculateContrastRatio(color1: string, color2: string): number {
    const luminance1 = this.getLuminance(color1);
    const luminance2 = this.getLuminance(color2);

    const lighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Get luminance of color
   */
  private getLuminance(color: string): number {
    const rgb = this.parseColor(color);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Parse color string to RGB
   */
  private parseColor(color: string): { r: number; g: number; b: number } | null {
    // Handle rgb() format
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1], 10),
        g: parseInt(rgbMatch[2], 10),
        b: parseInt(rgbMatch[3], 10),
      };
    }

    // Handle hex format
    const hexMatch = color.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (hexMatch) {
      return {
        r: parseInt(hexMatch[1], 16),
        g: parseInt(hexMatch[2], 16),
        b: parseInt(hexMatch[3], 16),
      };
    }

    return null;
  }

  /**
   * Test focus indicators
   */
  private async testFocusIndicators(container: HTMLElement): Promise<boolean> {
    const focusableElements = this.getFocusableElements(container);
    return focusableElements.every(element => this.hasFocusIndicator(element));
  }

  /**
   * Test focus order
   */
  private async testFocusOrder(container: HTMLElement): Promise<boolean> {
    const tabbableElements = this.getTabbableElements(container);
    const issues = await this.testTabOrder(tabbableElements);
    return issues.length === 0;
  }

  /**
   * Check if element is interactive
   */
  private isInteractiveElement(element: HTMLElement): boolean {
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
    const interactiveRoles = ['button', 'link', 'menuitem', 'tab'];

    return interactiveTags.includes(element.tagName.toLowerCase()) ||
           interactiveRoles.includes(element.getAttribute('role') || '') ||
           element.hasAttribute('onclick') ||
           element.hasAttribute('tabindex');
  }

  /**
   * Check if container is a modal
   */
  private isModal(container: HTMLElement): boolean {
    return !!(
      container.getAttribute('role') === 'dialog' ||
      container.getAttribute('role') === 'alertdialog' ||
      container.hasAttribute('aria-modal') ||
      container.classList.contains('modal')
    );
  }

  /**
   * Build axe rules configuration
   */
  private buildAxeRulesConfig(): Record<string, { enabled: boolean }> {
    const rules: Record<string, { enabled: boolean }> = {};

    // Enable included rules
    this.config.includeRules.forEach(rule => {
      rules[rule] = { enabled: true };
    });

    // Disable excluded rules
    this.config.excludeRules.forEach(rule => {
      rules[rule] = { enabled: false };
    });

    return rules;
  }

  /**
   * Generate suggestion for violation
   */
  private generateSuggestion(ruleId: string, element: HTMLElement): string {
    const suggestions: Record<string, string> = {
      'color-contrast': 'Increase the contrast ratio between text and background colors',
      'label': 'Add an accessible name using aria-label, aria-labelledby, or a label element',
      'button-name': 'Provide accessible text content or aria-label for the button',
      'link-name': 'Ensure links have accessible text content or aria-label',
      'image-alt': 'Add descriptive alt text to images',
      'heading-order': 'Use heading elements in a logical, hierarchical order',
      'landmark-one-main': 'Use only one main landmark per page',
      'region': 'Add landmarks to identify page regions',
      'focus-order-semantics': 'Ensure focus order matches the visual order',
      'keyboard': 'Make all interactive elements keyboard accessible',
    };

    return suggestions[ruleId] || 'Review element for accessibility compliance';
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(violations: AccessibilityViolation[], container: HTMLElement): AccessibilitySummary {
    const totalElements = container.querySelectorAll('*').length;
    const violatingElements = new Set(violations.map(v => v.element)).size;

    const criticalViolations = violations.filter(v => v.impact === 'critical').length;
    const seriousViolations = violations.filter(v => v.impact === 'serious').length;
    const moderateViolations = violations.filter(v => v.impact === 'moderate').length;
    const minorViolations = violations.filter(v => v.impact === 'minor').length;

    const complianceScore = Math.max(0, 100 - (
      criticalViolations * 25 +
      seriousViolations * 15 +
      moderateViolations * 10 +
      minorViolations * 5
    ));

    return {
      totalElements,
      violatingElements,
      criticalViolations,
      seriousViolations,
      moderateViolations,
      minorViolations,
      wcagLevel: this.config.wcagLevel,
      complianceScore,
    };
  }

  /**
   * Calculate overall accessibility score
   */
  private calculateAccessibilityScore(
    summary: AccessibilitySummary,
    keyboardNav?: KeyboardNavigationResult,
    screenReader?: ScreenReaderResult,
    colorContrast?: ColorContrastResult,
    focusManagement?: FocusManagementResult,
  ): number {
    let score = summary.complianceScore;

    // Adjust score based on specific test results
    if (keyboardNav && !keyboardNav.passed) score -= 10;
    if (screenReader && !screenReader.passed) score -= 10;
    if (colorContrast && !colorContrast.passed) score -= 15;
    if (focusManagement && !focusManagement.passed) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Initialize custom accessibility rules
   */
  private initializeCustomRules(): void {
    // Add custom rules from config
    this.config.customRules.forEach(rule => {
      this.customRules.set(rule.id, rule);
    });

    // Add built-in custom rules
    this.addBuiltInRules();
  }

  /**
   * Add built-in custom rules
   */
  private addBuiltInRules(): void {
    // Custom rule for form validation
    this.customRules.set('form-validation', {
      id: 'form-validation',
      name: 'Form Validation Accessibility',
      description: 'Ensures form validation messages are accessible',
      impact: 'serious',
      tags: ['forms', 'validation'],
      check: (container: HTMLElement) => {
        const violations: AccessibilityViolation[] = [];
        const forms = container.querySelectorAll('form');

        forms.forEach(form => {
          const inputs = form.querySelectorAll('input, select, textarea');
          inputs.forEach(input => {
            const hasValidation = input.hasAttribute('aria-describedby') ||
                                input.hasAttribute('aria-invalid');

            if (!hasValidation) {
              violations.push({
                ruleId: 'form-validation',
                impact: 'serious',
                message: 'Form input lacks validation accessibility attributes',
                element: input as HTMLElement,
                selector: this.generateSelector(input as HTMLElement),
                help: 'Add aria-describedby and aria-invalid attributes for form validation',
                suggestion: 'Use aria-describedby to reference validation messages and aria-invalid to indicate validation state',
                wcagCriteria: ['wcag2a'],
              });
            }
          });
        });

        return violations;
      },
    });

    // Custom rule for interactive elements
    this.customRules.set('interactive-elements', {
      id: 'interactive-elements',
      name: 'Interactive Elements Accessibility',
      description: 'Ensures interactive elements are properly accessible',
      impact: 'serious',
      tags: ['interactive', 'keyboard'],
      check: (container: HTMLElement) => {
        const violations: AccessibilityViolation[] = [];
        const interactiveElements = container.querySelectorAll('[onclick], [onkeydown]');

        interactiveElements.forEach(element => {
          const htmlElement = element as HTMLElement;
          if (!this.isInteractiveElement(htmlElement) && !htmlElement.hasAttribute('role')) {
            violations.push({
              ruleId: 'interactive-elements',
              impact: 'serious',
              message: 'Interactive element lacks proper role or semantic meaning',
              element: htmlElement,
              selector: this.generateSelector(htmlElement),
              help: 'Add appropriate role attribute or use semantic HTML elements',
              suggestion: 'Use button, link, or other semantic elements, or add role="button" with keyboard support',
              wcagCriteria: ['wcag2a'],
            });
          }
        });

        return violations;
      },
    });
  }

  /**
   * Generate selector for element
   */
  private generateSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  /**
   * Add custom accessibility rule
   */
  addRule(rule: AccessibilityRule): void {
    this.customRules.set(rule.id, rule);
  }

  /**
   * Remove accessibility rule
   */
  removeRule(ruleId: string): boolean {
    return this.customRules.delete(ruleId);
  }

  /**
   * Get all accessibility rules
   */
  getRules(): AccessibilityRule[] {
    return Array.from(this.customRules.values());
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AccessibilityTestConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate accessibility report
   */
  generateReport(result: AccessibilityTestResult): string {
    let report = '# Accessibility Test Report\n\n';

    report += `**Overall Score:** ${result.score}/100\n`;
    report += `**Status:** ${result.passed ? 'PASSED' : 'FAILED'}\n`;
    report += `**WCAG Level:** ${result.summary.wcagLevel}\n\n`;

    report += '## Summary\n';
    report += `- Total Elements: ${result.summary.totalElements}\n`;
    report += `- Violating Elements: ${result.summary.violatingElements}\n`;
    report += `- Critical Violations: ${result.summary.criticalViolations}\n`;
    report += `- Serious Violations: ${result.summary.seriousViolations}\n`;
    report += `- Moderate Violations: ${result.summary.moderateViolations}\n`;
    report += `- Minor Violations: ${result.summary.minorViolations}\n\n`;

    if (result.violations.length > 0) {
      report += '## Violations\n\n';
      result.violations.forEach((violation, index) => {
        report += `### ${index + 1}. ${violation.message}\n`;
        report += `- **Impact:** ${violation.impact}\n`;
        report += `- **Element:** ${violation.selector}\n`;
        report += `- **Help:** ${violation.help}\n`;
        report += `- **Suggestion:** ${violation.suggestion}\n\n`;
      });
    }

    return report;
  }

  /**
   * Get current configuration
   */
  getConfig(): AccessibilityTestConfig {
    return { ...this.config };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.customRules.clear();
  }
}

/**
 * Create accessibility tester instance
 */
export function createAccessibilityTester(config?: Partial<AccessibilityTestConfig>): AccessibilityTester {
  return new AccessibilityTester(config);
}
