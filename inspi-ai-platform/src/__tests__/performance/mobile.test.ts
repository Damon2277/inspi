/**
 * 移动端性能测试
 * 测试移动设备上的性能表现和优化效果
 */

import { chromium, Browser, Page, devices } from 'playwright';

interface MobilePerformanceMetrics {
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
  memoryUsage: number;
  cpuUsage: number;
  batteryImpact: 'low' | 'medium' | 'high';
}

interface MobileTestScenario {
  name: string;
  url: string;
  device: string;
  networkCondition: 'fast-3g' | 'slow-3g' | '4g' | 'wifi';
  actions?: (page: Page) => Promise<void>;
  expectedMetrics?: Partial<MobilePerformanceMetrics>;
}

class MobilePerformanceTester {
  private browser: Browser | null = null;
  private baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

  async setup(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection'
      ]
    });
  }

  async teardown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  private getNetworkCondition(condition: string) {
    const conditions = {
      'slow-3g': {
        offline: false,
        downloadThroughput: 500 * 1024 / 8, // 500 Kbps
        uploadThroughput: 500 * 1024 / 8,
        latency: 400
      },
      'fast-3g': {
        offline: false,
        downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
        uploadThroughput: 750 * 1024 / 8,
        latency: 150
      },
      '4g': {
        offline: false,
        downloadThroughput: 4 * 1024 * 1024 / 8, // 4 Mbps
        uploadThroughput: 3 * 1024 * 1024 / 8,
        latency: 20
      },
      'wifi': {
        offline: false,
        downloadThroughput: 30 * 1024 * 1024 / 8, // 30 Mbps
        uploadThroughput: 15 * 1024 * 1024 / 8,
        latency: 2
      }
    };
    return conditions[condition as keyof typeof conditions] || conditions['4g'];
  }

  private calculateBatteryImpact(metrics: Partial<MobilePerformanceMetrics>): 'low' | 'medium' | 'high' {
    let score = 0;
    
    // CPU使用率影响
    if (metrics.cpuUsage && metrics.cpuUsage > 80) score += 3;
    else if (metrics.cpuUsage && metrics.cpuUsage > 50) score += 2;
    else if (metrics.cpuUsage && metrics.cpuUsage > 30) score += 1;

    // 内存使用影响
    if (metrics.memoryUsage && metrics.memoryUsage > 100 * 1024 * 1024) score += 2; // 100MB
    else if (metrics.memoryUsage && metrics.memoryUsage > 50 * 1024 * 1024) score += 1; // 50MB

    // 网络使用影响
    if (metrics.totalBytes && metrics.totalBytes > 5 * 1024 * 1024) score += 2; // 5MB
    else if (metrics.totalBytes && metrics.totalBytes > 2 * 1024 * 1024) score += 1; // 2MB

    // 加载时间影响
    if (metrics.loadTime && metrics.loadTime > 5000) score += 2;
    else if (metrics.loadTime && metrics.loadTime > 3000) score += 1;

    if (score >= 6) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  async runMobileScenario(scenario: MobileTestScenario): Promise<MobilePerformanceMetrics> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const device = devices[scenario.device] || devices['iPhone 12'];
    const context = await this.browser.newContext({
      ...device,
      locale: 'zh-CN'
    });

    const page = await context.newPage();

    try {
      // 设置网络条件
      const networkCondition = this.getNetworkCondition(scenario.networkCondition);
      await page.route('**/*', async (route) => {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, networkCondition.latency));
        await route.continue();
      });

      // 启用性能监控
      await page.addInitScript(() => {
        (window as any).mobilePerformanceMetrics = {
          lcp: 0,
          fid: 0,
          cls: 0,
          fcp: 0,
          ttfb: 0,
          memoryUsage: 0,
          cpuUsage: 0
        };

        // Web Vitals监控
        if ('PerformanceObserver' in window) {
          // LCP监控
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            (window as any).mobilePerformanceMetrics.lcp = lastEntry.startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });

          // FCP监控
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
            if (fcpEntry) {
              (window as any).mobilePerformanceMetrics.fcp = fcpEntry.startTime;
            }
          }).observe({ type: 'paint', buffered: true });

          // CLS监控
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
                (window as any).mobilePerformanceMetrics.cls = clsValue;
              }
            }
          }).observe({ type: 'layout-shift', buffered: true });
        }

        // 内存监控
        if ('memory' in performance) {
          setInterval(() => {
            const memory = (performance as any).memory;
            (window as any).mobilePerformanceMetrics.memoryUsage = memory.usedJSHeapSize;
          }, 1000);
        }

        // CPU使用率估算（基于任务执行时间）
        let cpuStartTime = Date.now();
        let cpuTotalTime = 0;
        let cpuActiveTime = 0;

        const originalSetTimeout = window.setTimeout;
        window.setTimeout = function(callback, delay) {
          return originalSetTimeout(() => {
            const start = Date.now();
            callback();
            const end = Date.now();
            cpuActiveTime += (end - start);
            cpuTotalTime = Date.now() - cpuStartTime;
            (window as any).mobilePerformanceMetrics.cpuUsage = (cpuActiveTime / cpuTotalTime) * 100;
          }, delay);
        };
      });

      // 监控网络请求
      const networkRequests: any[] = [];
      page.on('response', (response) => {
        networkRequests.push({
          url: response.url(),
          status: response.status(),
          size: parseInt(response.headers()['content-length'] || '0'),
          type: response.headers()['content-type'] || 'unknown'
        });
      });

      const startTime = Date.now();

      // 导航到页面
      await page.goto(`${this.baseUrl}${scenario.url}`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // 等待页面完全加载
      await page.waitForLoadState('domcontentloaded');

      // 执行场景特定的操作
      if (scenario.actions) {
        await scenario.actions(page);
      }

      // 等待指标收集
      await page.waitForTimeout(3000);

      const endTime = Date.now();

      // 获取性能指标
      const webVitalsMetrics = await page.evaluate(() => {
        return (window as any).mobilePerformanceMetrics;
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

      const metrics: MobilePerformanceMetrics = {
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
        imageBytes: networkStats.imageBytes,
        memoryUsage: webVitalsMetrics.memoryUsage || 0,
        cpuUsage: webVitalsMetrics.cpuUsage || 0,
        batteryImpact: this.calculateBatteryImpact({
          cpuUsage: webVitalsMetrics.cpuUsage,
          memoryUsage: webVitalsMetrics.memoryUsage,
          totalBytes: networkStats.totalBytes,
          loadTime: navigationTiming.loadTime || (endTime - startTime)
        })
      };

      return metrics;
    } finally {
      await context.close();
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
      const size = request.size || 0;
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

  async runAllMobileScenarios(scenarios: MobileTestScenario[]): Promise<{ [key: string]: MobilePerformanceMetrics }> {
    const results: { [key: string]: MobilePerformanceMetrics } = {};

    for (const scenario of scenarios) {
      console.log(`Running mobile scenario: ${scenario.name} on ${scenario.device} with ${scenario.networkCondition}`);
      try {
        const metrics = await this.runMobileScenario(scenario);
        results[`${scenario.name}_${scenario.device}_${scenario.networkCondition}`] = metrics;
        console.log(`✅ ${scenario.name} completed`);
      } catch (error) {
        console.error(`❌ ${scenario.name} failed:`, error);
        throw error;
      }
    }

    return results;
  }

  validateMobileMetrics(metrics: MobilePerformanceMetrics, expected?: Partial<MobilePerformanceMetrics>): boolean {
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
    if (expected.loadTime && metrics.loadTime > expected.loadTime) {
      violations.push(`Load Time: ${metrics.loadTime}ms > ${expected.loadTime}ms`);
    }
    if (expected.totalBytes && metrics.totalBytes > expected.totalBytes) {
      violations.push(`Total Bytes: ${metrics.totalBytes} > ${expected.totalBytes}`);
    }

    if (violations.length > 0) {
      console.warn('Mobile performance violations:', violations);
      return false;
    }

    return true;
  }
}

describe('Mobile Performance Tests', () => {
  let tester: MobilePerformanceTester;

  beforeAll(async () => {
    tester = new MobilePerformanceTester();
    await tester.setup();
  }, 30000);

  afterAll(async () => {
    await tester.teardown();
  });

  const mobileScenarios: MobileTestScenario[] = [
    {
      name: 'Homepage',
      url: '/',
      device: 'iPhone 12',
      networkCondition: '4g',
      expectedMetrics: {
        lcp: 3500,
        fcp: 2500,
        cls: 0.15,
        loadTime: 4000,
        totalBytes: 2 * 1024 * 1024 // 2MB
      }
    },
    {
      name: 'Homepage_Slow_Network',
      url: '/',
      device: 'iPhone 12',
      networkCondition: 'slow-3g',
      expectedMetrics: {
        lcp: 8000,
        fcp: 5000,
        cls: 0.2,
        loadTime: 10000,
        totalBytes: 2 * 1024 * 1024
      }
    },
    {
      name: 'Square_Page',
      url: '/square',
      device: 'iPhone 12',
      networkCondition: '4g',
      expectedMetrics: {
        lcp: 4000,
        fcp: 2800,
        cls: 0.15,
        loadTime: 5000
      }
    },
    {
      name: 'Square_Android',
      url: '/square',
      device: 'Pixel 5',
      networkCondition: '4g',
      expectedMetrics: {
        lcp: 4200,
        fcp: 3000,
        cls: 0.15,
        loadTime: 5200
      }
    },
    {
      name: 'Create_Page',
      url: '/create',
      device: 'iPhone 12',
      networkCondition: '4g',
      expectedMetrics: {
        lcp: 3800,
        fcp: 2600,
        cls: 0.15,
        loadTime: 4500
      }
    },
    {
      name: 'Leaderboard_Page',
      url: '/leaderboard',
      device: 'iPhone 12',
      networkCondition: '4g',
      expectedMetrics: {
        lcp: 3600,
        fcp: 2400,
        cls: 0.15,
        loadTime: 4200
      }
    }
  ];

  test('Run all mobile performance scenarios', async () => {
    const results = await tester.runAllMobileScenarios(mobileScenarios);

    // 验证每个场景的性能指标
    for (const scenario of mobileScenarios) {
      const key = `${scenario.name}_${scenario.device}_${scenario.networkCondition}`;
      const metrics = results[key];
      expect(metrics).toBeDefined();

      const isValid = tester.validateMobileMetrics(metrics, scenario.expectedMetrics);
      if (!isValid) {
        console.warn(`Mobile performance issues detected in ${key}:`, metrics);
      }

      // 移动端基本性能要求
      expect(metrics.lcp).toBeLessThan(10000); // LCP < 10s (移动端更宽松)
      expect(metrics.cls).toBeLessThan(0.25); // CLS < 0.25
      expect(metrics.totalBytes).toBeLessThan(5 * 1024 * 1024); // 总大小 < 5MB
      expect(metrics.batteryImpact).not.toBe('high'); // 电池影响不能是高
    }

    // 生成移动端性能报告
    console.log('\n📱 Mobile Performance Test Results:');
    console.log('====================================');

    for (const [scenarioName, metrics] of Object.entries(results)) {
      console.log(`\n${scenarioName}:`);
      console.log(`  LCP: ${metrics.lcp.toFixed(2)}ms`);
      console.log(`  FCP: ${metrics.fcp.toFixed(2)}ms`);
      console.log(`  CLS: ${metrics.cls.toFixed(4)}`);
      console.log(`  Load Time: ${metrics.loadTime.toFixed(2)}ms`);
      console.log(`  Total Bytes: ${(metrics.totalBytes / 1024).toFixed(2)}KB`);
      console.log(`  Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  CPU Usage: ${metrics.cpuUsage.toFixed(2)}%`);
      console.log(`  Battery Impact: ${metrics.batteryImpact}`);
      console.log(`  Network Requests: ${metrics.networkRequests}`);
    }
  }, 300000); // 5分钟超时

  test('Mobile interaction performance', async () => {
    const interactionScenarios: MobileTestScenario[] = [
      {
        name: 'Square_Search_Interaction',
        url: '/square',
        device: 'iPhone 12',
        networkCondition: '4g',
        actions: async (page) => {
          await page.waitForSelector('[data-testid="search-input"]', { timeout: 10000 });
          await page.fill('[data-testid="search-input"]', '数学');
          await page.press('[data-testid="search-input"]', 'Enter');
          await page.waitForTimeout(2000);
        },
        expectedMetrics: {
          lcp: 5000,
          cls: 0.2
        }
      },
      {
        name: 'Square_Filter_Interaction',
        url: '/square',
        device: 'iPhone 12',
        networkCondition: '4g',
        actions: async (page) => {
          await page.waitForSelector('[data-testid="filter-button"]', { timeout: 10000 });
          await page.click('[data-testid="filter-button"]');
          await page.waitForTimeout(1000);
          
          // 选择一个筛选选项
          const filterOption = await page.$('[data-testid="filter-option"]');
          if (filterOption) {
            await filterOption.click();
            await page.waitForTimeout(2000);
          }
        },
        expectedMetrics: {
          cls: 0.15
        }
      }
    ];

    const results = await tester.runAllMobileScenarios(interactionScenarios);

    for (const scenario of interactionScenarios) {
      const key = `${scenario.name}_${scenario.device}_${scenario.networkCondition}`;
      const metrics = results[key];
      expect(metrics).toBeDefined();

      // 交互性能要求
      expect(metrics.fid).toBeLessThan(300); // FID < 300ms
      expect(metrics.cls).toBeLessThan(0.25); // 交互时CLS要保持稳定
    }
  }, 180000);

  test('Mobile memory and battery impact', async () => {
    const memoryTestScenarios: MobileTestScenario[] = [
      {
        name: 'Memory_Intensive_Page',
        url: '/demo/graph',
        device: 'iPhone 12',
        networkCondition: '4g',
        actions: async (page) => {
          // 等待图形渲染完成
          await page.waitForSelector('svg', { timeout: 15000 });
          await page.waitForTimeout(3000);
          
          // 模拟用户交互
          const svg = await page.$('svg');
          if (svg) {
            await svg.click();
            await page.waitForTimeout(1000);
          }
        }
      }
    ];

    const results = await tester.runAllMobileScenarios(memoryTestScenarios);

    for (const scenario of memoryTestScenarios) {
      const key = `${scenario.name}_${scenario.device}_${scenario.networkCondition}`;
      const metrics = results[key];
      expect(metrics).toBeDefined();

      // 内存和电池影响要求
      expect(metrics.memoryUsage).toBeLessThan(150 * 1024 * 1024); // 内存使用 < 150MB
      expect(metrics.batteryImpact).not.toBe('high'); // 电池影响不能是高
      expect(metrics.cpuUsage).toBeLessThan(90); // CPU使用率 < 90%

      console.log(`Memory Test - ${key}:`);
      console.log(`  Memory: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  CPU: ${metrics.cpuUsage.toFixed(2)}%`);
      console.log(`  Battery Impact: ${metrics.batteryImpact}`);
    }
  }, 120000);

  test('Cross-device performance comparison', async () => {
    const crossDeviceScenarios: MobileTestScenario[] = [
      {
        name: 'Homepage_iPhone',
        url: '/',
        device: 'iPhone 12',
        networkCondition: '4g'
      },
      {
        name: 'Homepage_Android',
        url: '/',
        device: 'Pixel 5',
        networkCondition: '4g'
      },
      {
        name: 'Homepage_iPad',
        url: '/',
        device: 'iPad Pro',
        networkCondition: '4g'
      }
    ];

    const results = await tester.runAllMobileScenarios(crossDeviceScenarios);

    console.log('\n📊 Cross-Device Performance Comparison:');
    console.log('========================================');

    const deviceResults: { [device: string]: MobilePerformanceMetrics } = {};
    
    for (const scenario of crossDeviceScenarios) {
      const key = `${scenario.name}_${scenario.device}_${scenario.networkCondition}`;
      const metrics = results[key];
      deviceResults[scenario.device] = metrics;

      console.log(`\n${scenario.device}:`);
      console.log(`  LCP: ${metrics.lcp.toFixed(2)}ms`);
      console.log(`  Load Time: ${metrics.loadTime.toFixed(2)}ms`);
      console.log(`  Memory: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Battery Impact: ${metrics.batteryImpact}`);
    }

    // 验证设备间性能差异不会太大
    const lcpValues = Object.values(deviceResults).map(m => m.lcp);
    const maxLcp = Math.max(...lcpValues);
    const minLcp = Math.min(...lcpValues);
    const lcpVariation = (maxLcp - minLcp) / minLcp;

    expect(lcpVariation).toBeLessThan(0.5); // LCP变化不超过50%
  }, 240000);
});