/**
 * 性能告警和通知系统
 */
import { logger } from '@/lib/logging/logger';
import { WebVitalsMetric } from './web-vitals';
import { CustomMetric } from './custom-metrics';

/**
 * 告警级别
 */
export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';

/**
 * 告警规则
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  level: AlertLevel;
  conditions: AlertCondition[];
  actions: AlertAction[];
  cooldown?: number; // 冷却时间（毫秒）
  tags?: Record<string, string>;
}

/**
 * 告警条件
 */
export interface AlertCondition {
  type: 'web-vitals' | 'custom-metric' | 'system' | 'composite';
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  threshold: number;
  duration?: number; // 持续时间（毫秒）
  aggregation?: 'avg' | 'max' | 'min' | 'sum' | 'count';
}

/**
 * 告警动作
 */
export interface AlertAction {
  type: 'log' | 'email' | 'webhook' | 'console' | 'storage';
  config: Record<string, any>;
}

/**
 * 告警事件
 */
export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  level: AlertLevel;
  message: string;
  timestamp: number;
  data: {
    metric: string;
    value: number;
    threshold: number;
    conditions: AlertCondition[];
  };
  resolved?: boolean;
  resolvedAt?: number;
}

/**
 * 指标数据点
 */
interface MetricDataPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

/**
 * 性能告警管理器
 */
export class PerformanceAlertManager {
  private rules: Map<string, AlertRule> = new Map();
  private events: AlertEvent[] = [];
  private metricHistory: Map<string, MetricDataPoint[]> = new Map();
  private cooldowns: Map<string, number> = new Map();
  private isEnabled = true;

  constructor() {
    this.setupDefaultRules();
  }

  /**
   * 设置默认告警规则
   */
  private setupDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'lcp-critical',
        name: 'LCP Critical',
        description: 'Largest Contentful Paint exceeds 4 seconds',
        enabled: true,
        level: 'critical',
        conditions: [{
          type: 'web-vitals',
          metric: 'LCP',
          operator: 'gt',
          threshold: 4000,
          duration: 60000 // 1分钟
        }],
        actions: [
          { type: 'log', config: { level: 'error' } },
          { type: 'console', config: {} }
        ],
        cooldown: 300000 // 5分钟
      },
      {
        id: 'cls-warning',
        name: 'CLS Warning',
        description: 'Cumulative Layout Shift exceeds 0.1',
        enabled: true,
        level: 'warning',
        conditions: [{
          type: 'web-vitals',
          metric: 'CLS',
          operator: 'gt',
          threshold: 0.1,
          duration: 30000 // 30秒
        }],
        actions: [
          { type: 'log', config: { level: 'warn' } }
        ],
        cooldown: 180000 // 3分钟
      },
      {
        id: 'fid-error',
        name: 'FID Error',
        description: 'First Input Delay exceeds 300ms',
        enabled: true,
        level: 'error',
        conditions: [{
          type: 'web-vitals',
          metric: 'FID',
          operator: 'gt',
          threshold: 300,
          duration: 60000 // 1分钟
        }],
        actions: [
          { type: 'log', config: { level: 'error' } },
          { type: 'console', config: {} }
        ],
        cooldown: 240000 // 4分钟
      },
      {
        id: 'memory-critical',
        name: 'Memory Critical',
        description: 'Memory usage exceeds 90%',
        enabled: true,
        level: 'critical',
        conditions: [{
          type: 'custom-metric',
          metric: 'memory.usage_percentage',
          operator: 'gt',
          threshold: 90,
          duration: 120000 // 2分钟
        }],
        actions: [
          { type: 'log', config: { level: 'error' } },
          { type: 'console', config: {} }
        ],
        cooldown: 600000 // 10分钟
      },
      {
        id: 'error-rate-high',
        name: 'High Error Rate',
        description: 'Error rate exceeds 5%',
        enabled: true,
        level: 'error',
        conditions: [{
          type: 'custom-metric',
          metric: 'error.rate',
          operator: 'gt',
          threshold: 5,
          duration: 300000, // 5分钟
          aggregation: 'avg'
        }],
        actions: [
          { type: 'log', config: { level: 'error' } }
        ],
        cooldown: 300000 // 5分钟
      }
    ];

    defaultRules.forEach(rule => this.addRule(rule));
  }

  /**
   * 添加告警规则
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    logger.debug('Alert rule added', { ruleId: rule.id, ruleName: rule.name });
  }

  /**
   * 移除告警规则
   */
  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      logger.debug('Alert rule removed', { ruleId });
    }
    return removed;
  }

  /**
   * 更新告警规则
   */
  updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return false;
    }

    const updatedRule = { ...rule, ...updates };
    this.rules.set(ruleId, updatedRule);
    logger.debug('Alert rule updated', { ruleId, updates });
    return true;
  }

  /**
   * 启用/禁用告警规则
   */
  toggleRule(ruleId: string, enabled: boolean): boolean {
    return this.updateRule(ruleId, { enabled });
  }

  /**
   * 处理Web Vitals指标
   */
  processWebVitalsMetric(metric: WebVitalsMetric): void {
    if (!this.isEnabled) return;

    this.addMetricDataPoint(`web-vitals.${metric.name}`, {
      timestamp: Date.now(),
      value: metric.value,
      metadata: {
        rating: metric.rating,
        navigationType: metric.navigationType,
        id: metric.id
      }
    });

    this.checkRules('web-vitals', metric.name, metric.value);
  }

  /**
   * 处理自定义指标
   */
  processCustomMetric(metric: CustomMetric): void {
    if (!this.isEnabled) return;

    this.addMetricDataPoint(`custom.${metric.name}`, {
      timestamp: metric.timestamp,
      value: metric.value,
      metadata: {
        unit: metric.unit,
        category: metric.category,
        tags: metric.tags
      }
    });

    this.checkRules('custom-metric', metric.name, metric.value);
  }

  /**
   * 添加指标数据点
   */
  private addMetricDataPoint(metricKey: string, dataPoint: MetricDataPoint): void {
    if (!this.metricHistory.has(metricKey)) {
      this.metricHistory.set(metricKey, []);
    }

    const history = this.metricHistory.get(metricKey)!;
    history.push(dataPoint);

    // 保持最近1小时的数据
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const filteredHistory = history.filter(point => point.timestamp > oneHourAgo);
    this.metricHistory.set(metricKey, filteredHistory);
  }

  /**
   * 检查告警规则
   */
  private checkRules(conditionType: string, metricName: string, currentValue: number): void {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // 检查冷却时间
      const lastAlert = this.cooldowns.get(rule.id);
      if (lastAlert && Date.now() - lastAlert < (rule.cooldown || 0)) {
        continue;
      }

      // 检查条件
      const matchingConditions = rule.conditions.filter(condition => 
        condition.type === conditionType && condition.metric === metricName
      );

      for (const condition of matchingConditions) {
        if (this.evaluateCondition(condition, metricName, currentValue)) {
          this.triggerAlert(rule, condition, metricName, currentValue);
          this.cooldowns.set(rule.id, Date.now());
          break; // 每个规则只触发一次
        }
      }
    }
  }

  /**
   * 评估告警条件
   */
  private evaluateCondition(condition: AlertCondition, metricName: string, currentValue: number): boolean {
    const metricKey = condition.type === 'web-vitals' ? `web-vitals.${metricName}` : `custom.${metricName}`;
    const history = this.metricHistory.get(metricKey) || [];

    // 如果有持续时间要求，检查历史数据
    if (condition.duration) {
      const durationAgo = Date.now() - condition.duration;
      const recentHistory = history.filter(point => point.timestamp > durationAgo);
      
      if (recentHistory.length === 0) {
        return false;
      }

      // 应用聚合函数
      let aggregatedValue: number;
      const values = recentHistory.map(point => point.value);

      switch (condition.aggregation || 'avg') {
        case 'avg':
          aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'max':
          aggregatedValue = Math.max(...values);
          break;
        case 'min':
          aggregatedValue = Math.min(...values);
          break;
        case 'sum':
          aggregatedValue = values.reduce((a, b) => a + b, 0);
          break;
        case 'count':
          aggregatedValue = values.length;
          break;
        default:
          aggregatedValue = currentValue;
      }

      return this.compareValues(aggregatedValue, condition.operator, condition.threshold);
    }

    // 直接比较当前值
    return this.compareValues(currentValue, condition.operator, condition.threshold);
  }

  /**
   * 比较值
   */
  private compareValues(value: number, operator: AlertCondition['operator'], threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      case 'neq': return value !== threshold;
      default: return false;
    }
  }

  /**
   * 触发告警
   */
  private triggerAlert(rule: AlertRule, condition: AlertCondition, metricName: string, value: number): void {
    const alertEvent: AlertEvent = {
      id: this.generateId(),
      ruleId: rule.id,
      ruleName: rule.name,
      level: rule.level,
      message: `${rule.description} - ${metricName}: ${value} ${this.getOperatorText(condition.operator)} ${condition.threshold}`,
      timestamp: Date.now(),
      data: {
        metric: metricName,
        value,
        threshold: condition.threshold,
        conditions: [condition]
      }
    };

    this.events.push(alertEvent);

    // 执行告警动作
    rule.actions.forEach(action => {
      this.executeAction(action, alertEvent);
    });

    logger.info('Performance alert triggered', {
      ruleId: rule.id,
      ruleName: rule.name,
      level: rule.level,
      metric: metricName,
      value,
      threshold: condition.threshold
    });
  }

  /**
   * 执行告警动作
   */
  private executeAction(action: AlertAction, event: AlertEvent): void {
    try {
      switch (action.type) {
        case 'log':
          this.executeLogAction(action, event);
          break;
        case 'console':
          this.executeConsoleAction(action, event);
          break;
        case 'email':
          this.executeEmailAction(action, event);
          break;
        case 'webhook':
          this.executeWebhookAction(action, event);
          break;
        case 'storage':
          this.executeStorageAction(action, event);
          break;
        default:
          logger.warn('Unknown alert action type', { type: action.type });
      }
    } catch (error) {
      logger.error('Failed to execute alert action', error instanceof Error ? error : new Error(String(error)), {
        actionType: action.type,
        eventId: event.id
      });
    }
  }

  /**
   * 执行日志动作
   */
  private executeLogAction(action: AlertAction, event: AlertEvent): void {
    const level = action.config.level || 'info';
    const message = `Performance Alert: ${event.message}`;
    
    switch (level) {
      case 'error':
        logger.error(message, { event });
        break;
      case 'warn':
        logger.warn(message, { event });
        break;
      case 'info':
        logger.info(message, { event });
        break;
      case 'debug':
        logger.debug(message, { event });
        break;
    }
  }

  /**
   * 执行控制台动作
   */
  private executeConsoleAction(action: AlertAction, event: AlertEvent): void {
    if (typeof console === 'undefined') return;

    const message = `🚨 Performance Alert [${event.level.toUpperCase()}]: ${event.message}`;
    
    switch (event.level) {
      case 'critical':
      case 'error':
        console.error(message, event);
        break;
      case 'warning':
        console.warn(message, event);
        break;
      case 'info':
        console.info(message, event);
        break;
    }
  }

  /**
   * 执行邮件动作
   */
  private async executeEmailAction(action: AlertAction, event: AlertEvent): Promise<void> {
    const { to, subject, template } = action.config;
    
    if (!to) {
      logger.warn('Email action missing recipient', { eventId: event.id });
      return;
    }

    // 这里应该集成实际的邮件服务
    logger.info('Email alert would be sent', {
      to,
      subject: subject || `Performance Alert: ${event.ruleName}`,
      event
    });
  }

  /**
   * 执行Webhook动作
   */
  private async executeWebhookAction(action: AlertAction, event: AlertEvent): Promise<void> {
    const { url, method = 'POST', headers = {} } = action.config;
    
    if (!url) {
      logger.warn('Webhook action missing URL', { eventId: event.id });
      return;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      logger.debug('Webhook alert sent successfully', { url, eventId: event.id });
    } catch (error) {
      logger.error('Failed to send webhook alert', error instanceof Error ? error : new Error(String(error)), {
        url,
        eventId: event.id
      });
    }
  }

  /**
   * 执行存储动作
   */
  private executeStorageAction(action: AlertAction, event: AlertEvent): void {
    const { key = 'performance_alerts' } = action.config;
    
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const existingAlerts = JSON.parse(localStorage.getItem(key) || '[]');
      existingAlerts.push(event);
      
      // 保持最近100个告警
      const recentAlerts = existingAlerts.slice(-100);
      localStorage.setItem(key, JSON.stringify(recentAlerts));
    } catch (error) {
      logger.warn('Failed to store alert in localStorage', { error, eventId: event.id });
    }
  }

  /**
   * 获取操作符文本
   */
  private getOperatorText(operator: AlertCondition['operator']): string {
    const operatorMap = {
      'gt': '>',
      'gte': '>=',
      'lt': '<',
      'lte': '<=',
      'eq': '=',
      'neq': '!='
    };
    return operatorMap[operator] || operator;
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取所有规则
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 获取告警事件
   */
  getEvents(limit?: number): AlertEvent[] {
    const events = [...this.events].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? events.slice(0, limit) : events;
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): AlertEvent[] {
    return this.events.filter(event => !event.resolved);
  }

  /**
   * 解决告警
   */
  resolveAlert(eventId: string): boolean {
    const event = this.events.find(e => e.id === eventId);
    if (event && !event.resolved) {
      event.resolved = true;
      event.resolvedAt = Date.now();
      logger.info('Alert resolved', { eventId, ruleName: event.ruleName });
      return true;
    }
    return false;
  }

  /**
   * 清除历史事件
   */
  clearEvents(olderThan?: number): number {
    const threshold = olderThan || (Date.now() - 24 * 60 * 60 * 1000); // 默认24小时
    const initialCount = this.events.length;
    this.events = this.events.filter(event => event.timestamp > threshold);
    const clearedCount = initialCount - this.events.length;
    
    if (clearedCount > 0) {
      logger.info('Alert events cleared', { clearedCount });
    }
    
    return clearedCount;
  }

  /**
   * 启用/禁用告警系统
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    logger.info(`Performance alert system ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * 获取系统状态
   */
  getStatus(): {
    enabled: boolean;
    rulesCount: number;
    activeAlertsCount: number;
    totalEventsCount: number;
    metricsCount: number;
  } {
    return {
      enabled: this.isEnabled,
      rulesCount: this.rules.size,
      activeAlertsCount: this.getActiveAlerts().length,
      totalEventsCount: this.events.length,
      metricsCount: this.metricHistory.size
    };
  }
}

/**
 * 全局性能告警管理器实例
 */
export const globalPerformanceAlertManager = new PerformanceAlertManager();

export default PerformanceAlertManager;