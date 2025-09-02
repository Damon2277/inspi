/**
 * 监控上下文管理
 */

import { sentry } from './sentry';
import { MONITORING_TAGS } from './config';

/**
 * 用户上下文接口
 */
export interface UserContext {
  id?: string;
  email?: string;
  username?: string;
  role?: string;
  subscription?: string;
  isAuthenticated?: boolean;
}

/**
 * 请求上下文接口
 */
export interface RequestContext {
  id?: string;
  method?: string;
  url?: string;
  userAgent?: string;
  ip?: string;
  referer?: string;
  headers?: Record<string, string>;
  query?: Record<string, any>;
  body?: any;
  startTime?: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
}

/**
 * 设备上下文接口
 */
export interface DeviceContext {
  type?: 'desktop' | 'mobile' | 'tablet';
  os?: string;
  browser?: string;
  version?: string;
  viewport?: {
    width: number;
    height: number;
  };
  connection?: {
    type?: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
}

/**
 * 应用上下文接口
 */
export interface AppContext {
  version?: string;
  environment?: string;
  buildId?: string;
  feature?: string;
  component?: string;
  route?: string;
  action?: string;
}

/**
 * 业务上下文接口
 */
export interface BusinessContext {
  workId?: string;
  userId?: string;
  sessionId?: string;
  experimentId?: string;
  feature?: string;
  action?: string;
  metadata?: Record<string, any>;
}

/**
 * 监控上下文管理器
 */
class MonitoringContextManager {
  private userContext: UserContext = {};
  private requestContext: RequestContext = {};
  private deviceContext: DeviceContext = {};
  private appContext: AppContext = {};
  private businessContext: BusinessContext = {};

  /**
   * 设置用户上下文
   */
  setUser(user: UserContext) {
    this.userContext = { ...this.userContext, ...user };
    
    // 同步到Sentry
    sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username
    });

    // 设置标签
    if (user.role) {
      sentry.setTag(MONITORING_TAGS.USER_ID, user.id || 'anonymous');
      sentry.setTag('user.role', user.role);
    }
    
    if (user.subscription) {
      sentry.setTag('user.subscription', user.subscription);
    }
  }

  /**
   * 设置请求上下文
   */
  setRequest(request: RequestContext) {
    this.requestContext = { ...this.requestContext, ...request };
    
    // 同步到Sentry
    sentry.setContext('request', {
      id: request.id,
      method: request.method,
      url: request.url,
      headers: this.sanitizeHeaders(request.headers),
      query: request.query,
      duration: request.duration,
      statusCode: request.statusCode
    });

    // 设置标签
    if (request.id) {
      sentry.setTag(MONITORING_TAGS.REQUEST_ID, request.id);
    }
    
    if (request.method) {
      sentry.setTag(MONITORING_TAGS.METHOD, request.method);
    }
    
    if (request.url) {
      sentry.setTag(MONITORING_TAGS.ENDPOINT, this.extractEndpoint(request.url));
    }
    
    if (request.statusCode) {
      sentry.setTag(MONITORING_TAGS.STATUS_CODE, request.statusCode.toString());
    }
  }

  /**
   * 设置设备上下文
   */
  setDevice(device: DeviceContext) {
    this.deviceContext = { ...this.deviceContext, ...device };
    
    // 同步到Sentry
    sentry.setContext('device', {
      type: device.type,
      os: device.os,
      browser: device.browser,
      version: device.version,
      viewport: device.viewport,
      connection: device.connection
    });

    // 设置标签
    if (device.os) {
      sentry.setTag(MONITORING_TAGS.OS, device.os);
    }
    
    if (device.browser) {
      sentry.setTag(MONITORING_TAGS.BROWSER, device.browser);
    }
    
    if (device.type) {
      sentry.setTag(MONITORING_TAGS.DEVICE, device.type);
    }
  }

  /**
   * 设置应用上下文
   */
  setApp(app: AppContext) {
    this.appContext = { ...this.appContext, ...app };
    
    // 同步到Sentry
    sentry.setContext('app', {
      version: app.version,
      environment: app.environment,
      buildId: app.buildId,
      feature: app.feature,
      component: app.component,
      route: app.route,
      action: app.action
    });

    // 设置标签
    if (app.version) {
      sentry.setTag(MONITORING_TAGS.VERSION, app.version);
    }
    
    if (app.environment) {
      sentry.setTag(MONITORING_TAGS.ENVIRONMENT, app.environment);
    }
    
    if (app.feature) {
      sentry.setTag('app.feature', app.feature);
    }
  }

  /**
   * 设置业务上下文
   */
  setBusiness(business: BusinessContext) {
    this.businessContext = { ...this.businessContext, ...business };
    
    // 同步到Sentry
    sentry.setContext('business', {
      workId: business.workId,
      userId: business.userId,
      sessionId: business.sessionId,
      experimentId: business.experimentId,
      feature: business.feature,
      action: business.action,
      metadata: business.metadata
    });

    // 设置标签
    if (business.workId) {
      sentry.setTag('business.workId', business.workId);
    }
    
    if (business.sessionId) {
      sentry.setTag('business.sessionId', business.sessionId);
    }
    
    if (business.feature) {
      sentry.setTag('business.feature', business.feature);
    }
  }

  /**
   * 添加面包屑
   */
  addBreadcrumb(message: string, category?: string, data?: any, level?: 'debug' | 'info' | 'warning' | 'error') {
    sentry.addBreadcrumb({
      message,
      category: category || 'custom',
      level: level || 'info',
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 获取当前上下文
   */
  getCurrentContext() {
    return {
      user: this.userContext,
      request: this.requestContext,
      device: this.deviceContext,
      app: this.appContext,
      business: this.businessContext
    };
  }

  /**
   * 清除上下文
   */
  clearContext() {
    this.userContext = {};
    this.requestContext = {};
    this.deviceContext = {};
    this.appContext = {};
    this.businessContext = {};
  }

  /**
   * 清除用户上下文
   */
  clearUser() {
    this.userContext = {};
    sentry.setUser({});
  }

  /**
   * 从浏览器环境自动设置设备上下文
   */
  autoSetDeviceContext() {
    if (typeof window === 'undefined') {
      return;
    }

    const device: DeviceContext = {};

    // 检测设备类型
    const userAgent = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      device.type = /iPad/.test(userAgent) ? 'tablet' : 'mobile';
    } else {
      device.type = 'desktop';
    }

    // 检测操作系统
    if (/Windows/.test(userAgent)) {
      device.os = 'Windows';
    } else if (/Mac/.test(userAgent)) {
      device.os = 'macOS';
    } else if (/Linux/.test(userAgent)) {
      device.os = 'Linux';
    } else if (/Android/.test(userAgent)) {
      device.os = 'Android';
    } else if (/iPhone|iPad/.test(userAgent)) {
      device.os = 'iOS';
    }

    // 检测浏览器
    if (/Chrome/.test(userAgent)) {
      device.browser = 'Chrome';
    } else if (/Firefox/.test(userAgent)) {
      device.browser = 'Firefox';
    } else if (/Safari/.test(userAgent)) {
      device.browser = 'Safari';
    } else if (/Edge/.test(userAgent)) {
      device.browser = 'Edge';
    }

    // 获取视口信息
    device.viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // 获取网络连接信息
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      device.connection = {
        type: connection.type,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      };
    }

    this.setDevice(device);
  }

  /**
   * 清理敏感的请求头
   */
  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> {
    if (!headers) {
      return {};
    }

    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

    Object.entries(headers).forEach(([key, value]) => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * 从URL提取端点
   */
  private extractEndpoint(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url;
    }
  }
}

// 创建全局上下文管理器实例
export const monitoringContext = new MonitoringContextManager();

/**
 * React Hook: 使用监控上下文
 */
export function useMonitoringContext() {
  return {
    setUser: monitoringContext.setUser.bind(monitoringContext),
    setRequest: monitoringContext.setRequest.bind(monitoringContext),
    setDevice: monitoringContext.setDevice.bind(monitoringContext),
    setApp: monitoringContext.setApp.bind(monitoringContext),
    setBusiness: monitoringContext.setBusiness.bind(monitoringContext),
    addBreadcrumb: monitoringContext.addBreadcrumb.bind(monitoringContext),
    getCurrentContext: monitoringContext.getCurrentContext.bind(monitoringContext),
    clearContext: monitoringContext.clearContext.bind(monitoringContext),
    clearUser: monitoringContext.clearUser.bind(monitoringContext),
    autoSetDeviceContext: monitoringContext.autoSetDeviceContext.bind(monitoringContext)
  };
}

/**
 * 自动设置基础上下文
 */
export function initializeMonitoringContext() {
  // 设置应用上下文
  monitoringContext.setApp({
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    buildId: process.env.NEXT_PUBLIC_BUILD_ID
  });

  // 在浏览器环境中自动设置设备上下文
  if (typeof window !== 'undefined') {
    monitoringContext.autoSetDeviceContext();
  }
}

export default monitoringContext;