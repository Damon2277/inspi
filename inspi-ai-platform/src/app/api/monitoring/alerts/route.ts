/**
 * 告警管理API接口
 * 处理系统告警的接收、管理和通知
 */

import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/core/monitoring/logger';

type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'suppressed';
type AlertType = 'performance' | 'error' | 'security' | 'business' | 'system';

interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  timestamp: number;
  source: string;
  metadata: Record<string, any>;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  resolvedBy?: string;
  resolvedAt?: number;
  suppressedUntil?: number;
  notificationsSent: string[];
  escalationLevel: number;
}

interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  condition: string;
  threshold: number;
  severity: AlertSeverity;
  enabled: boolean;
  cooldownPeriod: number;
  escalationRules: EscalationRule[];
}

interface EscalationRule {
  level: number;
  delayMinutes: number;
  notificationChannels: string[];
  assignees: string[];
}

/**
 * 接收告警数据
 */
export async function POST(request: NextRequest) {
  try {
    const alertData = await request.json();

    // 验证告警数据
    if (!alertData.title || !alertData.message || !alertData.type) {
      return NextResponse.json(
        { error: 'Invalid alert data' },
        { status: 400 },
      );
    }

    // 创建告警
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: alertData.type,
      severity: alertData.severity || 'medium',
      status: 'active',
      title: alertData.title,
      message: alertData.message,
      timestamp: Date.now(),
      source: alertData.source || 'system',
      metadata: alertData.metadata || {},
      notificationsSent: [],
      escalationLevel: 0,
    };

    // 检查是否需要抑制重复告警
    const shouldSuppress = await checkAlertSuppression(alert);
    if (shouldSuppress) {
      return NextResponse.json({
        success: true,
        alertId: alert.id,
        suppressed: true,
        timestamp: Date.now(),
      });
    }

    // 存储告警
    await storeAlert(alert);

    // 处理告警通知
    await processAlertNotifications(alert);

    // 记录到日志系统
    logger.warn('Alert created', {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      source: alert.source,
    }, ['alerts']);

    return NextResponse.json({
      success: true,
      alertId: alert.id,
      timestamp: Date.now(),
    });

  } catch (error) {
    logger.error('Failed to process alert', {
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
 * 获取告警列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const query = {
      type: searchParams.get('type') as AlertType | null,
      severity: searchParams.get('severity') as AlertSeverity | null,
      status: searchParams.get('status') as AlertStatus | null,
      startTime: searchParams.get('startTime') ? parseInt(searchParams.get('startTime')!, 10) : undefined,
      endTime: searchParams.get('endTime') ? parseInt(searchParams.get('endTime')!, 10) : undefined,
      source: searchParams.get('source'),
      limit: parseInt(searchParams.get('limit') || '50', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
    };

    const result = await queryAlerts(query);

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: Date.now(),
    });

  } catch (error) {
    logger.error('Failed to query alerts', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * 更新告警状态
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');
    const body = await request.json();

    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 },
      );
    }

    const result = await updateAlertStatus(alertId, body);

    if (!result) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 },
      );
    }

    logger.info('Alert status updated', {
      alertId,
      newStatus: body.status,
      updatedBy: body.updatedBy,
    }, ['alerts']);

    return NextResponse.json({
      success: true,
      alertId,
      timestamp: Date.now(),
    });

  } catch (error) {
    logger.error('Failed to update alert status', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * 存储告警
 */
async function storeAlert(alert: Alert) {
  if (typeof global !== 'undefined') {
    if (!(global as any).alertsStore) {
      (global as any).alertsStore = new Map();
    }
    (global as any).alertsStore.set(alert.id, alert);

    // 保持存储大小在合理范围内
    if ((global as any).alertsStore.size > 5000) {
      const entries = Array.from((global as any).alertsStore.entries()) as [string, any][];
      entries.sort(([, a], [, b]) => b.timestamp - a.timestamp);
      (global as any).alertsStore = new Map(entries.slice(0, 2500));
    }
  }

  // 更新告警统计
  await updateAlertStatistics(alert);
}

/**
 * 检查告警抑制
 */
async function checkAlertSuppression(alert: Alert): Promise<boolean> {
  if (typeof global !== 'undefined' && (global as any).alertsStore) {
    const now = Date.now();
    const suppressionWindow = 5 * 60 * 1000; // 5分钟

    // 检查是否有相同的活跃告警
    const existingAlerts = (Array.from((global as any).alertsStore.values()) as Alert[])
      .filter((existingAlert: Alert) =>
        existingAlert.status === 'active' &&
        existingAlert.type === alert.type &&
        existingAlert.title === alert.title &&
        existingAlert.source === alert.source &&
        now - existingAlert.timestamp < suppressionWindow,
      );

    return existingAlerts.length > 0;
  }

  return false;
}

/**
 * 处理告警通知
 */
async function processAlertNotifications(alert: Alert) {
  // 获取通知规则
  const notificationRules = await getNotificationRules(alert);

  // 发送即时通知
  await sendImmediateNotifications(alert, notificationRules);

  // 设置升级通知
  await scheduleEscalationNotifications(alert, notificationRules);

  // 更新通知发送记录
  await updateNotificationHistory(alert);
}

/**
 * 获取通知规则
 */
async function getNotificationRules(alert: Alert) {
  // 这里应该从配置或数据库中获取通知规则
  // 示例规则
  const defaultRules = {
    critical: {
      immediate: ['email', 'sms', 'slack'],
      escalation: [
        { level: 1, delayMinutes: 5, channels: ['phone'] },
        { level: 2, delayMinutes: 15, channels: ['manager_email'] },
      ],
    },
    high: {
      immediate: ['email', 'slack'],
      escalation: [
        { level: 1, delayMinutes: 15, channels: ['sms'] },
      ],
    },
    medium: {
      immediate: ['slack'],
      escalation: [],
    },
    low: {
      immediate: ['email'],
      escalation: [],
    },
  };

  return defaultRules[alert.severity] || defaultRules.medium;
}

/**
 * 发送即时通知
 */
async function sendImmediateNotifications(alert: Alert, rules: any) {
  const channels = rules.immediate || [];

  for (const channel of channels) {
    try {
      await sendNotification(alert, channel);
      alert.notificationsSent.push(`${channel}:${Date.now()}`);
    } catch (error) {
      logger.error('Failed to send notification', {
        alertId: alert.id,
        channel,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * 发送通知
 */
async function sendNotification(alert: Alert, channel: string) {
  const message = formatAlertMessage(alert, channel);

  switch (channel) {
    case 'email':
      await sendEmailNotification(alert, message);
      break;
    case 'sms':
      await sendSMSNotification(alert, message);
      break;
    case 'slack':
      await sendSlackNotification(alert, message);
      break;
    case 'phone':
      await sendPhoneNotification(alert, message);
      break;
    case 'webhook':
      await sendWebhookNotification(alert, message);
      break;
    default:
      console.log(`Unknown notification channel: ${channel}`);
  }
}

/**
 * 格式化告警消息
 */
function formatAlertMessage(alert: Alert, channel: string): string {
  const baseMessage = `[${alert.severity.toUpperCase()}] ${alert.title}\n${alert.message}`;

  switch (channel) {
    case 'sms':
      // SMS消息需要简短
      return `${alert.severity.toUpperCase()}: ${alert.title}`;
    case 'slack':
      // Slack支持富文本格式
      return `🚨 *${alert.title}*\n\`\`\`${alert.message}\`\`\`\n*Severity:* ${alert.severity}\n*Source:* ${alert.source}`;
    case 'email':
      // 邮件支持HTML格式
      return `
        <h2>Alert: ${alert.title}</h2>
        <p><strong>Severity:</strong> ${alert.severity}</p>
        <p><strong>Source:</strong> ${alert.source}</p>
        <p><strong>Time:</strong> ${new Date(alert.timestamp).toISOString()}</p>
        <p><strong>Message:</strong></p>
        <pre>${alert.message}</pre>
        <p><strong>Metadata:</strong></p>
        <pre>${JSON.stringify(alert.metadata, null, 2)}</pre>
      `;
    default:
      return baseMessage;
  }
}

/**
 * 发送邮件通知
 */
async function sendEmailNotification(alert: Alert, message: string) {
  // 实现邮件发送逻辑
  console.log('Sending email notification:', {
    to: 'admin@example.com',
    subject: `Alert: ${alert.title}`,
    body: message,
  });
}

/**
 * 发送短信通知
 */
async function sendSMSNotification(alert: Alert, message: string) {
  // 实现短信发送逻辑
  console.log('Sending SMS notification:', {
    to: '+1234567890',
    message,
  });
}

/**
 * 发送Slack通知
 */
async function sendSlackNotification(alert: Alert, message: string) {
  // 实现Slack通知逻辑
  console.log('Sending Slack notification:', {
    channel: '#alerts',
    message,
  });
}

/**
 * 发送电话通知
 */
async function sendPhoneNotification(alert: Alert, message: string) {
  // 实现电话通知逻辑
  console.log('Sending phone notification:', {
    to: '+1234567890',
    message,
  });
}

/**
 * 发送Webhook通知
 */
async function sendWebhookNotification(alert: Alert, message: string) {
  // 实现Webhook通知逻辑
  console.log('Sending webhook notification:', {
    url: 'https://example.com/webhook',
    payload: { alert, message },
  });
}

/**
 * 设置升级通知
 */
async function scheduleEscalationNotifications(alert: Alert, rules: any) {
  const escalationRules = rules.escalation || [];

  for (const rule of escalationRules) {
    setTimeout(async () => {
      // 检查告警是否仍然活跃
      const currentAlert = await getAlert(alert.id);
      if (currentAlert && currentAlert.status === 'active') {
        // 发送升级通知
        for (const channel of rule.channels) {
          try {
            await sendNotification(currentAlert, channel);
            currentAlert.escalationLevel = Math.max(currentAlert.escalationLevel, rule.level);
            currentAlert.notificationsSent.push(`${channel}:${Date.now()}:escalation:${rule.level}`);
          } catch (error) {
            logger.error('Failed to send escalation notification', {
              alertId: alert.id,
              level: rule.level,
              channel,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }
    }, rule.delayMinutes * 60 * 1000);
  }
}

/**
 * 更新通知历史
 */
async function updateNotificationHistory(alert: Alert) {
  if (typeof global !== 'undefined') {
    if (!(global as any).notificationHistory) {
      (global as any).notificationHistory = [];
    }

    (global as any).notificationHistory.push({
      alertId: alert.id,
      timestamp: Date.now(),
      notifications: alert.notificationsSent,
    });

    // 保持历史记录在合理范围内
    if ((global as any).notificationHistory.length > 10000) {
      (global as any).notificationHistory = (global as any).notificationHistory.slice(-5000);
    }
  }
}

/**
 * 更新告警统计
 */
async function updateAlertStatistics(alert: Alert) {
  if (typeof global !== 'undefined') {
    if (!(global as any).alertStats) {
      (global as any).alertStats = {
        totalAlerts: 0,
        byType: {},
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        byStatus: { active: 0, acknowledged: 0, resolved: 0, suppressed: 0 },
        recentAlerts: [],
        lastUpdate: Date.now(),
      };
    }

    const stats = (global as any).alertStats;

    stats.totalAlerts++;
    stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
    stats.bySeverity[alert.severity]++;
    stats.byStatus[alert.status]++;

    stats.recentAlerts.push({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      timestamp: alert.timestamp,
    });

    // 保持最近告警数量在合理范围内
    if (stats.recentAlerts.length > 100) {
      stats.recentAlerts = stats.recentAlerts.slice(-50);
    }

    stats.lastUpdate = Date.now();
  }
}

/**
 * 查询告警
 */
async function queryAlerts(query: any) {
  let alerts: Alert[] = [];

  if (typeof global !== 'undefined' && (global as any).alertsStore) {
    alerts = (Array.from((global as any).alertsStore.values()) as Alert[]).filter((alert: Alert) => {
      // 类型过滤
      if (query.type && alert.type !== query.type) {
        return false;
      }

      // 严重程度过滤
      if (query.severity && alert.severity !== query.severity) {
        return false;
      }

      // 状态过滤
      if (query.status && alert.status !== query.status) {
        return false;
      }

      // 时间范围过滤
      if (query.startTime && alert.timestamp < query.startTime) {
        return false;
      }
      if (query.endTime && alert.timestamp > query.endTime) {
        return false;
      }

      // 来源过滤
      if (query.source && alert.source !== query.source) {
        return false;
      }

      return true;
    });
  }

  // 排序（最新的在前）
  alerts.sort((a, b) => b.timestamp - a.timestamp);

  // 分页
  const total = alerts.length;
  const paginatedAlerts = alerts.slice(query.offset, query.offset + query.limit);

  // 获取统计信息
  const stats = generateAlertStats(alerts);

  return {
    alerts: paginatedAlerts,
    stats,
    total,
    offset: query.offset,
    limit: query.limit,
    hasMore: query.offset + query.limit < total,
  };
}

/**
 * 生成告警统计
 */
function generateAlertStats(alerts: Alert[]) {
  const stats = {
    totalAlerts: alerts.length,
    byType: {} as Record<string, number>,
    bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
    byStatus: { active: 0, acknowledged: 0, resolved: 0, suppressed: 0 },
    avgResolutionTime: 0,
    activeAlerts: 0,
  };

  let totalResolutionTime = 0;
  let resolvedCount = 0;

  alerts.forEach(alert => {
    stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
    stats.bySeverity[alert.severity]++;
    stats.byStatus[alert.status]++;

    if (alert.status === 'active') {
      stats.activeAlerts++;
    }

    if (alert.status === 'resolved' && alert.resolvedAt) {
      totalResolutionTime += alert.resolvedAt - alert.timestamp;
      resolvedCount++;
    }
  });

  if (resolvedCount > 0) {
    stats.avgResolutionTime = totalResolutionTime / resolvedCount;
  }

  return stats;
}

/**
 * 更新告警状态
 */
async function updateAlertStatus(alertId: string, updates: any) {
  if (typeof global !== 'undefined' && (global as any).alertsStore) {
    const alert = (global as any).alertsStore.get(alertId);
    if (alert) {
      const now = Date.now();

      // 更新基本信息
      Object.assign(alert, updates);

      // 设置时间戳
      if (updates.status === 'acknowledged' && !alert.acknowledgedAt) {
        alert.acknowledgedAt = now;
        alert.acknowledgedBy = updates.updatedBy;
      } else if (updates.status === 'resolved' && !alert.resolvedAt) {
        alert.resolvedAt = now;
        alert.resolvedBy = updates.updatedBy;
      } else if (updates.status === 'suppressed') {
        alert.suppressedUntil = updates.suppressedUntil || now + 60 * 60 * 1000; // 默认抑制1小时
      }

      // 记录状态变更
      logger.info('Alert status changed', {
        alertId,
        oldStatus: alert.status,
        newStatus: updates.status,
        updatedBy: updates.updatedBy,
      }, ['alerts']);

      return alert;
    }
  }
  return null;
}

/**
 * 获取单个告警
 */
async function getAlert(alertId: string): Promise<Alert | null> {
  if (typeof global !== 'undefined' && (global as any).alertsStore) {
    return (global as any).alertsStore.get(alertId) || null;
  }
  return null;
}
