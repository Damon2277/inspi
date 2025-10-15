/**
 * 错误追踪API接口
 * 接收、分析和管理错误数据
 */

import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/core/monitoring/logger';

type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
type ErrorStatus = 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'ignored';
type ErrorCategory = 'javascript' | 'network' | 'api' | 'validation' | 'business' | 'security' | 'performance';

interface ErrorEvent {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  status: ErrorStatus;
  fingerprint: string;
  context: {
    url: string;
    userAgent: string;
    userId?: string;
    sessionId?: string;
    requestId?: string;
    component?: string;
    action?: string;
    metadata?: Record<string, any>;
  };
  environment: {
    browser?: string;
    version?: string;
    os?: string;
    device?: string;
    viewport?: { width: number; height: number };
  };
  breadcrumbs: Array<{
    timestamp: number;
    category: string;
    message: string;
    level: 'debug' | 'info' | 'warning' | 'error';
    data?: Record<string, any>;
  }>;
  tags: string[];
}

/**
 * 接收错误数据
 */
export async function POST(request: NextRequest) {
  try {
    const errorEvent: ErrorEvent = await request.json();

    // 验证错误数据
    if (!errorEvent.message || !errorEvent.fingerprint) {
      return NextResponse.json(
        { error: 'Invalid error data' },
        { status: 400 },
      );
    }

    // 处理错误事件
    const processedError = {
      ...errorEvent,
      receivedAt: Date.now(),
      ip: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
    };

    // 存储错误
    await storeError(processedError);

    // 更新错误模式
    await updateErrorPattern(processedError);

    // 检查告警条件
    await checkErrorAlerts(processedError);

    // 记录到日志系统
    logger.error('Error received', {
      errorId: errorEvent.id,
      message: errorEvent.message,
      category: errorEvent.category,
      severity: errorEvent.severity,
      fingerprint: errorEvent.fingerprint,
      userId: errorEvent.context.userId,
    }, ['error-tracking']);

    return NextResponse.json({
      success: true,
      errorId: errorEvent.id,
      timestamp: Date.now(),
    });

  } catch (error) {
    logger.error('Failed to process error event', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * 获取错误数据
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const query = {
      severity: searchParams.get('severity') as ErrorSeverity | null,
      category: searchParams.get('category') as ErrorCategory | null,
      status: searchParams.get('status') as ErrorStatus | null,
      startTime: searchParams.get('startTime') ? parseInt(searchParams.get('startTime')!, 10) : undefined,
      endTime: searchParams.get('endTime') ? parseInt(searchParams.get('endTime')!, 10) : undefined,
      userId: searchParams.get('userId'),
      fingerprint: searchParams.get('fingerprint'),
      limit: parseInt(searchParams.get('limit') || '50', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
    };

    const result = await queryErrors(query);

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: Date.now(),
    });

  } catch (error) {
    logger.error('Failed to query errors', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * 更新错误状态
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const errorId = searchParams.get('id');
    const body = await request.json();

    if (!errorId) {
      return NextResponse.json(
        { error: 'Error ID is required' },
        { status: 400 },
      );
    }

    const result = await updateErrorStatus(errorId, body);

    if (!result) {
      return NextResponse.json(
        { error: 'Error not found' },
        { status: 404 },
      );
    }

    logger.info('Error status updated', {
      errorId,
      newStatus: body.status,
      assignee: body.assignee,
      notes: body.notes,
    }, ['error-tracking']);

    return NextResponse.json({
      success: true,
      errorId,
      timestamp: Date.now(),
    });

  } catch (error) {
    logger.error('Failed to update error status', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * 存储错误数据
 */
async function storeError(errorEvent: any) {
  if (typeof global !== 'undefined') {
    if (!(global as any).errorsStore) {
      (global as any).errorsStore = new Map();
    }
    (global as any).errorsStore.set(errorEvent.id, errorEvent);

    // 保持存储大小在合理范围内
    if ((global as any).errorsStore.size > 10000) {
      const entries = Array.from((global as any).errorsStore.entries()) as [string, any][];
      entries.sort(([, a], [, b]) => b.timestamp - a.timestamp);
      (global as any).errorsStore = new Map(entries.slice(0, 5000));
    }
  }

  // 异步处理错误（例如发送到外部错误追踪服务）
  processErrorAsync(errorEvent);
}

/**
 * 更新错误模式
 */
async function updateErrorPattern(errorEvent: any) {
  if (typeof global !== 'undefined') {
    if (!(global as any).errorPatterns) {
      (global as any).errorPatterns = new Map();
    }

    const patterns = (global as any).errorPatterns;
    const existingPattern = patterns.get(errorEvent.fingerprint);

    if (existingPattern) {
      // 更新现有模式
      existingPattern.occurrences++;
      existingPattern.lastSeen = errorEvent.timestamp;
      existingPattern.affectedUsers.add(errorEvent.context.userId);

      // 更新严重程度（如果新错误更严重）
      if (getSeverityLevel(errorEvent.severity) > getSeverityLevel(existingPattern.severity)) {
        existingPattern.severity = errorEvent.severity;
      }
    } else {
      // 创建新模式
      patterns.set(errorEvent.fingerprint, {
        id: `pattern_${errorEvent.fingerprint}`,
        fingerprint: errorEvent.fingerprint,
        message: errorEvent.message,
        category: errorEvent.category,
        severity: errorEvent.severity,
        occurrences: 1,
        affectedUsers: new Set([errorEvent.context.userId].filter(Boolean)),
        firstSeen: errorEvent.timestamp,
        lastSeen: errorEvent.timestamp,
        status: 'new',
        trend: 'stable',
      });
    }

    // 更新趋势
    updateErrorTrends();
  }
}

/**
 * 获取严重程度级别
 */
function getSeverityLevel(severity: ErrorSeverity): number {
  const levels = { low: 1, medium: 2, high: 3, critical: 4 };
  return levels[severity] || 1;
}

/**
 * 更新错误趋势
 */
function updateErrorTrends() {
  if (typeof global !== 'undefined' && (global as any).errorPatterns) {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    (global as any).errorPatterns.forEach((pattern: any) => {
      // 计算最近一小时的错误数量
      const recentErrors = Array.from((global as any).errorsStore?.values() || [])
        .filter((error: any) =>
          error.fingerprint === pattern.fingerprint &&
          error.timestamp > now - oneHour,
        );

      // 计算前一小时的错误数量
      const previousErrors = Array.from((global as any).errorsStore?.values() || [])
        .filter((error: any) =>
          error.fingerprint === pattern.fingerprint &&
          error.timestamp > now - 2 * oneHour &&
          error.timestamp <= now - oneHour,
        );

      // 更新趋势
      if (recentErrors.length > previousErrors.length * 1.5) {
        pattern.trend = 'increasing';
      } else if (recentErrors.length < previousErrors.length * 0.5) {
        pattern.trend = 'decreasing';
      } else {
        pattern.trend = 'stable';
      }
    });
  }
}

/**
 * 检查错误告警
 */
async function checkErrorAlerts(errorEvent: any) {
  const alertConditions = [
    {
      name: 'new_critical_error',
      condition: (error: any) => error.severity === 'critical',
      action: 'immediate_alert',
    },
    {
      name: 'error_spike',
      condition: (error: any) => checkErrorSpike(error.fingerprint),
      action: 'spike_alert',
    },
    {
      name: 'high_error_rate',
      condition: () => checkHighErrorRate(),
      action: 'rate_alert',
    },
    {
      name: 'security_error',
      condition: (error: any) => error.category === 'security',
      action: 'security_alert',
    },
  ];

  for (const condition of alertConditions) {
    if (condition.condition(errorEvent)) {
      await triggerErrorAlert(condition.name, errorEvent, condition.action);
    }
  }
}

/**
 * 检查错误激增
 */
function checkErrorSpike(fingerprint: string): boolean {
  if (typeof global !== 'undefined' && (global as any).errorPatterns) {
    const pattern = (global as any).errorPatterns.get(fingerprint);
    return pattern && pattern.trend === 'increasing' && pattern.occurrences > 10;
  }
  return false;
}

/**
 * 检查高错误率
 */
function checkHighErrorRate(): boolean {
  if (typeof global !== 'undefined' && (global as any).errorsStore) {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentErrors = Array.from((global as any).errorsStore.values())
      .filter((error: any) => error.timestamp > now - oneHour);

    // 这里需要总请求数来计算真实的错误率
    // 暂时使用错误数量作为阈值
    return recentErrors.length > 100;
  }
  return false;
}

/**
 * 触发错误告警
 */
async function triggerErrorAlert(alertType: string, errorEvent: any, action: string) {
  const alert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: alertType,
    errorId: errorEvent.id,
    message: generateAlertMessage(alertType, errorEvent),
    severity: errorEvent.severity,
    timestamp: Date.now(),
    action,
    metadata: {
      fingerprint: errorEvent.fingerprint,
      category: errorEvent.category,
      userId: errorEvent.context.userId,
    },
  };

  // 存储告警
  if (typeof global !== 'undefined') {
    if (!(global as any).errorAlerts) {
      (global as any).errorAlerts = [];
    }
    (global as any).errorAlerts.push(alert);

    // 保持告警数量在合理范围内
    if ((global as any).errorAlerts.length > 1000) {
      (global as any).errorAlerts = (global as any).errorAlerts.slice(-500);
    }
  }

  // 发送告警通知
  await sendErrorAlert(alert);

  logger.warn('Error alert triggered', {
    alertType,
    errorId: errorEvent.id,
    message: alert.message,
    severity: errorEvent.severity,
  }, ['error-tracking', 'alert']);
}

/**
 * 生成告警消息
 */
function generateAlertMessage(alertType: string, errorEvent: any): string {
  switch (alertType) {
    case 'new_critical_error':
      return `Critical error detected: ${errorEvent.message}`;
    case 'error_spike':
      return `Error spike detected for: ${errorEvent.message}`;
    case 'high_error_rate':
      return 'High error rate detected in the system';
    case 'security_error':
      return `Security error detected: ${errorEvent.message}`;
    default:
      return `Error alert: ${errorEvent.message}`;
  }
}

/**
 * 发送错误告警
 */
async function sendErrorAlert(alert: any) {
  // 实现告警发送逻辑
  logger.error(`ERROR ALERT [${alert.type}]: ${alert.message}`, {
    alert,
  });

  // 这里可以集成各种通知服务
  switch (alert.action) {
    case 'immediate_alert':
      await sendImmediateAlert(alert);
      break;
    case 'spike_alert':
      await sendSpikeAlert(alert);
      break;
    case 'rate_alert':
      await sendRateAlert(alert);
      break;
    case 'security_alert':
      await sendSecurityAlert(alert);
      break;
  }
}

/**
 * 发送即时告警
 */
async function sendImmediateAlert(alert: any) {
  // 发送即时通知（例如：短信、电话、Slack等）
  logger.error('Immediate error alert dispatched', {
    message: alert.message,
  });
}

/**
 * 发送激增告警
 */
async function sendSpikeAlert(alert: any) {
  // 发送激增告警
  logger.warn('Error spike alert dispatched', {
    message: alert.message,
  });
}

/**
 * 发送错误率告警
 */
async function sendRateAlert(alert: any) {
  // 发送错误率告警
  logger.warn('Error rate alert dispatched', {
    message: alert.message,
  });
}

/**
 * 发送安全告警
 */
async function sendSecurityAlert(alert: any) {
  // 发送安全告警
  logger.error('Security error alert dispatched', {
    message: alert.message,
  });
}

/**
 * 查询错误数据
 */
async function queryErrors(query: any) {
  let errors: any[] = [];

  if (typeof global !== 'undefined' && (global as any).errorsStore) {
    errors = Array.from((global as any).errorsStore.values()).filter((error: any) => {
      // 严重程度过滤
      if (query.severity && error.severity !== query.severity) {
        return false;
      }

      // 类别过滤
      if (query.category && error.category !== query.category) {
        return false;
      }

      // 状态过滤
      if (query.status && error.status !== query.status) {
        return false;
      }

      // 时间范围过滤
      if (query.startTime && error.timestamp < query.startTime) {
        return false;
      }
      if (query.endTime && error.timestamp > query.endTime) {
        return false;
      }

      // 用户ID过滤
      if (query.userId && error.context.userId !== query.userId) {
        return false;
      }

      // 指纹过滤
      if (query.fingerprint && error.fingerprint !== query.fingerprint) {
        return false;
      }

      return true;
    });
  }

  // 排序（最新的在前）
  errors.sort((a, b) => b.timestamp - a.timestamp);

  // 分页
  const total = errors.length;
  const paginatedErrors = errors.slice(query.offset, query.offset + query.limit);

  // 获取错误统计
  const stats = generateErrorStats(errors);

  return {
    errors: paginatedErrors,
    stats,
    total,
    offset: query.offset,
    limit: query.limit,
    hasMore: query.offset + query.limit < total,
  };
}

/**
 * 生成错误统计
 */
function generateErrorStats(errors: any[]) {
  const stats = {
    totalErrors: errors.length,
    bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
    byCategory: {} as Record<string, number>,
    byStatus: { new: 0, acknowledged: 0, in_progress: 0, resolved: 0, ignored: 0 },
    uniqueUsers: new Set(),
    topPatterns: [] as any[],
  };

  errors.forEach(error => {
    stats.bySeverity[error.severity as keyof typeof stats.bySeverity]++;
    stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
    stats.byStatus[error.status as keyof typeof stats.byStatus]++;

    if (error.context.userId) {
      stats.uniqueUsers.add(error.context.userId);
    }
  });

  // 获取顶级错误模式
  if (typeof global !== 'undefined' && (global as any).errorPatterns) {
    stats.topPatterns = Array.from((global as any).errorPatterns.values())
      .sort((a: any, b: any) => b.occurrences - a.occurrences)
      .slice(0, 10);
  }

  return {
    ...stats,
    uniqueUsers: stats.uniqueUsers.size,
  };
}

/**
 * 更新错误状态
 */
async function updateErrorStatus(errorId: string, updates: any) {
  if (typeof global !== 'undefined' && (global as any).errorsStore) {
    const error = (global as any).errorsStore.get(errorId);
    if (error) {
      Object.assign(error, {
        ...updates,
        updatedAt: Date.now(),
      });

      // 如果错误被解决，更新对应的模式
      if (updates.status === 'resolved' && (global as any).errorPatterns) {
        const pattern = (global as any).errorPatterns.get(error.fingerprint);
        if (pattern) {
          pattern.status = 'resolved';
          pattern.resolvedAt = Date.now();
        }
      }

      return error;
    }
  }
  return null;
}

/**
 * 异步处理错误
 */
async function processErrorAsync(errorEvent: any) {
  // 这里可以实现异步处理逻辑
  // 例如：发送到外部错误追踪服务、生成错误报告等

  setTimeout(() => {
    // 模拟异步处理
    logger.info('Processed error asynchronously', {
      errorId: errorEvent.id,
    });

    // 可以在这里实现：
    // 1. 发送到 Sentry
    // 2. 生成错误报告
    // 3. 更新错误统计
    // 4. 触发自动修复
  }, 100);
}

/**
 * 获取客户端IP
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return 'unknown';
}
