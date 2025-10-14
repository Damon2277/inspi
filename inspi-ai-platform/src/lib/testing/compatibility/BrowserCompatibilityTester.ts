/**
 * Browser Compatibility Testing System
 * Tests compatibility across different browser environments
 */

import { EnvironmentDetector } from './EnvironmentDetector';
import { BrowserInfo, BrowserFeature, CompatibilityTestResult, BrowserConfig } from './types';

export class BrowserCompatibilityTester {
  private supportedBrowsers: BrowserConfig[] = [
    {
      name: 'chrome',
      versions: ['latest', '119', '118', '117'],
      headless: true,
      viewport: { width: 1920, height: 1080 },
    },
    {
      name: 'firefox',
      versions: ['latest', '119', '118'],
      headless: true,
      viewport: { width: 1920, height: 1080 },
    },
    {
      name: 'safari',
      versions: ['latest', '16', '15'],
      headless: false,
      viewport: { width: 1920, height: 1080 },
    },
    {
      name: 'edge',
      versions: ['latest', '119', '118'],
      headless: true,
      viewport: { width: 1920, height: 1080 },
    },
  ];

  private testTimeout = 300000; // 5 minutes

  /**
   * Test compatibility across multiple browsers
   */
  async testMultipleBrowsers(
    testCommand: string,
    browsers?: BrowserConfig[],
  ): Promise<CompatibilityTestResult[]> {
    const browsersToTest = browsers || this.supportedBrowsers;
    const results: CompatibilityTestResult[] = [];

    for (const browser of browsersToTest) {
      for (const version of browser.versions) {
        try {
          const result = await this.testSingleBrowser(browser, version, testCommand);
          results.push(result);
        } catch (error) {
          results.push({
            environment: await EnvironmentDetector.getEnvironmentInfo(),
            testSuite: `${browser.name}-${version}`,
            passed: false,
            duration: 0,
            errors: [{
              type: 'platform',
              message: `Failed to test ${browser.name} ${version}: ${error}`,
              severity: 'critical',
              affectedTests: ['all'],
            }],
            warnings: [],
            performance: this.getEmptyPerformanceMetrics(),
          });
        }
      }
    }

    return results;
  }

  /**
   * Test compatibility with a specific browser
   */
  async testSingleBrowser(
    browser: BrowserConfig,
    version: string,
    testCommand: string,
  ): Promise<CompatibilityTestResult> {
    const startTime = Date.now();
    const environment = await EnvironmentDetector.getEnvironmentInfo();

    // Check if browser is available
    const isAvailable = await this.isBrowserAvailable(browser.name, version);
    if (!isAvailable) {
      return {
        environment,
        testSuite: `${browser.name}-${version}`,
        passed: false,
        duration: Date.now() - startTime,
        errors: [{
          type: 'platform',
          message: `Browser ${browser.name} ${version} is not available`,
          severity: 'critical',
          suggestion: 'Install the required browser or use a different testing strategy',
          affectedTests: ['all'],
        }],
        warnings: [],
        performance: this.getEmptyPerformanceMetrics(),
      };
    }

    try {
      const testResult = await this.runBrowserTest(browser, version, testCommand);
      const duration = Date.now() - startTime;

      return {
        environment,
        testSuite: `${browser.name}-${version}`,
        passed: testResult.passed,
        duration,
        errors: testResult.errors,
        warnings: testResult.warnings,
        performance: testResult.performance,
      };
    } catch (error) {
      return {
        environment,
        testSuite: `${browser.name}-${version}`,
        passed: false,
        duration: Date.now() - startTime,
        errors: [{
          type: 'platform',
          message: `Error running browser tests: ${error}`,
          severity: 'critical',
          affectedTests: ['all'],
        }],
        warnings: [],
        performance: this.getEmptyPerformanceMetrics(),
      };
    }
  }

  /**
   * Get browser feature compatibility matrix
   */
  async getBrowserFeatureMatrix(): Promise<{
    browser: string;
    version: string;
    features: BrowserFeature[];
  }[]> {
    const matrix = [];

    for (const browser of this.supportedBrowsers) {
      for (const version of browser.versions) {
        const features = await this.getBrowserFeatures(browser.name, version);
        matrix.push({
          browser: browser.name,
          version,
          features,
        });
      }
    }

    return matrix;
  }

  /**
   * Detect browser capabilities
   */
  async detectBrowserCapabilities(
    browserName: string,
    version: string,
  ): Promise<BrowserInfo> {
    const features = await this.getBrowserFeatures(browserName, version);
    const supported = this.isBrowserSupported(browserName, version);

    return {
      name: browserName,
      version,
      engine: this.getBrowserEngine(browserName),
      platform: process.platform,
      mobile: false, // Assuming desktop for now
      supported,
      features,
    };
  }

  /**
   * Check if browser is available for testing
   */
  private async isBrowserAvailable(browserName: string, version: string): Promise<boolean> {
    try {
      // For headless testing, we typically use Playwright or Puppeteer
      // This is a simplified check - in practice, you'd use the actual browser automation tools

      if (process.env.CI) {
        // In CI, assume browsers are available via browser automation tools
        return true;
      }

      // Local development - check if browser automation tools are available
      const { spawn } = require('child_process');

      return new Promise((resolve) => {
        const child = spawn('npx', ['playwright', 'install', '--dry-run'], {
          stdio: 'pipe',
        });

        child.on('close', (code) => {
          resolve(code === 0);
        });

        child.on('error', () => {
          resolve(false);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          child.kill();
          resolve(false);
        }, 10000);
      });
    } catch {
      return false;
    }
  }

  /**
   * Run tests in a specific browser
   */
  private async runBrowserTest(
    browser: BrowserConfig,
    version: string,
    testCommand: string,
  ): Promise<{
    passed: boolean;
    errors: any[];
    warnings: any[];
    performance: any;
  }> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    // Set up browser-specific environment variables
    const env = {
      ...process.env,
      BROWSER: browser.name,
      BROWSER_VERSION: version,
      HEADLESS: browser.headless ? 'true' : 'false',
      VIEWPORT_WIDTH: browser.viewport?.width?.toString() || '1920',
      VIEWPORT_HEIGHT: browser.viewport?.height?.toString() || '1080',
    };

    try {
      // Run the test command with browser-specific configuration
      const result = await this.runCommand(testCommand, { env, timeout: this.testTimeout });

      const endTime = Date.now();
      const endMemory = process.memoryUsage();

      const performance = {
        executionTime: endTime - startTime,
        memoryUsage: {
          peak: Math.max(endMemory.heapUsed, startMemory.heapUsed),
          average: (endMemory.heapUsed + startMemory.heapUsed) / 2,
          final: endMemory.heapUsed,
        },
        cpuUsage: {
          peak: 0,
          average: 0,
        },
      };

      return {
        passed: result.exitCode === 0,
        errors: result.exitCode !== 0 ? [{
          type: 'platform',
          message: `Browser tests failed: ${result.stderr}`,
          severity: 'major',
          affectedTests: this.parseFailedTests(result.stderr),
        }] : [],
        warnings: this.parseBrowserWarnings(result.stdout, result.stderr),
        performance,
      };
    } catch (error) {
      return {
        passed: false,
        errors: [{
          type: 'platform',
          message: `Browser test execution failed: ${error}`,
          severity: 'critical',
          affectedTests: ['all'],
        }],
        warnings: [],
        performance: this.getEmptyPerformanceMetrics(),
      };
    }
  }

  /**
   * Get browser features for a specific version
   */
  private async getBrowserFeatures(browserName: string, version: string): Promise<BrowserFeature[]> {
    const features: BrowserFeature[] = [];

    // Define feature support based on browser and version
    const featureMatrix = {
      chrome: {
        'es6-modules': { minVersion: 61, supported: true },
        'web-components': { minVersion: 67, supported: true },
        'service-workers': { minVersion: 45, supported: true },
        'webassembly': { minVersion: 57, supported: true },
        'css-grid': { minVersion: 57, supported: true },
        'fetch-api': { minVersion: 42, supported: true },
      },
      firefox: {
        'es6-modules': { minVersion: 60, supported: true },
        'web-components': { minVersion: 63, supported: true },
        'service-workers': { minVersion: 44, supported: true },
        'webassembly': { minVersion: 52, supported: true },
        'css-grid': { minVersion: 52, supported: true },
        'fetch-api': { minVersion: 39, supported: true },
      },
      safari: {
        'es6-modules': { minVersion: 10.1, supported: true },
        'web-components': { minVersion: 10.1, supported: true },
        'service-workers': { minVersion: 11.1, supported: true },
        'webassembly': { minVersion: 11, supported: true },
        'css-grid': { minVersion: 10.1, supported: true },
        'fetch-api': { minVersion: 10.1, supported: true },
      },
      edge: {
        'es6-modules': { minVersion: 16, supported: true },
        'web-components': { minVersion: 79, supported: true },
        'service-workers': { minVersion: 17, supported: true },
        'webassembly': { minVersion: 16, supported: true },
        'css-grid': { minVersion: 16, supported: true },
        'fetch-api': { minVersion: 14, supported: true },
      },
    };

    const browserFeatures = featureMatrix[browserName as keyof typeof featureMatrix];
    if (!browserFeatures) {
      return features;
    }

    const versionNumber = this.parseVersionNumber(version);

    for (const [featureName, featureInfo] of Object.entries(browserFeatures)) {
      const supported = versionNumber >= featureInfo.minVersion;
      features.push({
        name: featureName,
        supported,
        version: supported ? version : undefined,
        polyfillRequired: !supported,
      });
    }

    return features;
  }

  /**
   * Check if browser is supported
   */
  private isBrowserSupported(browserName: string, version: string): boolean {
    const supportedBrowsers = {
      chrome: 90,
      firefox: 88,
      safari: 14,
      edge: 90,
    };

    const minVersion = supportedBrowsers[browserName as keyof typeof supportedBrowsers];
    if (!minVersion) return false;

    const versionNumber = this.parseVersionNumber(version);
    return versionNumber >= minVersion;
  }

  /**
   * Get browser engine name
   */
  private getBrowserEngine(browserName: string): string {
    const engines = {
      chrome: 'Blink',
      firefox: 'Gecko',
      safari: 'WebKit',
      edge: 'Blink',
    };

    return engines[browserName as keyof typeof engines] || 'Unknown';
  }

  /**
   * Parse version number from version string
   */
  private parseVersionNumber(version: string): number {
    if (version === 'latest') return 999; // Assume latest is always supported

    const match = version.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Run a command and return result
   */
  private async runCommand(
    command: string,
    options: { env?: any; timeout?: number } = {},
  ): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }> {
    const { spawn } = require('child_process');

    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        stdio: 'pipe',
        env: options.env || process.env,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      const timeout = options.timeout || 30000;
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      child.on('close', (code: number) => {
        clearTimeout(timer);
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
        });
      });

      child.on('error', (error: Error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Parse failed tests from stderr
   */
  private parseFailedTests(stderr: string): string[] {
    const failedTests: string[] = [];
    const lines = stderr.split('\n');

    for (const line of lines) {
      // Look for browser test failure patterns
      const testMatch = line.match(/✗\s+(.+)/);
      if (testMatch) {
        failedTests.push(testMatch[1]);
      }
    }

    return failedTests.length > 0 ? failedTests : ['unknown'];
  }

  /**
   * Parse browser-specific warnings
   */
  private parseBrowserWarnings(stdout: string, stderr: string): Array<{
    type: 'deprecation' | 'performance' | 'compatibility';
    message: string;
    affectedTests: string[];
  }> {
    const warnings = [];
    const output = stdout + stderr;

    // Look for browser compatibility warnings
    const compatibilityMatches = output.match(/Warning: (.+) is not supported in (.+)/g);
    if (compatibilityMatches) {
      for (const match of compatibilityMatches) {
        warnings.push({
          type: 'compatibility' as const,
          message: match,
          affectedTests: ['all'],
        });
      }
    }

    // Look for performance warnings
    const performanceMatches = output.match(/Performance: (.+)/g);
    if (performanceMatches) {
      for (const match of performanceMatches) {
        warnings.push({
          type: 'performance' as const,
          message: match,
          affectedTests: ['all'],
        });
      }
    }

    return warnings;
  }

  /**
   * Get empty performance metrics
   */
  private getEmptyPerformanceMetrics() {
    return {
      executionTime: 0,
      memoryUsage: {
        peak: 0,
        average: 0,
        final: 0,
      },
      cpuUsage: {
        peak: 0,
        average: 0,
      },
    };
  }
}
