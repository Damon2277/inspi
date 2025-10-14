/**
 * 告警管理服务
 * 管理系统告警的生成、发送、确认和解决
 */

import { EventEmitter } from 'events';

import { logger } from '@/shared/utils/logger';

import { DatabasePool } from '../database';

export interface Alert {
  id: string
  name: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'acknowledged' | 'resolved'
  source: string
  category: 'application' | 'infrastructure' | 'business' | 'security'
  labels: Record<string, string>
  annotations: Record<string, string>
  value?: number
  threshold?: number
  createdAt: Date
  updatedAt: Date
  acknowledgedAt?: Date
  acknowledgedBy?: string
  resolvedAt?: Date
  resolvedBy?: string
}

export interface AlertRule {
  id: string
  name: string
  description: string
  query: string
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
  threshold: number
  duration: number // 持续时间（秒）
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'application' | 'infrastructure' | 'business' | 'security'
  enabled: boolean
  labels: Record<string, string>
  annotations: Record<string, string>
  createdAt: Date
  updatedAt: Date
}

export interface NotificationChannel {
  id: string
  name: string
  type: 'email' | 'webhook' | 'dingtalk' | 'wechat' | 'sms'
  config: Record<string, any>
  enabled: boolean
  severityFilter: Array<'low' | 'medium' | 'high' | 'critical'>
  categoryFilter: Array<'application' | 'infrastructure' | 'business' | 'security'>
}

export interface AlertStats {
  total: number
  active: number
  acknowledged: number
  resolved: number
  bySeverity: Record<string, number>
  byCategory: Record<string, number>
  byStatus: Record<string, number>
}

export class AlertManager extends EventEmitter {
  private db: DatabasePool;
  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private notificationChannels: Map<string, NotificationChannel> = new Map();
  private evaluationInterval?: NodeJS.Timeout;
  private isRunning = false;
  private evaluationIntervalMs = 30000; // 30秒

  constructor(db: DatabasePool) {
    super();
    this.db = db;
    this.setupDefaultRules();
    this.setupDefaultChannels();
  }

  /**
   * 启动告警管理器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Alert manager is already running');
      return;
    }

    this.isRunning = true;

    // 加载现有告警和规则
    await this.loadAlertsFromDatabase();
    await this.loadRulesFromDatabase();
    await this.loadChannelsFromDatabase();

    // 开始定期评估告警规则
    this.evaluationInterval = setInterval(() => {
      this.evaluateAlertRules();
    }, this.evaluationIntervalMs);

    logger.info('Alert manager started', {
      evaluationInterval: this.evaluationIntervalMs,
      rulesCount: this.alertRules.size,
      channelsCount: this.notificationChannels.size,
    });

    this.emit('started');
  }

  /**
   * 停止告警管理器
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
    }

    logger.info('Alert manager stopped');
    this.emit('stopped');
  }

  /**
   * 创建告警
   */
  async createAlert(alertData: Omit<Alert, 'id' | 'createdAt' | 'updatedAt'>): Promise<Alert> {
    const alert: Alert = {
      ...alertData,
      id: this.generateAlertId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 保存到内存
    this.alerts.set(alert.id, alert);

    // 保存到数据库
    await this.saveAlertToDatabase(alert);

    // 发送通知
    await this.sendNotifications(alert);

    logger.info('Alert created', {
      alertId: alert.id,
      name: alert.name,
      severity: alert.severity,
      category: alert.category,
    });

    this.emit('alertCreated', alert);

    return alert;
  }

  /**
   * 确认告警
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<Alert | null> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      logger.warn('Alert not found for acknowledgment', { alertId });
      return null;
    }

    if (alert.status !== 'active') {
      logger.warn('Cannot acknowledge non-active alert', { alertId, status: alert.status });
      return null;
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;
    alert.updatedAt = new Date();

    // 更新数据库
    await this.updateAlertInDatabase(alert);

    logger.info('Alert acknowledged', {
      alertId: alert.id,
      acknowledgedBy,
      name: alert.name,
    });

    this.emit('alertAcknowledged', alert);

    return alert;
  }

  /**
   * 解决告警
   */
  async resolveAlert(alertId: string, resolvedBy?: string): Promise<Alert | null> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      logger.warn('Alert not found for resolution', { alertId });
      return null;
    }

    if (alert.status === 'resolved') {
      logger.warn('Alert already resolved', { alertId });
      return alert;
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;
    alert.updatedAt = new Date();

    // 更新数据库
    await this.updateAlertInDatabase(alert);

    logger.info('Alert resolved', {
      alertId: alert.id,
      resolvedBy,
      name: alert.name,
      duration: alert.resolvedAt.getTime() - alert.createdAt.getTime(),
    });

    this.emit('alertResolved', alert);

    return alert;
  }

  /**
   * 获取告警列表
   */
  getAlerts(filters?: {
    status?: Alert['status']
    severity?: Alert['severity']
    category?: Alert['category']
    limit?: number
    offset?: number
  }): Alert[] {
    let alerts = Array.from(this.alerts.values());

    // 应用过滤器
    if (filters) {
      if (filters.status) {
        alerts = alerts.filter(alert => alert.status === filters.status);
      }
      if (filters.severity) {
        alerts = alerts.filter(alert => alert.severity === filters.severity);
      }
      if (filters.category) {
        alerts = alerts.filter(alert => alert.category === filters.category);
      }
    }

    // 按创建时间倒序排列
    alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // 应用分页
    if (filters?.offset || filters?.limit) {
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      alerts = alerts.slice(offset, offset + limit);
    }

    return alerts;
  }

  /**
   * 获取告警统计
   */
  getAlertStats(): AlertStats {
    const alerts = Array.from(this.alerts.values());

    const stats: AlertStats = {
      total: alerts.length,
      active: 0,
      acknowledged: 0,
      resolved: 0,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byCategory: { application: 0, infrastructure: 0, business: 0, security: 0 },
      byStatus: { active: 0, acknowledged: 0, resolved: 0 },
    };

    for (const alert of alerts) {
      // 按状态统计
      stats.byStatus[alert.status]++;
      if (alert.status === 'active') stats.active++;
      else if (alert.status === 'acknowledged') stats.acknowledged++;
      else if (alert.status === 'resolved') stats.resolved++;

      // 按严重程度统计
      stats.bySeverity[alert.severity]++;

      // 按类别统计
      stats.byCategory[alert.category]++;
    }

    return stats;
  }

  /**
   * 添加告警规则
   */
  async addAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertRule> {
    const alertRule: AlertRule = {
      ...rule,
      id: this.generateRuleId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.alertRules.set(alertRule.id, alertRule);
    await this.saveRuleToDatabase(alertRule);

    logger.info('Alert rule added', {
      ruleId: alertRule.id,
      name: alertRule.name,
      severity: alertRule.severity,
    });

    this.emit('ruleAdded', alertRule);

    return alertRule;
  }

  /**
   * 删除告警规则
   */
  async removeAlertRule(ruleId: string): Promise<boolean> {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      return false;
    }

    this.alertRules.delete(ruleId);
    await this.deleteRuleFromDatabase(ruleId);

    logger.info('Alert rule removed', { ruleId, name: rule.name });
    this.emit('ruleRemoved', rule);

    return true;
  }

  /**
   * 添加通知渠道
   */
  async addNotificationChannel(channel: Omit<NotificationChannel, 'id'>): Promise<NotificationChannel> {
    const notificationChannel: NotificationChannel = {
      ...channel,
      id: this.generateChannelId(),
    };

    this.notificationChannels.set(notificationChannel.id, notificationChannel);
    await this.saveChannelToDatabase(notificationChannel);

    logger.info('Notification channel added', {
      channelId: notificationChannel.id,
      name: notificationChannel.name,
      type: notificationChannel.type,
    });

    return notificationChannel;
  }

  /**
   * 评估告警规则
   */
  private async evaluateAlertRules(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      for (const [ruleId, rule] of this.alertRules.entries()) {
        if (!rule.enabled) {
          continue;
        }

        await this.evaluateRule(rule);
      }
    } catch (error) {
      logger.error('Failed to evaluate alert rules', { error });
    }
  }

  /**
   * 评估单个规则
   */
  private async evaluateRule(rule: AlertRule): Promise<void> {
    try {
      // 这里应该执行实际的查询来获取指标值
      // 为了演示，使用模拟数据
      const currentValue = await this.executeQuery(rule.query);

      const shouldAlert = this.evaluateCondition(currentValue, rule.condition, rule.threshold);

      // 检查是否已有相同的活跃告警
      const existingAlert = Array.from(this.alerts.values()).find(
        alert => alert.source === rule.id && alert.status === 'active',
      );

      if (shouldAlert && !existingAlert) {
        // 创建新告警
        await this.createAlert({
          name: rule.name,
          description: rule.description,
          severity: rule.severity,
          status: 'active',
          source: rule.id,
          category: rule.category,
          labels: { ...rule.labels, rule_id: rule.id },
          annotations: {
            ...rule.annotations,
            current_value: currentValue.toString(),
            threshold: rule.threshold.toString(),
          },
          value: currentValue,
          threshold: rule.threshold,
        });
      } else if (!shouldAlert && existingAlert) {
        // 自动解决告警
        await this.resolveAlert(existingAlert.id, 'system');
      }
    } catch (error) {
      logger.error('Failed to evaluate rule', { error, ruleId: rule.id, ruleName: rule.name });
    }
  }

  /**
   * 执行查询获取指标值
   */
  private async executeQuery(query: string): Promise<number> {
    // 这里应该执行实际的查询
    // 为了演示，返回随机值
    return Math.random() * 100;
  }

  /**
   * 评估条件
   */
  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  /**
   * 发送通知
   */
  private async sendNotifications(alert: Alert): Promise<void> {
    const channels = Array.from(this.notificationChannels.values()).filter(
      channel =>
        channel.enabled &&
        channel.severityFilter.includes(alert.severity) &&
        channel.categoryFilter.includes(alert.category),
    );

    for (const channel of channels) {
      try {
        await this.sendNotification(channel, alert);
      } catch (error) {
        logger.error('Failed to send notification', {
          error,
          channelId: channel.id,
          alertId: alert.id,
        });
      }
    }
  }

  /**
   * 发送单个通知
   */
  private async sendNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.sendEmailNotification(channel, alert);
        break;
      case 'webhook':
        await this.sendWebhookNotification(channel, alert);
        break;
      case 'dingtalk':
        await this.sendDingtalkNotification(channel, alert);
        break;
      case 'wechat':
        await this.sendWechatNotification(channel, alert);
        break;
      case 'sms':
        await this.sendSmsNotification(channel, alert);
        break;
      default:
        logger.warn('Unknown notification channel type', { type: channel.type });
    }
  }

  /**
   * 发送邮件通知
   */
  private async sendEmailNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    // 实现邮件发送逻辑
    logger.info('Email notification sent', {
      channelId: channel.id,
      alertId: alert.id,
      to: channel.config.to,
    });
  }

  /**
   * 发送Webhook通知
   */
  private async sendWebhookNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    // 实现Webhook发送逻辑
    logger.info('Webhook notification sent', {
      channelId: channel.id,
      alertId: alert.id,
      url: channel.config.url,
    });
  }

  /**
   * 发送钉钉通知
   */
  private async sendDingtalkNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    // 实现钉钉发送逻辑
    logger.info('Dingtalk notification sent', {
      channelId: channel.id,
      alertId: alert.id,
    });
  }

  /**
   * 发送企业微信通知
   */
  private async sendWechatNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    // 实现企业微信发送逻辑
    logger.info('Wechat notification sent', {
      channelId: channel.id,
      alertId: alert.id,
    });
  }

  /**
   * 发送短信通知
   */
  private async sendSmsNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    // 实现短信发送逻辑
    logger.info('SMS notification sent', {
      channelId: channel.id,
      alertId: alert.id,
      phone: channel.config.phone,
    });
  }

  /**
   * 设置默认规则
   */
  private setupDefaultRules(): void {
    // 这里可以设置一些默认的告警规则
    // 实际规则应该从配置文件或数据库加载
  }

  /**
   * 设置默认通知渠道
   */
  private setupDefaultChannels(): void {
    // 这里可以设置一些默认的通知渠道
    // 实际渠道应该从配置文件或数据库加载
  }

  /**
   * 从数据库加载告警
   */
  private async loadAlertsFromDatabase(): Promise<void> {
    try {
      const alerts = await this.db.query(`
        SELECT * FROM alerts 
        WHERE status IN ('active', 'acknowledged')
        ORDER BY created_at DESC
        LIMIT 1000
      `);

      for (const alertData of alerts) {
        const alert: Alert = {
          id: alertData.id,
          name: alertData.name,
          description: alertData.description,
          severity: alertData.severity,
          status: alertData.status,
          source: alertData.source,
          category: alertData.category,
          labels: JSON.parse(alertData.labels || '{}'),
          annotations: JSON.parse(alertData.annotations || '{}'),
          value: alertData.value,
          threshold: alertData.threshold,
          createdAt: new Date(alertData.created_at),
          updatedAt: new Date(alertData.updated_at),
          acknowledgedAt: alertData.acknowledged_at ? new Date(alertData.acknowledged_at) : undefined,
          acknowledgedBy: alertData.acknowledged_by,
          resolvedAt: alertData.resolved_at ? new Date(alertData.resolved_at) : undefined,
          resolvedBy: alertData.resolved_by,
        };

        this.alerts.set(alert.id, alert);
      }

      logger.info('Alerts loaded from database', { count: alerts.length });
    } catch (error) {
      logger.error('Failed to load alerts from database', { error });
    }
  }

  /**
   * 从数据库加载规则
   */
  private async loadRulesFromDatabase(): Promise<void> {
    // 实现从数据库加载规则的逻辑
  }

  /**
   * 从数据库加载通知渠道
   */
  private async loadChannelsFromDatabase(): Promise<void> {
    // 实现从数据库加载通知渠道的逻辑
  }

  /**
   * 保存告警到数据库
   */
  private async saveAlertToDatabase(alert: Alert): Promise<void> {
    // 实现保存告警到数据库的逻辑
  }

  /**
   * 更新数据库中的告警
   */
  private async updateAlertInDatabase(alert: Alert): Promise<void> {
    // 实现更新数据库中告警的逻辑
  }

  /**
   * 保存规则到数据库
   */
  private async saveRuleToDatabase(rule: AlertRule): Promise<void> {
    // 实现保存规则到数据库的逻辑
  }

  /**
   * 从数据库删除规则
   */
  private async deleteRuleFromDatabase(ruleId: string): Promise<void> {
    // 实现从数据库删除规则的逻辑
  }

  /**
   * 保存通知渠道到数据库
   */
  private async saveChannelToDatabase(channel: NotificationChannel): Promise<void> {
    // 实现保存通知渠道到数据库的逻辑
  }

  /**
   * 生成告警ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成规则ID
   */
  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成渠道ID
   */
  private generateChannelId(): string {
    return `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
