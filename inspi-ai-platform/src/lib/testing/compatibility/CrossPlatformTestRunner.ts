/**
 * Cross-Platform Test Runner
 * Orchestrates testing across different platforms, Node versions, browsers, and containers
 */

import { 
  CompatibilityTestResult, 
  CompatibilityReport, 
  TestEnvironmentConfig,
  SupportMatrix,
  PlatformSupport,
  NodeVersionSupport,
  BrowserSupport,
  ContainerSupport
} from './types';
import { EnvironmentDetector } from './EnvironmentDetector';
import { NodeVersionTester } from './NodeVersionTester';
import { BrowserCompatibilityTester } from './BrowserCompatibilityTester';
import { ContainerTestRunner } from './ContainerTestRunner';

export class CrossPlatformTestRunner {
  private nodeVersionTester: NodeVersionTester;
  private browserTester: BrowserCompatibilityTester;
  private containerRunner: ContainerTestRunner;

  constructor() {
    this.nodeVersionTester = new NodeVersionTester();
    this.browserTester = new BrowserCompatibilityTester();
    this.containerRunner = new ContainerTestRunner();
  }

  /**
   * Run comprehensive cross-platform compatibility tests
   */
  async runComprehensiveTests(
    testCommand: string,
    config?: Partial<TestEnvironmentConfig>
  ): Promise<CompatibilityReport> {
    const startTime = Date.now();
    console.log('🚀 Starting comprehensive cross-platform compatibility tests...');

    const defaultConfig: TestEnvironmentConfig = {
      platforms: ['darwin', 'linux', 'win32'],
      nodeVersions: ['18.17.0', '18.18.0', '20.5.0', '20.8.0'],
      browsers: [
        { name: 'chrome', versions: ['latest', '119'], headless: true },
        { name: 'firefox', versions: ['latest', '118'], headless: true }
      ],
      containers: [
        { runtime: 'docker', image: 'node:18-alpine', nodeVersion: '18.18.0' },
        { runtime: 'docker', image: 'node:20-alpine', nodeVersion: '20.8.0' }
      ],
      parallel: true,
      timeout: 600000,
      retries: 2
    };

    const finalConfig = { ...defaultConfig, ...config };
    const results: CompatibilityTestResult[] = [];

    try {
      // 1. Test current platform with different Node.js versions
      console.log('📦 Testing Node.js version compatibility...');
      const nodeResults = await this.testNodeVersions(testCommand, finalConfig);
      results.push(...nodeResults);

      // 2. Test browser compatibility (if applicable)
      if (this.shouldTestBrowsers(testCommand)) {
        console.log('🌐 Testing browser compatibility...');
        const browserResults = await this.testBrowsers(testCommand, finalConfig);
        results.push(...browserResults);
      }

      // 3. Test container environments
      console.log('🐳 Testing container compatibility...');
      const containerResults = await this.testContainers(testCommand, finalConfig);
      results.push(...containerResults);

      // 4. Generate comprehensive report
      const report = await this.generateCompatibilityReport(results, finalConfig);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Cross-platform testing completed in ${duration}ms`);
      
      return report;
    } catch (error) {
      console.error('❌ Cross-platform testing failed:', error);
      throw error;
    }
  }

  /**
   * Run quick compatibility check
   */
  async runQuickCheck(testCommand: string): Promise<{
    compatible: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    console.log('⚡ Running quick compatibility check...');

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check current environment
    const envCheck = EnvironmentDetector.checkCompatibility();
    if (!envCheck.compatible) {
      issues.push(...envCheck.issues);
    }
    recommendations.push(...envCheck.warnings);

    // Quick Node.js version test
    try {
      const nodeResult = await this.nodeVersionTester.testSingleVersion(
        process.version.slice(1), // Remove 'v' prefix
        testCommand
      );
      
      if (!nodeResult.passed) {
        issues.push(`Tests fail with current Node.js version ${process.version}`);
      }
    } catch (error) {
      issues.push(`Failed to test current Node.js version: ${error}`);
    }

    // Check container availability
    const isContainer = EnvironmentDetector.isContainer();
    const containerInfo = EnvironmentDetector.getContainerInfo();
    
    if (isContainer && containerInfo) {
      recommendations.push(`Running in ${containerInfo.runtime} container`);
    } else {
      recommendations.push('Consider testing in containerized environment for consistency');
    }

    return {
      compatible: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Generate platform support matrix
   */
  async generateSupportMatrix(): Promise<SupportMatrix> {
    console.log('📊 Generating platform support matrix...');

    // Platform support
    const platforms: PlatformSupport[] = [
      {
        platform: 'darwin',
        supported: true,
        minNodeVersion: '18.0.0',
        recommendations: ['Use latest macOS for best compatibility']
      },
      {
        platform: 'linux',
        supported: true,
        minNodeVersion: '18.0.0',
        recommendations: ['Ubuntu 20.04+ or equivalent recommended']
      },
      {
        platform: 'win32',
        supported: true,
        minNodeVersion: '18.0.0',
        limitations: ['Path separator differences may cause issues'],
        recommendations: ['Use WSL2 for better compatibility']
      }
    ];

    // Node.js version support
    const nodeVersionMatrix = await this.nodeVersionTester.getCompatibilityMatrix().catch(() => []);
    const nodeVersions: NodeVersionSupport[] = nodeVersionMatrix.map(item => ({
      version: item.version,
      supported: item.compatible,
      tested: true,
      issues: item.issues,
      recommendations: item.features.length > 0 ? 
        [`Supports features: ${item.features.join(', ')}`] : []
    }));

    // Browser support
    const browserMatrix = await this.browserTester.getBrowserFeatureMatrix().catch(() => []);
    const browsers: BrowserSupport[] = this.aggregateBrowserSupport(browserMatrix);

    // Container support
    const containers: ContainerSupport[] = [
      {
        runtime: 'docker',
        baseImages: ['node:18-alpine', 'node:20-alpine', 'node:18-slim', 'node:20-slim'],
        supported: true,
        recommendations: ['Alpine images are smaller but may have compatibility issues']
      },
      {
        runtime: 'podman',
        baseImages: ['node:18-alpine', 'node:20-alpine'],
        supported: true,
        recommendations: ['Drop-in replacement for Docker']
      }
    ];

    return {
      platforms,
      nodeVersions,
      browsers,
      containers
    };
  }

  /**
   * Test Node.js versions
   */
  private async testNodeVersions(
    testCommand: string,
    config: TestEnvironmentConfig
  ): Promise<CompatibilityTestResult[]> {
    if (config.parallel) {
      // Run tests in parallel for better performance
      const promises = config.nodeVersions.map(version =>
        this.nodeVersionTester.testSingleVersion(version, testCommand).catch(error => {
          // Return a failed result instead of throwing
          return {
            environment: { platform: process.platform, arch: process.arch, nodeVersion: `v${version}`, npmVersion: 'unknown', osVersion: 'unknown', cpuCount: 0, totalMemory: 0, availableMemory: 0, timezone: 'UTC', locale: 'en-US' },
            testSuite: `node-${version}`,
            passed: false,
            duration: 0,
            errors: [{ type: 'version' as const, message: `Failed to test Node.js ${version}: ${error}`, severity: 'critical' as const, affectedTests: ['all'] }],
            warnings: [],
            performance: { executionTime: 0, memoryUsage: { peak: 0, average: 0, final: 0 }, cpuUsage: { peak: 0, average: 0 } }
          };
        })
      );
      return await Promise.all(promises);
    } else {
      // Run tests sequentially
      const results: CompatibilityTestResult[] = [];
      for (const version of config.nodeVersions) {
        try {
          const result = await this.nodeVersionTester.testSingleVersion(version, testCommand);
          results.push(result);
        } catch (error) {
          results.push({
            environment: { platform: process.platform, arch: process.arch, nodeVersion: `v${version}`, npmVersion: 'unknown', osVersion: 'unknown', cpuCount: 0, totalMemory: 0, availableMemory: 0, timezone: 'UTC', locale: 'en-US' },
            testSuite: `node-${version}`,
            passed: false,
            duration: 0,
            errors: [{ type: 'version' as const, message: `Failed to test Node.js ${version}: ${error}`, severity: 'critical' as const, affectedTests: ['all'] }],
            warnings: [],
            performance: { executionTime: 0, memoryUsage: { peak: 0, average: 0, final: 0 }, cpuUsage: { peak: 0, average: 0 } }
          });
        }
      }
      return results;
    }
  }

  /**
   * Test browsers
   */
  private async testBrowsers(
    testCommand: string,
    config: TestEnvironmentConfig
  ): Promise<CompatibilityTestResult[]> {
    if (config.parallel) {
      const promises = config.browsers.map(browser =>
        this.browserTester.testMultipleBrowsers(testCommand, [browser])
      );
      const results = await Promise.all(promises);
      return results.flat();
    } else {
      const results: CompatibilityTestResult[] = [];
      for (const browser of config.browsers) {
        const browserResults = await this.browserTester.testMultipleBrowsers(testCommand, [browser]);
        results.push(...browserResults);
      }
      return results;
    }
  }

  /**
   * Test containers
   */
  private async testContainers(
    testCommand: string,
    config: TestEnvironmentConfig
  ): Promise<CompatibilityTestResult[]> {
    if (config.parallel) {
      const promises = config.containers.map(container =>
        this.containerRunner.testSingleContainer(container, testCommand).catch(error => {
          // Return a failed result instead of throwing
          return {
            environment: { platform: 'linux' as NodeJS.Platform, arch: process.arch, nodeVersion: container.nodeVersion, npmVersion: 'unknown', osVersion: 'Container', cpuCount: 0, totalMemory: 0, availableMemory: 0, timezone: 'UTC', locale: 'en-US' },
            testSuite: `${container.runtime}-${container.image}`,
            passed: false,
            duration: 0,
            errors: [{ type: 'platform' as const, message: `Failed to test container ${container.image}: ${error}`, severity: 'critical' as const, affectedTests: ['all'] }],
            warnings: [],
            performance: { executionTime: 0, memoryUsage: { peak: 0, average: 0, final: 0 }, cpuUsage: { peak: 0, average: 0 } }
          };
        })
      );
      return await Promise.all(promises);
    } else {
      const results: CompatibilityTestResult[] = [];
      for (const container of config.containers) {
        try {
          const result = await this.containerRunner.testSingleContainer(container, testCommand);
          results.push(result);
        } catch (error) {
          results.push({
            environment: { platform: 'linux' as NodeJS.Platform, arch: process.arch, nodeVersion: container.nodeVersion, npmVersion: 'unknown', osVersion: 'Container', cpuCount: 0, totalMemory: 0, availableMemory: 0, timezone: 'UTC', locale: 'en-US' },
            testSuite: `${container.runtime}-${container.image}`,
            passed: false,
            duration: 0,
            errors: [{ type: 'platform' as const, message: `Failed to test container ${container.image}: ${error}`, severity: 'critical' as const, affectedTests: ['all'] }],
            warnings: [],
            performance: { executionTime: 0, memoryUsage: { peak: 0, average: 0, final: 0 }, cpuUsage: { peak: 0, average: 0 } }
          });
        }
      }
      return results;
    }
  }

  /**
   * Check if browser testing is applicable
   */
  private shouldTestBrowsers(testCommand: string): boolean {
    // Check if the test command includes browser-related tests
    const browserKeywords = ['e2e', 'browser', 'playwright', 'puppeteer', 'cypress'];
    return browserKeywords.some(keyword => testCommand.includes(keyword));
  }

  /**
   * Generate comprehensive compatibility report
   */
  private async generateCompatibilityReport(
    results: CompatibilityTestResult[],
    config: TestEnvironmentConfig
  ): Promise<CompatibilityReport> {
    const totalEnvironments = results.length;
    const passedEnvironments = results.filter(r => r.passed).length;
    const failedEnvironments = results.filter(r => !r.passed).length;
    const warningEnvironments = results.filter(r => r.warnings.length > 0).length;

    // Generate recommendations
    const recommendations = this.generateRecommendations(results);

    // Generate support matrix
    const supportMatrix = await this.generateSupportMatrix();

    return {
      summary: {
        totalEnvironments,
        passedEnvironments,
        failedEnvironments,
        warningEnvironments
      },
      results,
      recommendations,
      supportMatrix
    };
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(results: CompatibilityTestResult[]): string[] {
    const recommendations: string[] = [];
    const failedResults = results.filter(r => !r.passed);

    if (failedResults.length === 0) {
      recommendations.push('✅ All environments passed! Your code has excellent cross-platform compatibility.');
    } else {
      recommendations.push(`❌ ${failedResults.length} environments failed. Consider the following:`);
      
      // Analyze failure patterns
      const nodeFailures = failedResults.filter(r => r.testSuite.startsWith('node-'));
      const browserFailures = failedResults.filter(r => r.testSuite.includes('chrome') || r.testSuite.includes('firefox'));
      const containerFailures = failedResults.filter(r => r.testSuite.includes('docker'));

      if (nodeFailures.length > 0) {
        recommendations.push('🔧 Node.js version issues detected. Consider updating dependencies or using version-specific polyfills.');
      }

      if (browserFailures.length > 0) {
        recommendations.push('🌐 Browser compatibility issues detected. Consider adding polyfills or updating browser targets.');
      }

      if (containerFailures.length > 0) {
        recommendations.push('🐳 Container environment issues detected. Check Dockerfile and container configuration.');
      }
    }

    // Performance recommendations
    const slowResults = results.filter(r => r.duration > 60000); // > 1 minute
    if (slowResults.length > 0) {
      recommendations.push('⚡ Some environments are slow. Consider optimizing test performance or using parallel execution.');
    }

    return recommendations;
  }

  /**
   * Aggregate browser support information
   */
  private aggregateBrowserSupport(browserMatrix: any[]): BrowserSupport[] {
    const supportMap = new Map<string, BrowserSupport>();

    for (const item of browserMatrix) {
      if (!supportMap.has(item.browser)) {
        supportMap.set(item.browser, {
          browser: item.browser,
          versions: [],
          supported: true,
          polyfillsRequired: [],
          limitations: []
        });
      }

      const support = supportMap.get(item.browser)!;
      support.versions.push(item.version);

      // Check for required polyfills
      const polyfillFeatures = item.features.filter((f: any) => f.polyfillRequired);
      if (polyfillFeatures.length > 0) {
        support.polyfillsRequired = [...new Set([
          ...support.polyfillsRequired || [],
          ...polyfillFeatures.map((f: any) => f.name)
        ])];
      }
    }

    return Array.from(supportMap.values());
  }
}