/**
 * 监控系统入口文件
 */

// 导出所有监控模块
export { sentry, initSentry, reportError, setSentryUser, setSentryRequestContext } from './sentry';
export { monitoringContext, useMonitoringContext, initializeMonitoringContext } from './context';
export { errorFilter, requestFilter, performanceFilter } from './filters';
export { performanceMonitor, recordPerformanceMetric, PerformanceTimer, withPerformanceMonitoring } from './performance';
export { healthManager, createHealthCheckMiddleware } from './health';
export { getMonitoringConfig } from './config';

// 导出类型
export type { UserContext, RequestContext, DeviceContext, AppContext, BusinessContext } from './context';
export type { PerformanceMetric, WebVitalsMetric, ResourceMetric, MemoryMetric } from './performance';
export type { HealthCheckResult, SystemHealth, HealthCheckFunction } from './health';
export type { MonitoringConfig } from './config';

import { initSentry } from './sentry';
import { initializeMonitoringContext } from './context';
import { performanceMonitor } from './performance';
import { getMonitoringConfig } from './config';

/**
 * 初始化监控系统
 */
export function initializeMonitoring() {
  const config = getMonitoringConfig();

  // 初始化Sentry
  if (config.sentry.enabled) {
    initSentry();
  }

  // 初始化监控上下文
  initializeMonitoringContext();

  // 初始化性能监控
  if (config.performance.enabled) {
    performanceMonitor.init();
  }

  console.log('Monitoring system initialized', {
    sentry: config.sentry.enabled,
    performance: config.performance.enabled,
    health: config.health.enabled
  });
}

/**
 * 监控系统状态
 */
export function getMonitoringStatus() {
  const config = getMonitoringConfig();
  
  return {
    sentry: {
      enabled: config.sentry.enabled,
      environment: config.sentry.environment,
      debug: config.sentry.debug
    },
    performance: {
      enabled: config.performance.enabled,
      sampleRate: config.performance.sampleRate
    },
    health: {
      enabled: config.health.enabled,
      interval: config.health.interval
    },
    alerts: {
      enabled: config.alerts.enabled,
      channels: Object.keys(config.alerts.channels).filter(
        key => config.alerts.channels[key as keyof typeof config.alerts.channels]
      )
    }
  };
}

// 自动初始化（仅在浏览器环境）
if (typeof window !== 'undefined') {
  // 延迟初始化，避免阻塞页面加载
  setTimeout(() => {
    initializeMonitoring();
  }, 1000);
}

export default {
  initializeMonitoring,
  getMonitoringStatus
};