/**
 * Real-Time Notification System
 *
 * Handles instant notifications for test failures, coverage drops,
 * performance issues, and team collaboration events.
 */

import { EventEmitter } from 'events';

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  category: 'test_failure' | 'coverage_drop' | 'performance_issue' | 'team_event' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: any;
  actions?: NotificationAction[];
  persistent?: boolean;
  autoClose?: number; // milliseconds
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  handler: (notification: Notification) => void | Promise<void>;
}

export interface NotificationChannel {
  name: string;
  enabled: boolean;
  config: any;
  send: (notification: Notification) => Promise<void>;
}

export interface NotificationRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    category?: string[];
    priority?: string[];
    keywords?: string[];
    customFilter?: (notification: Notification) => boolean;
  };
  actions: {
    channels: string[];
    transform?: (notification: Notification) => Notification;
    delay?: number;
    throttle?: number;
  };
}

export class NotificationSystem extends EventEmitter {
  private notifications: Map<string, Notification> = new Map();
  private channels: Map<string, NotificationChannel> = new Map();
  private rules: Map<string, NotificationRule> = new Map();
  private throttleMap: Map<string, number> = new Map();
  private notificationHistory: Notification[] = [];
  private maxHistorySize: number = 1000;

  constructor() {
    super();
    this.initializeDefaultChannels();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default notification channels
   */
  private initializeDefaultChannels(): void {
    // Console channel
    this.addChannel({
      name: 'console',
      enabled: true,
      config: {},
      send: async (notification: Notification) => {
        const prefix = `[${notification.type.toUpperCase()}]`;
        const timestamp = notification.timestamp.toISOString();
        console.log(`${prefix} ${timestamp} - ${notification.title}: ${notification.message}`);
      },
    });

    // Browser notification channel
    this.addChannel({
      name: 'browser',
      enabled: typeof window !== 'undefined' && 'Notification' in window,
      config: {},
      send: async (notification: Notification) => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: this.getNotificationIcon(notification.type),
              tag: notification.id,
            });
          } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              new Notification(notification.title, {
                body: notification.message,
                icon: this.getNotificationIcon(notification.type),
                tag: notification.id,
              });
            }
          }
        }
      },
    });

    // Webhook channel
    this.addChannel({
      name: 'webhook',
      enabled: false,
      config: { url: '', headers: {} },
      send: async (notification: Notification) => {
        const config = this.channels.get('webhook')?.config;
        if (!config?.url) return;

        try {
          // In a real implementation, use fetch or axios
          console.log(`Webhook notification to ${config.url}:`, notification);
        } catch (error) {
          console.error('Failed to send webhook notification:', error);
        }
      },
    });

    // Email channel
    this.addChannel({
      name: 'email',
      enabled: false,
      config: { recipients: [], smtp: {} },
      send: async (notification: Notification) => {
        const config = this.channels.get('email')?.config;
        if (!config?.recipients?.length) return;

        console.log(`Email notification to ${config.recipients.join(', ')}:`, notification);
      },
    });

    // Slack channel
    this.addChannel({
      name: 'slack',
      enabled: false,
      config: { webhookUrl: '', channel: '' },
      send: async (notification: Notification) => {
        const config = this.channels.get('slack')?.config;
        if (!config?.webhookUrl) return;

        const slackMessage = {
          channel: config.channel,
          text: `${notification.title}: ${notification.message}`,
          attachments: [{
            color: this.getSlackColor(notification.type),
            fields: [
              { title: 'Category', value: notification.category, short: true },
              { title: 'Priority', value: notification.priority, short: true },
              { title: 'Time', value: notification.timestamp.toISOString(), short: true },
            ],
          }],
        };

        console.log('Slack notification:', slackMessage);
      },
    });
  }

  /**
   * Initialize default notification rules
   */
  private initializeDefaultRules(): void {
    // Critical failures rule
    this.addRule({
      id: 'critical-failures',
      name: 'Critical Test Failures',
      enabled: true,
      conditions: {
        category: ['test_failure'],
        priority: ['critical', 'high'],
      },
      actions: {
        channels: ['console', 'browser', 'webhook'],
        delay: 0,
      },
    });

    // Coverage drops rule
    this.addRule({
      id: 'coverage-drops',
      name: 'Coverage Drops',
      enabled: true,
      conditions: {
        category: ['coverage_drop'],
        priority: ['medium', 'high'],
      },
      actions: {
        channels: ['console', 'email'],
        throttle: 300000, // 5 minutes
      },
    });

    // Performance issues rule
    this.addRule({
      id: 'performance-issues',
      name: 'Performance Issues',
      enabled: true,
      conditions: {
        category: ['performance_issue'],
      },
      actions: {
        channels: ['console'],
        throttle: 600000, // 10 minutes
      },
    });

    // Team events rule
    this.addRule({
      id: 'team-events',
      name: 'Team Collaboration Events',
      enabled: true,
      conditions: {
        category: ['team_event'],
        priority: ['medium', 'high'],
      },
      actions: {
        channels: ['console', 'slack'],
      },
    });
  }

  /**
   * Send notification
   */
  public async notify(notification: Omit<Notification, 'id' | 'timestamp'>): Promise<string> {
    const fullNotification: Notification = {
      id: this.generateId(),
      timestamp: new Date(),
      ...notification,
    };

    // Store notification
    this.notifications.set(fullNotification.id, fullNotification);
    this.notificationHistory.push(fullNotification);

    // Trim history if needed
    if (this.notificationHistory.length > this.maxHistorySize) {
      this.notificationHistory = this.notificationHistory.slice(-this.maxHistorySize);
    }

    // Process notification through rules
    await this.processNotification(fullNotification);

    // Emit event
    this.emit('notification', fullNotification);

    // Auto-close if specified
    if (fullNotification.autoClose) {
      setTimeout(() => {
        this.dismiss(fullNotification.id);
      }, fullNotification.autoClose);
    }

    return fullNotification.id;
  }

  /**
   * Process notification through rules
   */
  private async processNotification(notification: Notification): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      if (this.matchesRule(notification, rule)) {
        await this.executeRule(notification, rule);
      }
    }
  }

  /**
   * Check if notification matches rule conditions
   */
  private matchesRule(notification: Notification, rule: NotificationRule): boolean {
    const { conditions } = rule;

    // Check category
    if (conditions.category && !conditions.category.includes(notification.category)) {
      return false;
    }

    // Check priority
    if (conditions.priority && !conditions.priority.includes(notification.priority)) {
      return false;
    }

    // Check keywords
    if (conditions.keywords) {
      const text = `${notification.title} ${notification.message}`.toLowerCase();
      const hasKeyword = conditions.keywords.some(keyword =>
        text.includes(keyword.toLowerCase()),
      );
      if (!hasKeyword) return false;
    }

    // Check custom filter
    if (conditions.customFilter && !conditions.customFilter(notification)) {
      return false;
    }

    return true;
  }

  /**
   * Execute rule actions
   */
  private async executeRule(notification: Notification, rule: NotificationRule): Promise<void> {
    const { actions } = rule;

    // Check throttling
    if (actions.throttle) {
      const throttleKey = `${rule.id}-${notification.category}`;
      const lastSent = this.throttleMap.get(throttleKey) || 0;
      const now = Date.now();

      if (now - lastSent < actions.throttle) {
        return; // Skip due to throttling
      }

      this.throttleMap.set(throttleKey, now);
    }

    // Transform notification if needed
    let processedNotification = notification;
    if (actions.transform) {
      processedNotification = actions.transform(notification);
    }

    // Apply delay if specified
    if (actions.delay) {
      await new Promise(resolve => setTimeout(resolve, actions.delay));
    }

    // Send to channels
    const sendPromises = actions.channels.map(async (channelName) => {
      const channel = this.channels.get(channelName);
      if (channel && channel.enabled) {
        try {
          await channel.send(processedNotification);
        } catch (error) {
          console.error(`Failed to send notification to ${channelName}:`, error);
        }
      }
    });

    await Promise.allSettled(sendPromises);
  }

  /**
   * Add notification channel
   */
  public addChannel(channel: NotificationChannel): void {
    this.channels.set(channel.name, channel);
  }

  /**
   * Remove notification channel
   */
  public removeChannel(name: string): boolean {
    return this.channels.delete(name);
  }

  /**
   * Configure channel
   */
  public configureChannel(name: string, config: any): void {
    const channel = this.channels.get(name);
    if (channel) {
      channel.config = { ...channel.config, ...config };
    }
  }

  /**
   * Enable/disable channel
   */
  public setChannelEnabled(name: string, enabled: boolean): void {
    const channel = this.channels.get(name);
    if (channel) {
      channel.enabled = enabled;
    }
  }

  /**
   * Add notification rule
   */
  public addRule(rule: NotificationRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove notification rule
   */
  public removeRule(id: string): boolean {
    return this.rules.delete(id);
  }

  /**
   * Enable/disable rule
   */
  public setRuleEnabled(id: string, enabled: boolean): void {
    const rule = this.rules.get(id);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Dismiss notification
   */
  public dismiss(id: string): boolean {
    const notification = this.notifications.get(id);
    if (notification) {
      this.notifications.delete(id);
      this.emit('dismissed', notification);
      return true;
    }
    return false;
  }

  /**
   * Dismiss all notifications
   */
  public dismissAll(): void {
    const notifications = Array.from(this.notifications.values());
    this.notifications.clear();
    notifications.forEach(notification => {
      this.emit('dismissed', notification);
    });
  }

  /**
   * Get active notifications
   */
  public getActiveNotifications(): Notification[] {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get notification history
   */
  public getHistory(limit?: number): Notification[] {
    const history = [...this.notificationHistory]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get notifications by category
   */
  public getByCategory(category: string): Notification[] {
    return Array.from(this.notifications.values())
      .filter(n => n.category === category)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get notifications by priority
   */
  public getByPriority(priority: string): Notification[] {
    return Array.from(this.notifications.values())
      .filter(n => n.priority === priority)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clear history
   */
  public clearHistory(): void {
    this.notificationHistory = [];
  }

  /**
   * Get statistics
   */
  public getStatistics(): {
    active: number;
    total: number;
    byCategory: { [category: string]: number };
    byPriority: { [priority: string]: number };
    byType: { [type: string]: number };
  } {
    const active = Array.from(this.notifications.values());
    const total = this.notificationHistory;

    return {
      active: active.length,
      total: total.length,
      byCategory: this.groupBy(total, 'category'),
      byPriority: this.groupBy(total, 'priority'),
      byType: this.groupBy(total, 'type'),
    };
  }

  /**
   * Test notification system
   */
  public async test(): Promise<void> {
    await this.notify({
      type: 'info',
      category: 'system',
      title: 'Notification System Test',
      message: 'This is a test notification to verify the system is working correctly.',
      priority: 'low',
      autoClose: 5000,
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get notification icon for browser notifications
   */
  private getNotificationIcon(type: string): string {
    const icons = {
      success: '/icons/success.png',
      warning: '/icons/warning.png',
      error: '/icons/error.png',
      info: '/icons/info.png',
    };
    return icons[type as keyof typeof icons] || icons.info;
  }

  /**
   * Get Slack color for notification type
   */
  private getSlackColor(type: string): string {
    const colors = {
      success: 'good',
      warning: 'warning',
      error: 'danger',
      info: '#36a64f',
    };
    return colors[type as keyof typeof colors] || colors.info;
  }

  /**
   * Group array by property
   */
  private groupBy<T>(array: T[], property: keyof T): { [key: string]: number } {
    return array.reduce((groups, item) => {
      const key = String(item[property]);
      groups[key] = (groups[key] || 0) + 1;
      return groups;
    }, {} as { [key: string]: number });
  }
}
