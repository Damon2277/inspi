'use client';

import React, { useState, useEffect } from 'react';
import { 
  useMonitoringContext,
  recordPerformanceMetric,
  PerformanceTimer,
  getMonitoringStatus
} from '@/lib/monitoring';
import { useErrorHandler } from '@/hooks/useErrorHandler';

/**
 * 监控测试组件
 */
const MonitoringTestComponent: React.FC = () => {
  const [monitoringStatus, setMonitoringStatus] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any[]>([]);
  
  const monitoringContext = useMonitoringContext();
  const { handleError } = useErrorHandler();

  useEffect(() => {
    // 获取监控状态
    const status = getMonitoringStatus();
    setMonitoringStatus(status);

    // 设置用户上下文
    monitoringContext.setUser({
      id: 'test-user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'admin'
    });

    // 设置应用上下文
    monitoringContext.setApp({
      version: '1.0.0',
      environment: 'development',
      feature: 'monitoring-test',
      component: 'MonitoringTestComponent'
    });

    // 自动设置设备上下文
    monitoringContext.autoSetDeviceContext();
  }, []);

  /**
   * 测试健康检查
   */
  const testHealthCheck = async () => {
    try {
      const response = await fetch('/api/health');
      const health = await response.json();
      setHealthStatus(health);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Health check failed'));
    }
  };

  /**
   * 测试性能监控
   */
  const testPerformanceMonitoring = () => {
    // 测试手动性能指标
    recordPerformanceMetric('test_operation', Math.random() * 1000, 'ms', {
      operation: 'manual_test',
      component: 'MonitoringTestComponent'
    });

    // 测试性能计时器
    const timer = new PerformanceTimer('async_operation', {
      operation: 'timer_test'
    });

    setTimeout(() => {
      const duration = timer.end();
      setPerformanceMetrics(prev => [...prev, {
        name: 'async_operation',
        duration,
        timestamp: Date.now()
      }]);
    }, Math.random() * 2000);
  };

  /**
   * 测试错误监控
   */
  const testErrorMonitoring = () => {
    // 添加面包屑
    monitoringContext.addBreadcrumb('User clicked test error button', 'user', {
      component: 'MonitoringTestComponent',
      action: 'test_error'
    });

    // 触发错误
    handleError(new Error('This is a test error for monitoring'));
  };

  /**
   * 测试网络错误
   */
  const testNetworkError = async () => {
    try {
      await fetch('/api/nonexistent-endpoint');
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Network error test'));
    }
  };

  /**
   * 测试慢操作
   */
  const testSlowOperation = async () => {
    const timer = new PerformanceTimer('slow_operation', {
      operation: 'slow_test',
      expected_duration: '3000ms'
    });

    monitoringContext.addBreadcrumb('Starting slow operation', 'performance');

    // 模拟慢操作
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    timer.end();
    monitoringContext.addBreadcrumb('Slow operation completed', 'performance');
  };

  /**
   * 测试业务上下文
   */
  const testBusinessContext = () => {
    monitoringContext.setBusiness({
      workId: 'work-123',
      userId: 'user-456',
      sessionId: 'session-789',
      feature: 'ai_teaching_wizard',
      action: 'generate_cards',
      metadata: {
        cardType: 'concept',
        subject: 'mathematics',
        difficulty: 'intermediate'
      }
    });

    monitoringContext.addBreadcrumb('Business context updated', 'business', {
      workId: 'work-123',
      action: 'generate_cards'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">监控系统测试页面</h1>
      
      <div className="space-y-8">
        {/* 监控状态 */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">监控系统状态</h2>
          {monitoringStatus ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-700">Sentry</h3>
                <p className="text-sm text-gray-600">
                  状态: {monitoringStatus.sentry.enabled ? '已启用' : '未启用'}
                </p>
                <p className="text-sm text-gray-600">
                  环境: {monitoringStatus.sentry.environment}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-700">性能监控</h3>
                <p className="text-sm text-gray-600">
                  状态: {monitoringStatus.performance.enabled ? '已启用' : '未启用'}
                </p>
                <p className="text-sm text-gray-600">
                  采样率: {monitoringStatus.performance.sampleRate}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-700">健康检查</h3>
                <p className="text-sm text-gray-600">
                  状态: {monitoringStatus.health.enabled ? '已启用' : '未启用'}
                </p>
                <p className="text-sm text-gray-600">
                  间隔: {monitoringStatus.health.interval}ms
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-700">告警</h3>
                <p className="text-sm text-gray-600">
                  状态: {monitoringStatus.alerts.enabled ? '已启用' : '未启用'}
                </p>
                <p className="text-sm text-gray-600">
                  渠道: {monitoringStatus.alerts.channels.join(', ') || '无'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">加载中...</p>
          )}
        </section>

        {/* 健康检查测试 */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">健康检查测试</h2>
          <div className="space-y-4">
            <button
              onClick={testHealthCheck}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              执行健康检查
            </button>
            
            {healthStatus && (
              <div className="mt-4 p-4 bg-gray-50 rounded">
                <h3 className="font-medium mb-2">健康状态: 
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    healthStatus.status === 'healthy' ? 'bg-green-100 text-green-800' :
                    healthStatus.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {healthStatus.status}
                  </span>
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p>总检查数: {healthStatus.summary?.total || 0}</p>
                    <p>健康: {healthStatus.summary?.healthy || 0}</p>
                  </div>
                  <div>
                    <p>降级: {healthStatus.summary?.degraded || 0}</p>
                    <p>不健康: {healthStatus.summary?.unhealthy || 0}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  运行时间: {Math.round((healthStatus.uptime || 0) / 1000)}秒
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 性能监控测试 */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">性能监控测试</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <button
                onClick={testPerformanceMonitoring}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                测试性能指标
              </button>
              <button
                onClick={testSlowOperation}
                className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
              >
                测试慢操作
              </button>
            </div>
            
            {performanceMetrics.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">性能指标:</h3>
                <div className="space-y-2">
                  {performanceMetrics.slice(-5).map((metric, index) => (
                    <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                      <span className="font-medium">{metric.name}</span>: {metric.duration.toFixed(2)}ms
                      <span className="text-gray-500 ml-2">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 错误监控测试 */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">错误监控测试</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <button
                onClick={testErrorMonitoring}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                测试错误监控
              </button>
              <button
                onClick={testNetworkError}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                测试网络错误
              </button>
            </div>
            <p className="text-sm text-gray-600">
              点击按钮将触发测试错误，检查控制台和监控系统的错误记录。
            </p>
          </div>
        </section>

        {/* 上下文测试 */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">上下文测试</h2>
          <div className="space-y-4">
            <button
              onClick={testBusinessContext}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              设置业务上下文
            </button>
            <p className="text-sm text-gray-600">
              设置业务上下文信息，用于错误和性能监控的关联分析。
            </p>
          </div>
        </section>

        {/* 开发者信息 */}
        <section className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">开发者信息</h2>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• 所有监控数据都会记录到控制台（开发模式）</p>
            <p>• 生产环境中数据将发送到Sentry等监控服务</p>
            <p>• 健康检查API: /api/health</p>
            <p>• 数据库健康检查: /api/health/database</p>
            <p>• Redis健康检查: /api/health/redis</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MonitoringTestComponent;