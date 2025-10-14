/**
 * Style Regression Tester
 *
 * Comprehensive style regression testing system that captures,
 * compares, and validates component styles across different
 * states, themes, and viewport sizes.
 */
import { JSDOM } from 'jsdom';

export interface StyleSnapshot {
  id: string;
  timestamp: Date;
  component: string;
  variant?: string;
  viewport: ViewportConfig;
  theme: string;
  styles: ComputedStyleMap;
  screenshot?: string;
}

export interface ComputedStyleMap {
  [selector: string]: {
    [property: string]: string;
  };
}

export interface ViewportConfig {
  width: number;
  height: number;
  devicePixelRatio: number;
  orientation?: 'portrait' | 'landscape';
}

export interface StyleComparisonResult {
  passed: boolean;
  differences: StyleDifference[];
  score: number;
  summary: ComparisonSummary;
}

export interface StyleDifference {
  selector: string;
  property: string;
  expected: string;
  actual: string;
  severity: 'minor' | 'major' | 'critical';
  impact: string;
}

export interface ComparisonSummary {
  totalElements: number;
  changedElements: number;
  addedElements: number;
  removedElements: number;
  criticalChanges: number;
  majorChanges: number;
  minorChanges: number;
}

export interface StyleTestConfig {
  captureScreenshots: boolean;
  ignoreProperties: string[];
  tolerances: StyleTolerances;
  breakpoints: number[];
  themes: string[];
  variants: string[];
  baselineDir: string;
  outputDir: string;
}

export interface StyleTolerances {
  color: number; // Color difference tolerance (0-100)
  size: number; // Size difference tolerance in pixels
  position: number; // Position difference tolerance in pixels
  opacity: number; // Opacity difference tolerance (0-1)
}

export interface ResponsiveTestResult {
  breakpoint: number;
  passed: boolean;
  issues: ResponsiveIssue[];
}

export interface ResponsiveIssue {
  type: 'overflow' | 'layout-shift' | 'text-truncation' | 'element-collision';
  element: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export class StyleRegressionTester {
  private config: StyleTestConfig;
  private snapshots: Map<string, StyleSnapshot> = new Map();
  private dom: JSDOM;

  constructor(config: Partial<StyleTestConfig> = {}) {
    this.config = {
      captureScreenshots: false,
      ignoreProperties: ['transition', 'animation', 'cursor'],
      tolerances: {
        color: 5,
        size: 2,
        position: 1,
        opacity: 0.01,
      },
      breakpoints: [320, 768, 1024, 1440],
      themes: ['light', 'dark'],
      variants: ['default'],
      baselineDir: './tests/style-baselines',
      outputDir: './tests/style-outputs',
      ...config,
    };

    this.dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      pretendToBeVisual: true,
      resources: 'usable',
    });

    this.setupDOM();
  }

  /**
   * Capture style snapshot of component
   */
  async captureSnapshot(
    container: HTMLElement,
    options: {
      id: string;
      component: string;
      variant?: string;
      viewport?: ViewportConfig;
      theme?: string;
    },
  ): Promise<StyleSnapshot> {
    const viewport = options.viewport || {
      width: 1024,
      height: 768,
      devicePixelRatio: 1,
    };

    const theme = options.theme || 'light';

    // Set viewport
    this.setViewport(viewport);

    // Apply theme
    this.applyTheme(theme);

    // Capture computed styles
    const styles = this.captureComputedStyles(container);

    // Capture screenshot if enabled
    let screenshot: string | undefined;
    if (this.config.captureScreenshots) {
      screenshot = await this.captureScreenshot(container);
    }

    const snapshot: StyleSnapshot = {
      id: options.id,
      timestamp: new Date(),
      component: options.component,
      variant: options.variant,
      viewport,
      theme,
      styles,
      screenshot,
    };

    this.snapshots.set(options.id, snapshot);
    return snapshot;
  }

  /**
   * Compare current styles with baseline
   */
  async compareWithBaseline(
    container: HTMLElement,
    baselineId: string,
    options?: {
      component: string;
      variant?: string;
      viewport?: ViewportConfig;
      theme?: string;
    },
  ): Promise<StyleComparisonResult> {
    // Capture current snapshot
    const currentSnapshot = await this.captureSnapshot(container, {
      id: `${baselineId}-current`,
      component: options?.component || 'unknown',
      variant: options?.variant,
      viewport: options?.viewport,
      theme: options?.theme,
    });

    // Load baseline snapshot
    const baselineSnapshot = await this.loadBaseline(baselineId);
    if (!baselineSnapshot) {
      throw new Error(`Baseline snapshot not found: ${baselineId}`);
    }

    return this.compareSnapshots(baselineSnapshot, currentSnapshot);
  }

  /**
   * Compare two style snapshots
   */
  compareSnapshots(
    baseline: StyleSnapshot,
    current: StyleSnapshot,
  ): StyleComparisonResult {
    const differences: StyleDifference[] = [];
    const baselineSelectors = new Set(Object.keys(baseline.styles));
    const currentSelectors = new Set(Object.keys(current.styles));

    // Find differences in existing elements
    for (const selector of baselineSelectors) {
      if (currentSelectors.has(selector)) {
        const baselineStyles = baseline.styles[selector];
        const currentStyles = current.styles[selector];

        for (const property of Object.keys(baselineStyles)) {
          if (this.config.ignoreProperties.includes(property)) continue;

          const baselineValue = baselineStyles[property];
          const currentValue = currentStyles[property] || '';

          if (!this.areStylesEqual(property, baselineValue, currentValue)) {
            differences.push({
              selector,
              property,
              expected: baselineValue,
              actual: currentValue,
              severity: this.calculateSeverity(property, baselineValue, currentValue),
              impact: this.calculateImpact(property, baselineValue, currentValue),
            });
          }
        }
      }
    }

    // Calculate summary
    const summary: ComparisonSummary = {
      totalElements: baselineSelectors.size,
      changedElements: differences.length > 0 ? new Set(differences.map(d => d.selector)).size : 0,
      addedElements: currentSelectors.size - baselineSelectors.size,
      removedElements: baselineSelectors.size - currentSelectors.size,
      criticalChanges: differences.filter(d => d.severity === 'critical').length,
      majorChanges: differences.filter(d => d.severity === 'major').length,
      minorChanges: differences.filter(d => d.severity === 'minor').length,
    };

    // Calculate overall score
    const score = this.calculateComparisonScore(summary);

    return {
      passed: summary.criticalChanges === 0 && summary.majorChanges === 0,
      differences,
      score,
      summary,
    };
  }

  /**
   * Test responsive behavior across breakpoints
   */
  async testResponsive(
    container: HTMLElement,
    component: string,
  ): Promise<ResponsiveTestResult[]> {
    const results: ResponsiveTestResult[] = [];

    for (const breakpoint of this.config.breakpoints) {
      const viewport: ViewportConfig = {
        width: breakpoint,
        height: 768,
        devicePixelRatio: 1,
      };

      this.setViewport(viewport);

      // Wait for responsive changes
      await this.waitForStyleChanges();

      const issues = await this.detectResponsiveIssues(container, breakpoint);

      results.push({
        breakpoint,
        passed: issues.length === 0,
        issues,
      });
    }

    return results;
  }

  /**
   * Test theme variations
   */
  async testThemes(
    container: HTMLElement,
    component: string,
    variant?: string,
  ): Promise<Map<string, StyleComparisonResult>> {
    const results = new Map<string, StyleComparisonResult>();
    let baselineSnapshot: StyleSnapshot | null = null;

    for (const theme of this.config.themes) {
      this.applyTheme(theme);
      await this.waitForStyleChanges();

      const snapshot = await this.captureSnapshot(container, {
        id: `${component}-${variant || 'default'}-${theme}`,
        component,
        variant,
        theme,
      });

      if (!baselineSnapshot) {
        baselineSnapshot = snapshot;
      } else {
        const comparison = this.compareSnapshots(baselineSnapshot, snapshot);
        results.set(theme, comparison);
      }
    }

    return results;
  }

  /**
   * Capture computed styles for all elements
   */
  private captureComputedStyles(container: HTMLElement): ComputedStyleMap {
    const styles: ComputedStyleMap = {};
    const elements = container.querySelectorAll('*');

    elements.forEach((element, index) => {
      const computedStyle = window.getComputedStyle(element);
      const selector = this.generateSelector(element, index);

      styles[selector] = {};

      // Capture relevant style properties
      const relevantProperties = [
        'display', 'position', 'top', 'right', 'bottom', 'left',
        'width', 'height', 'margin', 'padding', 'border',
        'color', 'background-color', 'background-image',
        'font-family', 'font-size', 'font-weight', 'line-height',
        'text-align', 'text-decoration', 'text-transform',
        'opacity', 'visibility', 'z-index', 'transform',
        'box-shadow', 'border-radius', 'overflow',
      ];

      relevantProperties.forEach(property => {
        const value = computedStyle.getPropertyValue(property);
        if (value && value !== 'initial' && value !== 'inherit') {
          styles[selector][property] = value;
        }
      });
    });

    return styles;
  }

  /**
   * Generate unique selector for element
   */
  private generateSelector(element: Element, index: number): string {
    // Try to use data-testid first
    const testId = element.getAttribute('data-testid');
    if (testId) return `[data-testid="${testId}"]`;

    // Try to use id
    if (element.id) return `#${element.id}`;

    // Try to use class names
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(/\s+/);
      if (classes.length > 0 && classes[0]) {
        return `.${classes[0]}`;
      }
    }

    // Use tag name with index as fallback
    return `${element.tagName.toLowerCase()}:nth-child(${index + 1})`;
  }

  /**
   * Check if two style values are equal within tolerance
   */
  private areStylesEqual(property: string, value1: string, value2: string): boolean {
    if (value1 === value2) return true;

    // Handle color comparisons
    if (this.isColorProperty(property)) {
      return this.areColorsEqual(value1, value2);
    }

    // Handle size comparisons
    if (this.isSizeProperty(property)) {
      return this.areSizesEqual(value1, value2);
    }

    // Handle position comparisons
    if (this.isPositionProperty(property)) {
      return this.arePositionsEqual(value1, value2);
    }

    // Handle opacity comparisons
    if (property === 'opacity') {
      return this.areOpacitiesEqual(value1, value2);
    }

    return false;
  }

  /**
   * Check if property is color-related
   */
  private isColorProperty(property: string): boolean {
    return ['color', 'background-color', 'border-color'].includes(property);
  }

  /**
   * Check if property is size-related
   */
  private isSizeProperty(property: string): boolean {
    return ['width', 'height', 'font-size', 'margin', 'padding'].some(p =>
      property.includes(p),
    );
  }

  /**
   * Check if property is position-related
   */
  private isPositionProperty(property: string): boolean {
    return ['top', 'right', 'bottom', 'left'].includes(property);
  }

  /**
   * Compare colors within tolerance
   */
  private areColorsEqual(color1: string, color2: string): boolean {
    const rgb1 = this.parseColor(color1);
    const rgb2 = this.parseColor(color2);

    if (!rgb1 || !rgb2) return color1 === color2;

    const diff = Math.sqrt(
      Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2),
    );

    return diff <= this.config.tolerances.color;
  }

  /**
   * Compare sizes within tolerance
   */
  private areSizesEqual(size1: string, size2: string): boolean {
    const px1 = this.parsePixels(size1);
    const px2 = this.parsePixels(size2);

    if (px1 === null || px2 === null) return size1 === size2;

    return Math.abs(px1 - px2) <= this.config.tolerances.size;
  }

  /**
   * Compare positions within tolerance
   */
  private arePositionsEqual(pos1: string, pos2: string): boolean {
    const px1 = this.parsePixels(pos1);
    const px2 = this.parsePixels(pos2);

    if (px1 === null || px2 === null) return pos1 === pos2;

    return Math.abs(px1 - px2) <= this.config.tolerances.position;
  }

  /**
   * Compare opacities within tolerance
   */
  private areOpacitiesEqual(opacity1: string, opacity2: string): boolean {
    const op1 = parseFloat(opacity1);
    const op2 = parseFloat(opacity2);

    if (isNaN(op1) || isNaN(op2)) return opacity1 === opacity2;

    return Math.abs(op1 - op2) <= this.config.tolerances.opacity;
  }

  /**
   * Parse color string to RGB values
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
   * Parse pixel values from CSS strings
   */
  private parsePixels(value: string): number | null {
    const match = value.match(/^(\d+(?:\.\d+)?)px$/);
    return match ? parseFloat(match[1]) : null;
  }

  /**
   * Calculate severity of style difference
   */
  private calculateSeverity(
    property: string,
    expected: string,
    actual: string,
  ): 'minor' | 'major' | 'critical' {
    // Critical changes that break layout
    if (['display', 'position'].includes(property)) {
      return 'critical';
    }

    // Major changes that significantly affect appearance
    if (['width', 'height', 'color', 'background-color'].includes(property)) {
      return 'major';
    }

    // Minor changes
    return 'minor';
  }

  /**
   * Calculate impact description
   */
  private calculateImpact(
    property: string,
    expected: string,
    actual: string,
  ): string {
    switch (property) {
      case 'display':
        return 'Element visibility and layout structure changed';
      case 'position':
        return 'Element positioning method changed';
      case 'color':
        return 'Text color changed, may affect readability';
      case 'background-color':
        return 'Background color changed, may affect visual hierarchy';
      case 'width':
      case 'height':
        return 'Element dimensions changed, may affect layout';
      default:
        return `${property} value changed from ${expected} to ${actual}`;
    }
  }

  /**
   * Calculate overall comparison score
   */
  private calculateComparisonScore(summary: ComparisonSummary): number {
    let score = 100;

    // Deduct points for changes
    score -= summary.criticalChanges * 20;
    score -= summary.majorChanges * 10;
    score -= summary.minorChanges * 2;
    score -= summary.addedElements * 5;
    score -= summary.removedElements * 5;

    return Math.max(0, score);
  }

  /**
   * Detect responsive issues
   */
  private async detectResponsiveIssues(
    container: HTMLElement,
    breakpoint: number,
  ): Promise<ResponsiveIssue[]> {
    const issues: ResponsiveIssue[] = [];
    const elements = container.querySelectorAll('*');

    elements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(element);

      // Check for horizontal overflow
      if (rect.right > breakpoint) {
        issues.push({
          type: 'overflow',
          element: this.generateSelector(element, 0),
          description: `Element extends beyond viewport width at ${breakpoint}px`,
          severity: 'high',
          suggestion: 'Add responsive styles or use flexible units',
        });
      }

      // Check for text truncation
      if (computedStyle.textOverflow === 'ellipsis' && element.scrollWidth > element.clientWidth) {
        issues.push({
          type: 'text-truncation',
          element: this.generateSelector(element, 0),
          description: 'Text is being truncated',
          severity: 'medium',
          suggestion: 'Consider using responsive typography or multi-line text',
        });
      }

      // Check for element collisions
      const siblings = Array.from(element.parentElement?.children || []);
      siblings.forEach(sibling => {
        if (sibling !== element) {
          const siblingRect = sibling.getBoundingClientRect();
          if (this.elementsOverlap(rect, siblingRect)) {
            issues.push({
              type: 'element-collision',
              element: this.generateSelector(element, 0),
              description: 'Element overlaps with sibling element',
              severity: 'high',
              suggestion: 'Adjust spacing or use responsive layout techniques',
            });
          }
        }
      });
    });

    return issues;
  }

  /**
   * Check if two elements overlap
   */
  private elementsOverlap(rect1: DOMRect, rect2: DOMRect): boolean {
    return !(rect1.right < rect2.left ||
             rect2.right < rect1.left ||
             rect1.bottom < rect2.top ||
             rect2.bottom < rect1.top);
  }

  /**
   * Set viewport size
   */
  private setViewport(viewport: ViewportConfig): void {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: viewport.width,
    });

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: viewport.height,
    });

    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      configurable: true,
      value: viewport.devicePixelRatio,
    });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
  }

  /**
   * Apply theme
   */
  private applyTheme(theme: string): void {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.className = theme;
  }

  /**
   * Wait for style changes to apply
   */
  private async waitForStyleChanges(): Promise<void> {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  }

  /**
   * Capture screenshot (placeholder implementation)
   */
  private async captureScreenshot(container: HTMLElement): Promise<string> {
    // This would integrate with a screenshot library like Puppeteer
    // For now, return a placeholder
    return `screenshot-${Date.now()}.png`;
  }

  /**
   * Load baseline snapshot
   */
  private async loadBaseline(id: string): Promise<StyleSnapshot | null> {
    // This would load from file system or database
    // For now, return from memory
    return this.snapshots.get(id) || null;
  }

  /**
   * Setup DOM environment
   */
  private setupDOM(): void {
    // Set up global window and document
    global.window = this.dom.window as any;
    global.document = this.dom.window.document;
    global.requestAnimationFrame = (callback: FrameRequestCallback) => {
      return setTimeout(callback, 16);
    };
  }

  /**
   * Save snapshot to baseline
   */
  async saveBaseline(snapshot: StyleSnapshot): Promise<void> {
    // This would save to file system
    this.snapshots.set(snapshot.id, snapshot);
  }

  /**
   * Generate style regression report
   */
  generateReport(results: StyleComparisonResult[]): string {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    let report = '# Style Regression Test Report\n\n';
    report += '**Summary:**\n';
    report += `- Total Tests: ${totalTests}\n`;
    report += `- Passed: ${passedTests}\n`;
    report += `- Failed: ${failedTests}\n`;
    report += `- Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n\n`;

    if (failedTests > 0) {
      report += '## Failed Tests\n\n';
      results.filter(r => !r.passed).forEach((result, index) => {
        report += `### Test ${index + 1}\n`;
        report += `- Score: ${result.score}/100\n`;
        report += `- Critical Changes: ${result.summary.criticalChanges}\n`;
        report += `- Major Changes: ${result.summary.majorChanges}\n`;
        report += `- Minor Changes: ${result.summary.minorChanges}\n\n`;

        if (result.differences.length > 0) {
          report += '**Differences:**\n';
          result.differences.forEach(diff => {
            report += `- ${diff.selector} - ${diff.property}: ${diff.expected} → ${diff.actual} (${diff.severity})\n`;
          });
          report += '\n';
        }
      });
    }

    return report;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.snapshots.clear();
    this.dom.window.close();
  }
}

/**
 * Create style regression tester instance
 */
export function createStyleRegressionTester(config?: Partial<StyleTestConfig>): StyleRegressionTester {
  return new StyleRegressionTester(config);
}
