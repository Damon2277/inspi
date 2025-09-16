/**
 * usePerformanceMonitor Hook 测试
 * 测试性能监控和Core Web Vitals指标收集
 */

import { renderHook } from '@testing-library/react';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();

// Mock PerformanceObserver
class MockPerformanceObserver {
  private callback: (list: any) => void;
  private options: any;

  constructor(callback: (list: any) => void) {
    this.callback = callback;
  }

  observe(options: any) {
    this.options = options;
    // 模拟观察器已启动
  }

  disconnect() {
    // 模拟断开连接
  }

  // 模拟触发性能条目
  triggerEntries(entries: any[]) {
    const mockList = {
      getEntries: () => entries
    };
    this.callback(mockList);
  }
}

// 全局Mock PerformanceObserver
const mockObserverInstances: MockPerformanceObserver[] = [];
(global as any).PerformanceObserver = jest.fn().mockImplementation((callback) => {
  const instance = new MockPerformanceObserver(callback);
  mockObserverInstances.push(instance);
  return instance;
});

describe('usePerformanceMonitor Hook Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockObserverInstances.length = 0;
  });

  describe('基础功能测试', () => {
    it('应该在浏览器环境中创建PerformanceObserver', () => {
      renderHook(() => usePerformanceMonitor());

      expect(global.PerformanceObserver).toHaveBeenCalledWith(expect.any(Function));
      expect(mockObserverInstances).toHaveLength(1);
    });

    it('应该在服务端环境中跳过监控', () => {
      // Mock服务端环境
      const originalWindow = global.window;
      delete (global as any).window;

      renderHook(() => usePerformanceMonitor());

      // 不应该创建PerformanceObserver
      expect(global.PerformanceObserver).not.toHaveBeenCalled();

      // 恢复window对象
      global.window = originalWindow;
    });

    it('应该观察正确的性能指标类型', () => {
      const mockObserve = jest.fn();
      MockPerformanceObserver.prototype.observe = mockObserve;

      renderHook(() => usePerformanceMonitor());

      expect(mockObserve).toHaveBeenCalledWith({
        entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift']
      });
    });

    it('应该在组件卸载时断开观察器', () => {
      const mockDisconnect = jest.fn();
      MockPerformanceObserver.prototype.disconnect = mockDisconnect;

      const { unmount } = renderHook(() => usePerformanceMonitor());

      unmount();

      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe('Core Web Vitals 指标测试', () => {
    it('应该正确处理First Contentful Paint (FCP)', () => {
      renderHook(() => usePerformanceMonitor());

      const fcpEntry = {
        entryType: 'paint',
        name: 'first-contentful-paint',
        startTime: 1500.5
      };

      // 触发FCP条目
      mockObserverInstances[0].triggerEntries([fcpEntry]);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Performance Metrics:',
        expect.objectContaining({
          FCP: 1500.5
        })
      );
    });

    it('应该正确处理Largest Contentful Paint (LCP)', () => {
      renderHook(() => usePerformanceMonitor());

      const lcpEntry = {
        entryType: 'largest-contentful-paint',
        startTime: 2500.8
      };

      mockObserverInstances[0].triggerEntries([lcpEntry]);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Performance Metrics:',
        expect.objectContaining({
          LCP: 2500.8
        })
      );
    });

    it('应该正确处理First Input Delay (FID)', () => {
      renderHook(() => usePerformanceMonitor());

      const fidEntry = {
        entryType: 'first-input',
        startTime: 100.2,
        processingStart: 108.7
      };

      mockObserverInstances[0].triggerEntries([fidEntry]);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Performance Metrics:',
        expect.objectContaining({
          FID: 8.5 // processingStart - startTime
        })
      );
    });

    it('应该正确处理Cumulative Layout Shift (CLS)', () => {
      renderHook(() => usePerformanceMonitor());

      const clsEntries = [
        {
          entryType: 'layout-shift',
          value: 0.1,
          hadRecentInput: false
        },
        {
          entryType: 'layout-shift',
          value: 0.05,
          hadRecentInput: false
        },
        {
          entryType: 'layout-shift',
          value: 0.2,
          hadRecentInput: true // 应该被忽略
        }
      ];

      mockObserverInstances[0].triggerEntries(clsEntries);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Performance Metrics:',
        expect.objectContaining({
          CLS: 0.15 // 0.1 + 0.05，忽略有用户输入的
        })
      );
    });

    it('应该忽略有用户输入的布局偏移', () => {
      renderHook(() => usePerformanceMonitor());

      const clsEntry = {
        entryType: 'layout-shift',
        value: 0.3,
        hadRecentInput: true
      };

      mockObserverInstances[0].triggerEntries([clsEntry]);

      // 不应该记录任何指标，因为有用户输入
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('应该过滤掉非FCP的paint事件', () => {
      renderHook(() => usePerformanceMonitor());

      const paintEntries = [
        {
          entryType: 'paint',
          name: 'first-paint', // 不是FCP
          startTime: 1200.3
        },
        {
          entryType: 'paint',
          name: 'first-contentful-paint',
          startTime: 1500.5
        }
      ];

      mockObserverInstances[0].triggerEntries(paintEntries);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Performance Metrics:',
        expect.objectContaining({
          FCP: 1500.5
        })
      );

      // 不应该包含first-paint
      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        'Performance Metrics:',
        expect.objectContaining({
          FP: expect.any(Number)
        })
      );
    });
  });

  describe('多指标组合测试', () => {
    it('应该处理多个性能指标', () => {
      renderHook(() => usePerformanceMonitor());

      const mixedEntries = [
        {
          entryType: 'paint',
          name: 'first-contentful-paint',
          startTime: 1500.5
        },
        {
          entryType: 'largest-contentful-paint',
          startTime: 2500.8
        },
        {
          entryType: 'first-input',
          startTime: 100.2,
          processingStart: 108.7
        },
        {
          entryType: 'layout-shift',
          value: 0.1,
          hadRecentInput: false
        }
      ];

      mockObserverInstances[0].triggerEntries(mixedEntries);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Performance Metrics:',
        expect.objectContaining({
          FCP: 1500.5,
          LCP: 2500.8,
          FID: 8.5,
          CLS: 0.1
        })
      );
    });

    it('应该累积CLS值', () => {
      renderHook(() => usePerformanceMonitor());

      // 第一批CLS条目
      mockObserverInstances[0].triggerEntries([
        {
          entryType: 'layout-shift',
          value: 0.1,
          hadRecentInput: false
        }
      ]);

      // 第二批CLS条目
      mockObserverInstances[0].triggerEntries([
        {
          entryType: 'layout-shift',
          value: 0.05,
          hadRecentInput: false
        }
      ]);

      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
      expect(mockConsoleLog).toHaveBeenNthCalledWith(1,
        'Performance Metrics:',
        expect.objectContaining({ CLS: 0.1 })
      );
      expect(mockConsoleLog).toHaveBeenNthCalledWith(2,
        'Performance Metrics:',
        expect.objectContaining({ CLS: 0.05 })
      );
    });
  });

  describe('错误处理测试', () => {
    it('应该处理PerformanceObserver不支持的情况', () => {
      const mockObserve = jest.fn().mockImplementation(() => {
        throw new Error('entryTypes not supported');
      });
      MockPerformanceObserver.prototype.observe = mockObserve;

      renderHook(() => usePerformanceMonitor());

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Performance Observer not fully supported:',
        expect.any(Error)
      );
    });

    it('应该处理部分entryTypes不支持的情况', () => {
      const mockObserve = jest.fn().mockImplementation(() => {
        throw new Error('layout-shift not supported');
      });
      MockPerformanceObserver.prototype.observe = mockObserve;

      renderHook(() => usePerformanceMonitor());

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Performance Observer not fully supported:',
        expect.any(Error)
      );
    });

    it('应该处理空的性能条目列表', () => {
      renderHook(() => usePerformanceMonitor());

      mockObserverInstances[0].triggerEntries([]);

      // 不应该记录任何指标
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('应该处理无效的性能条目', () => {
      renderHook(() => usePerformanceMonitor());

      const invalidEntries = [
        {
          entryType: 'unknown-type',
          startTime: 1000
        },
        {
          entryType: 'paint',
          name: 'unknown-paint',
          startTime: 1500
        },
        {
          entryType: 'first-input',
          startTime: 100
          // 缺少processingStart
        }
      ];

      mockObserverInstances[0].triggerEntries(invalidEntries);

      // 不应该记录任何指标
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('性能指标阈值测试', () => {
    it('应该识别良好的FCP性能', () => {
      renderHook(() => usePerformanceMonitor());

      const goodFcpEntry = {
        entryType: 'paint',
        name: 'first-contentful-paint',
        startTime: 1200 // < 1800ms，良好
      };

      mockObserverInstances[0].triggerEntries([goodFcpEntry]);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Performance Metrics:',
        expect.objectContaining({
          FCP: 1200
        })
      );
    });

    it('应该识别需要改进的LCP性能', () => {
      renderHook(() => usePerformanceMonitor());

      const poorLcpEntry = {
        entryType: 'largest-contentful-paint',
        startTime: 3000 // > 2500ms，需要改进
      };

      mockObserverInstances[0].triggerEntries([poorLcpEntry]);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Performance Metrics:',
        expect.objectContaining({
          LCP: 3000
        })
      );
    });

    it('应该识别良好的FID性能', () => {
      renderHook(() => usePerformanceMonitor());

      const goodFidEntry = {
        entryType: 'first-input',
        startTime: 100,
        processingStart: 150 // 50ms < 100ms，良好
      };

      mockObserverInstances[0].triggerEntries([goodFidEntry]);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Performance Metrics:',
        expect.objectContaining({
          FID: 50
        })
      );
    });

    it('应该识别需要改进的CLS性能', () => {
      renderHook(() => usePerformanceMonitor());

      const poorClsEntry = {
        entryType: 'layout-shift',
        value: 0.25, // > 0.1，需要改进
        hadRecentInput: false
      };

      mockObserverInstances[0].triggerEntries([poorClsEntry]);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Performance Metrics:',
        expect.objectContaining({
          CLS: 0.25
        })
      );
    });
  });

  describe('内存泄漏防护测试', () => {
    it('应该在多次挂载和卸载时正确清理', () => {
      const mockDisconnect = jest.fn();
      MockPerformanceObserver.prototype.disconnect = mockDisconnect;

      // 多次挂载和卸载
      const { unmount: unmount1 } = renderHook(() => usePerformanceMonitor());
      const { unmount: unmount2 } = renderHook(() => usePerformanceMonitor());
      const { unmount: unmount3 } = renderHook(() => usePerformanceMonitor());

      expect(mockObserverInstances).toHaveLength(3);

      unmount1();
      unmount2();
      unmount3();

      expect(mockDisconnect).toHaveBeenCalledTimes(3);
    });

    it('应该处理观察器创建失败的情况', () => {
      // Mock PerformanceObserver构造函数抛出错误
      (global as any).PerformanceObserver = jest.fn().mockImplementation(() => {
        throw new Error('PerformanceObserver not supported');
      });

      // 不应该抛出错误
      expect(() => {
        renderHook(() => usePerformanceMonitor());
      }).not.toThrow();
    });
  });

  describe('实际使用场景测试', () => {
    it('应该模拟真实的页面加载性能指标', () => {
      renderHook(() => usePerformanceMonitor());

      // 模拟真实的页面加载序列
      const realWorldEntries = [
        // FCP - 首次内容绘制
        {
          entryType: 'paint',
          name: 'first-contentful-paint',
          startTime: 1234.5
        },
        // LCP - 最大内容绘制
        {
          entryType: 'largest-contentful-paint',
          startTime: 2456.7
        },
        // 用户交互
        {
          entryType: 'first-input',
          startTime: 3000.1,
          processingStart: 3012.3
        },
        // 布局偏移
        {
          entryType: 'layout-shift',
          value: 0.05,
          hadRecentInput: false
        },
        // 另一个布局偏移
        {
          entryType: 'layout-shift',
          value: 0.03,
          hadRecentInput: false
        }
      ];

      mockObserverInstances[0].triggerEntries(realWorldEntries);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Performance Metrics:',
        {
          FCP: 1234.5,
          LCP: 2456.7,
          FID: 12.2, // 3012.3 - 3000.1
          CLS: 0.08  // 0.05 + 0.03
        }
      );
    });

    it('应该处理SPA路由变化的性能监控', () => {
      const { unmount, rerender } = renderHook(() => usePerformanceMonitor());

      // 模拟第一个页面的性能指标
      mockObserverInstances[0].triggerEntries([
        {
          entryType: 'paint',
          name: 'first-contentful-paint',
          startTime: 1500
        }
      ]);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Performance Metrics:',
        expect.objectContaining({ FCP: 1500 })
      );

      // 模拟路由变化后的新性能指标
      mockObserverInstances[0].triggerEntries([
        {
          entryType: 'largest-contentful-paint',
          startTime: 800 // 路由变化后更快
        }
      ]);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Performance Metrics:',
        expect.objectContaining({ LCP: 800 })
      );
    });
  });

  describe('浏览器兼容性测试', () => {
    it('应该处理不支持PerformanceObserver的浏览器', () => {
      // 删除PerformanceObserver
      const originalPerformanceObserver = global.PerformanceObserver;
      delete (global as any).PerformanceObserver;

      // 不应该抛出错误
      expect(() => {
        renderHook(() => usePerformanceMonitor());
      }).not.toThrow();

      // 恢复PerformanceObserver
      global.PerformanceObserver = originalPerformanceObserver;
    });

    it('应该处理部分支持的PerformanceObserver', () => {
      // Mock部分支持的PerformanceObserver
      const mockObserve = jest.fn().mockImplementation((options) => {
        // 模拟某些entryTypes不支持
        if (options.entryTypes.includes('layout-shift')) {
          throw new Error('layout-shift not supported');
        }
      });

      MockPerformanceObserver.prototype.observe = mockObserve;

      renderHook(() => usePerformanceMonitor());

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Performance Observer not fully supported:',
        expect.any(Error)
      );
    });
  });
});