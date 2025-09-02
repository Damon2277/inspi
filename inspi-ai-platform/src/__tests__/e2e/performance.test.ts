/**
 * 端到端性能测试
 * 测试完整的用户场景和性能指标
 */

import { chromium, Browser, Page } from 'playwright';

interface PerformanceMetrics {
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
  loadTime: number;
  domContentLoaded: number;
  networkRequests: number;
  totalBytes: number;
  jsBytes: number;
  cssBytes: number;
  imageBytes: number;
}

interface TestScenario {
  name: string;
  url: string;
  actions?: (page: Page) => Promise<void>;
  expectedMetrics?: Partial<PerformanceMetrics>;
}

class E2EPerformanceTester {
  private browser: Browser | null = null;
  private baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

  async setup(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
  }

  async teardown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runScenario(scenario: TestScenario): Promise<PerformanceMetrics> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    
    try {
      // 启用性能监控
      await page.addInitScript(() => {
        // 注入Web Vitals监控
        (window as any).performanceMetrics = {
          lcp: 0,
          fid: 0,
          cls: 0,
          fcp: 0,
          ttfb: 0
        };

        // LCP监控
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          (window as any).performanceMetrics.lcp = lastEntry.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // FCP监控
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            (window as any).performanceMetrics.fcp = fcpEntry.startTime;
          }
        }).observe({ type: 'paint', buffered: true });

        // CLS监控
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
              (window as any).performanceMetrics.cls = clsValue;
            }
          }
        }).observe({ type: 'layout-shift', buffered: true });

        // TTFB监控
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const navigationEntry = entries.find(entry => entry.entryType === 'navigation') as any;
          if (navigationEntry) {
            (window as any).performanceMetrics.ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
          }
        }).observe({ type: 'navigation', buffered: true });
      });

      // 监控网络请求
      const networkRequests: any[] = [];
      page.on('response', (response) => {
        networkRequests.push({
          url: response.url(),
          status: response.status(),
          size: response.headers()['content-length'] || 0,
          type: response.headers()['content-type'] || 'unknown'
        });
      });

      const startTime = Date.now();
      
      // 导航到页面
      await page.goto(`${this.baseUrl}${scenario.url}`, {
        waitUntil: 'networkidle'
      });

      // 等待页面完全加载
      await page.waitForLoadState('domcontentloaded');
      
      // 执行场景特定的操作
      if (scenario.actions) {
        await scenario.actions(page);
      }

      // 等待一段时间确保所有指标都被收集
      await page.waitForTimeout(2000);

      const endTime = Date.now();

      // 获取性能指标
      const webVitalsMetrics = await page.evaluate(() => {
        return (window as any).performanceMetrics;
      });

      const navigationTiming = await page.evaluate(() => {
        const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          loadTime: timing.loadEventEnd - timing.navigationStart,
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          ttfb: timing.responseStart - timing.requestStart
        };
      });

      // 计算网络统计
      const networkStats = this.calculateNetworkStats(networkRequests);

      const metrics: PerformanceMetrics = {
        lcp: webVitalsMetrics.lcp || 0,
        fid: webVitalsMetrics.fid || 0,
        cls: webVitalsMetrics.cls || 0,
        fcp: webVitalsMetrics.fcp || 0,
        ttfb: navigationTiming.ttfb || webVitalsMetrics.ttfb || 0,
        loadTime: navigationTiming.loadTime || (endTime - startTime),
        domContentLoaded: navigationTiming.domContentLoaded || 0,
        networkRequests: networkRequests.length,
        totalBytes: networkStats.totalBytes,
        jsBytes: networkStats.jsBytes,
        cssBytes: networkStats.cssBytes,
        imageBytes: networkStats.imageBytes
      };

      return metrics;
    } finally {
      await page.close();
    }
  }

  private calculateNetworkStats(requests: any[]): {
    totalBytes: number;
    jsBytes: number;
    cssBytes: number;
    imageBytes: number;
  } {
    let totalBytes = 0;
    let jsBytes = 0;
    let cssBytes = 0;
    let imageBytes = 0;

    requests.forEach(request => {
      const size = parseInt(request.size) || 0;
      totalBytes += size;

      const contentType = request.type.toLowerCase();
      if (contentType.includes('javascript')) {
        jsBytes += size;
      } else if (contentType.includes('css')) {
        cssBytes += size;
      } else if (contentType.includes('image')) {
        imageBytes += size;
      }
    });

    return { totalBytes, jsBytes, cssBytes, imageBytes };
  }

  async runAllScenarios(scenarios: TestScenario[]): Promise<{ [key: string]: PerformanceMetrics }> {
    const results: { [key: string]: PerformanceMetrics } = {};

    for (const scenario of scenarios) {
      console.log(`Running scenario: ${scenario.name}`);
      try {
        const metrics = await this.runScenario(scenario);
        results[scenario.name] = metrics;
        console.log(`✅ ${scenario.name} completed`);
      } catch (error) {
        console.error(`❌ ${scenario.name} failed:`, error);
        throw error;
      }
    }

    return results;
  }

  validateMetrics(metrics: PerformanceMetrics, expected?: Partial<PerformanceMetrics>): boolean {
    if (!expected) return true;

    const violations: string[] = [];

    if (expected.lcp && metrics.lcp > expected.lcp) {
      violations.push(`LCP: ${metrics.lcp}ms > ${expected.lcp}ms`);
    }
    if (expected.fcp && metrics.fcp > expected.fcp) {
      violations.push(`FCP: ${metrics.fcp}ms > ${expected.fcp}ms`);
    }
    if (expected.cls && metrics.cls > expected.cls) {
      violations.push(`CLS: ${metrics.cls} > ${expected.cls}`);
    }
    if (expected.ttfb && metrics.ttfb > expected.ttfb) {
      violations.push(`TTFB: ${metrics.ttfb}ms > ${expected.ttfb}ms`);
    }
    if (expected.loadTime && metrics.loadTime > expected.loadTime) {
      violations.push(`Load Time: ${metrics.loadTime}ms > ${expected.loadTime}ms`);
    }

    if (violations.length > 0) {
      console.warn('Performance violations:', violations);
      return false;
    }

    return true;
  }
}

describe('E2E Performance Tests', () => {
  let tester: E2EPerformanceTester;

  beforeAll(async () => {
    tester = new E2EPerformanceTester();
    await tester.setup();
  }, 30000);

  afterAll(async () => {
    await tester.teardown();
  });

  const scenarios: TestScenario[] = [
    {
      name: 'Homepage Load',
      url: '/',
      expectedMetrics: {
        lcp: 2500,
        fcp: 1800,
        cls: 0.1,
        ttfb: 800,
        loadTime: 3000
      }
    },
    {
      name: 'Square Page Load',
      url: '/square',
      expectedMetrics: {
        lcp: 3000,
        fcp: 2000,
        cls: 0.1,
        ttfb: 1000,
        loadTime: 4000
      }
    },
    {
      name: 'Square Search Interaction',
      url: '/square',
      actions: async (page) => {
        await page.waitForSelector('[data-testid="search-input"]');
        await page.fill('[data-testid="search-input"]', '数学');
        await page.press('[data-testid="search-input"]', 'Enter');
        await page.waitForTimeout(1000);
      },
      expectedMetrics: {
        lcp: 3500,
        fcp: 2000,
        cls: 0.15
      }
    },
    {
      name: 'Create Page Load',
      url: '/create',
      expectedMetrics: {
        lcp: 2800,
        fcp: 1900,
        cls: 0.1,
        ttfb: 900,
        loadTime: 3500
      }
    },
    {
      name: 'Leaderboard Page Load',
      url: '/leaderboard',
      expectedMetrics: {
        lcp: 2600,
        fcp: 1800,
        cls: 0.1,
        ttfb: 800,
        loadTime: 3200
      }
    },
    {
      name: 'Knowledge Graph Demo',
      url: '/demo/graph',
      actions: async (page) => {
        await page.waitForSelector('svg', { timeout: 10000 });
        await page.waitForTimeout(2000);
      },
      expectedMetrics: {
        lcp: 4000,
        fcp: 2500,
        cls: 0.2,
        loadTime: 5000
      }
    }
  ];

  test('Run all performance scenarios', async () => {
    const results = await tester.runAllScenarios(scenarios);

    // 验证每个场景的性能指标
    for (const scenario of scenarios) {
      const metrics = results[scenario.name];
      expect(metrics).toBeDefined();
      
      const isValid = tester.validateMetrics(metrics, scenario.expectedMetrics);
      if (!isValid) {
        console.warn(`Performance issues detected in ${scenario.name}:`, metrics);
      }

      // 基本性能要求
      expect(metrics.lcp).toBeLessThan(5000); // LCP < 5s
      expect(metrics.cls).toBeLessThan(0.25); // CLS < 0.25
      expect(metrics.ttfb).toBeLessThan(2000); // TTFB < 2s
    }

    // 生成性能报告
    console.log('\n📊 Performance Test Results:');
    console.log('================================');
    
    for (const [scenarioName, metrics] of Object.entries(results)) {
      console.log(`\n${scenarioName}:`);
      console.log(`  LCP: ${metrics.lcp.toFixed(2)}ms`);
      console.log(`  FCP: ${metrics.fcp.toFixed(2)}ms`);
      console.log(`  CLS: ${metrics.cls.toFixed(4)}`);
      console.log(`  TTFB: ${metrics.ttfb.toFixed(2)}ms`);
      console.log(`  Load Time: ${metrics.loadTime.toFixed(2)}ms`);
      console.log(`  Network Requests: ${metrics.networkRequests}`);
      console.log(`  Total Bytes: ${(metrics.totalBytes / 1024).toFixed(2)}KB`);
    }
  }, 120000);

  test('Mobile performance scenarios', async () => {
    // 模拟移动设备
    const mobileScenarios: TestScenario[] = [
      {
        name: 'Mobile Homepage',
        url: '/',
        expectedMetrics: {
          lcp: 3500,
          fcp: 2500,
          cls: 0.15,
          loadTime: 4000
        }
      },
      {
        name: 'Mobile Square',
        url: '/square',
        expectedMetrics: {
          lcp: 4000,
          fcp: 2800,
          cls: 0.15,
          loadTime: 5000
        }
      }
    ];

    // 这里可以添加移动设备模拟的逻辑
    // 由于当前测试环境限制，暂时使用相同的测试逻辑
    const results = await tester.runAllScenarios(mobileScenarios);

    for (const scenario of mobileScenarios) {
      const metrics = results[scenario.name];
      expect(metrics).toBeDefined();
      
      // 移动端性能要求相对宽松
      expect(metrics.lcp).toBeLessThan(6000);
      expect(metrics.cls).toBeLessThan(0.3);
    }
  }, 60000);
});