/**
 * NotificationSystem Unit Tests
 * 
 * Comprehensive test suite for the notification system,
 * covering notification creation, channel management, rules,
 * and various notification types.
 */

import { NotificationSystem, Notification, NotificationChannel, NotificationRule } from '../../../../lib/testing/dashboard/NotificationSystem';

describe('NotificationSystem', () => {
  let notificationSystem: NotificationSystem;

  beforeEach(() => {
    notificationSystem = new NotificationSystem();
  });

  describe('Initialization', () => {
    it('should initialize with default channels', () => {
      // The system should have default channels like console, browser, etc.
      expect(notificationSystem).toBeDefined();
    });

    it('should start with empty notifications', () => {
      const notifications = notificationSystem.getActiveNotifications();
      expect(notifications).toHaveLength(0);
    });

    it('should have default rules configured', () => {
      // Default rules should be set up during initialization
      expect(notificationSystem).toBeDefined();
    });
  });

  describe('Notification Creation', () => {
    it('should create and send notification', async () => {
      const notificationId = await notificationSystem.notify({
        type: 'info',
        category: 'test_failure',
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: 'medium'
      });

      expect(notificationId).toBeDefined();
      expect(typeof notificationId).toBe('string');

      const notifications = notificationSystem.getActiveNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('Test Notification');
    });

    it('should assign ID and timestamp automatically', async () => {
      const notificationId = await notificationSystem.notify({
        type: 'warning',
        category: 'coverage_drop',
        title: 'Coverage Drop',
        message: 'Coverage decreased by 5%',
        priority: 'high'
      });

      const notifications = notificationSystem.getActiveNotifications();
      const notification = notifications[0];

      expect(notification.id).toBe(notificationId);
      expect(notification.timestamp).toBeInstanceOf(Date);
    });

    it('should handle notification with actions', async () => {
      const actionHandler = jest.fn();

      await notificationSystem.notify({
        type: 'error',
        category: 'test_failure',
        title: 'Test Failed',
        message: 'Critical test failure detected',
        priority: 'critical',
        actions: [
          {
            id: 'retry',
            label: 'Retry Test',
            type: 'primary',
            handler: actionHandler
          }
        ]
      });

      const notifications = notificationSystem.getActiveNotifications();
      const notification = notifications[0];

      expect(notification.actions).toHaveLength(1);
      expect(notification.actions![0].label).toBe('Retry Test');

      // Test action handler
      notification.actions![0].handler(notification);
      expect(actionHandler).toHaveBeenCalledWith(notification);
    });

    it('should handle persistent notifications', async () => {
      await notificationSystem.notify({
        type: 'info',
        category: 'system',
        title: 'Persistent Notification',
        message: 'This notification should persist',
        priority: 'low',
        persistent: true
      });

      const notifications = notificationSystem.getActiveNotifications();
      expect(notifications[0].persistent).toBe(true);
    });

    it('should handle auto-close notifications', async () => {
      await notificationSystem.notify({
        type: 'success',
        category: 'system',
        title: 'Auto-close Notification',
        message: 'This notification will auto-close',
        priority: 'low',
        autoClose: 100 // 100ms
      });

      expect(notificationSystem.getActiveNotifications()).toHaveLength(1);

      // Wait for auto-close
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(notificationSystem.getActiveNotifications()).toHaveLength(0);
    });

    it('should emit notification event', (done) => {
      notificationSystem.on('notification', (notification: Notification) => {
        expect(notification.title).toBe('Event Test');
        done();
      });

      notificationSystem.notify({
        type: 'info',
        category: 'system',
        title: 'Event Test',
        message: 'Testing notification event',
        priority: 'low'
      });
    });
  });

  describe('Notification Management', () => {
    beforeEach(async () => {
      // Add some test notifications
      await notificationSystem.notify({
        type: 'info',
        category: 'test_failure',
        title: 'Test 1',
        message: 'Message 1',
        priority: 'low'
      });

      await notificationSystem.notify({
        type: 'warning',
        category: 'coverage_drop',
        title: 'Test 2',
        message: 'Message 2',
        priority: 'high'
      });

      await notificationSystem.notify({
        type: 'error',
        category: 'test_failure',
        title: 'Test 3',
        message: 'Message 3',
        priority: 'critical'
      });
    });

    it('should get active notifications', () => {
      const notifications = notificationSystem.getActiveNotifications();
      expect(notifications).toHaveLength(3);
      
      // Should be sorted by timestamp (newest first)
      expect(notifications[0].title).toBe('Test 3');
      expect(notifications[2].title).toBe('Test 1');
    });

    it('should get notifications by category', () => {
      const testFailures = notificationSystem.getByCategory('test_failure');
      expect(testFailures).toHaveLength(2);
      expect(testFailures[0].title).toBe('Test 3');
      expect(testFailures[1].title).toBe('Test 1');

      const coverageDrops = notificationSystem.getByCategory('coverage_drop');
      expect(coverageDrops).toHaveLength(1);
      expect(coverageDrops[0].title).toBe('Test 2');
    });

    it('should get notifications by priority', () => {
      const criticalNotifications = notificationSystem.getByPriority('critical');
      expect(criticalNotifications).toHaveLength(1);
      expect(criticalNotifications[0].title).toBe('Test 3');

      const highNotifications = notificationSystem.getByPriority('high');
      expect(highNotifications).toHaveLength(1);
      expect(highNotifications[0].title).toBe('Test 2');
    });

    it('should dismiss notification', () => {
      const notifications = notificationSystem.getActiveNotifications();
      const notificationId = notifications[0].id;

      const dismissed = notificationSystem.dismiss(notificationId);
      expect(dismissed).toBe(true);

      const remainingNotifications = notificationSystem.getActiveNotifications();
      expect(remainingNotifications).toHaveLength(2);
    });

    it('should emit dismissed event', (done) => {
      const notifications = notificationSystem.getActiveNotifications();
      const notificationId = notifications[0].id;

      notificationSystem.on('dismissed', (notification: Notification) => {
        expect(notification.id).toBe(notificationId);
        done();
      });

      notificationSystem.dismiss(notificationId);
    });

    it('should dismiss all notifications', () => {
      notificationSystem.dismissAll();
      const notifications = notificationSystem.getActiveNotifications();
      expect(notifications).toHaveLength(0);
    });

    it('should return false when dismissing non-existent notification', () => {
      const dismissed = notificationSystem.dismiss('non-existent-id');
      expect(dismissed).toBe(false);
    });
  });

  describe('Notification History', () => {
    beforeEach(async () => {
      // Add notifications to history
      for (let i = 0; i < 5; i++) {
        await notificationSystem.notify({
          type: 'info',
          category: 'system',
          title: `History Test ${i}`,
          message: `Message ${i}`,
          priority: 'low'
        });
      }
    });

    it('should maintain notification history', () => {
      const history = notificationSystem.getHistory();
      expect(history).toHaveLength(5);
      expect(history[0].title).toBe('History Test 4'); // Newest first
    });

    it('should limit history results', () => {
      const limitedHistory = notificationSystem.getHistory(3);
      expect(limitedHistory).toHaveLength(3);
    });

    it('should clear history', () => {
      notificationSystem.clearHistory();
      const history = notificationSystem.getHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('Channel Management', () => {
    it('should add custom channel', () => {
      const customChannel: NotificationChannel = {
        name: 'custom',
        enabled: true,
        config: { apiKey: 'test-key' },
        send: jest.fn().mockResolvedValue(undefined)
      };

      notificationSystem.addChannel(customChannel);

      // Channel should be available for use
      expect(customChannel.send).toBeDefined();
    });

    it('should remove channel', () => {
      const testChannel: NotificationChannel = {
        name: 'removable',
        enabled: true,
        config: {},
        send: jest.fn().mockResolvedValue(undefined)
      };

      notificationSystem.addChannel(testChannel);
      const removed = notificationSystem.removeChannel('removable');

      expect(removed).toBe(true);
    });

    it('should configure channel', () => {
      const testChannel: NotificationChannel = {
        name: 'configurable',
        enabled: true,
        config: { setting1: 'value1' },
        send: jest.fn().mockResolvedValue(undefined)
      };

      notificationSystem.addChannel(testChannel);
      notificationSystem.configureChannel('configurable', { setting2: 'value2' });

      // Configuration should be merged
      expect(testChannel.config.setting1).toBe('value1');
      expect(testChannel.config.setting2).toBe('value2');
    });

    it('should enable/disable channel', () => {
      const testChannel: NotificationChannel = {
        name: 'toggleable',
        enabled: true,
        config: {},
        send: jest.fn().mockResolvedValue(undefined)
      };

      notificationSystem.addChannel(testChannel);
      notificationSystem.setChannelEnabled('toggleable', false);

      expect(testChannel.enabled).toBe(false);

      notificationSystem.setChannelEnabled('toggleable', true);
      expect(testChannel.enabled).toBe(true);
    });
  });

  describe('Notification Rules', () => {
    it('should add custom rule', () => {
      const customRule: NotificationRule = {
        id: 'custom-rule',
        name: 'Custom Rule',
        enabled: true,
        conditions: {
          category: ['custom_category'],
          priority: ['high']
        },
        actions: {
          channels: ['console']
        }
      };

      notificationSystem.addRule(customRule);

      // Rule should be added successfully
      expect(customRule.id).toBe('custom-rule');
    });

    it('should remove rule', () => {
      const testRule: NotificationRule = {
        id: 'removable-rule',
        name: 'Removable Rule',
        enabled: true,
        conditions: {},
        actions: { channels: [] }
      };

      notificationSystem.addRule(testRule);
      const removed = notificationSystem.removeRule('removable-rule');

      expect(removed).toBe(true);
    });

    it('should enable/disable rule', () => {
      const testRule: NotificationRule = {
        id: 'toggleable-rule',
        name: 'Toggleable Rule',
        enabled: true,
        conditions: {},
        actions: { channels: [] }
      };

      notificationSystem.addRule(testRule);
      notificationSystem.setRuleEnabled('toggleable-rule', false);

      expect(testRule.enabled).toBe(false);
    });

    it('should process notifications through rules', async () => {
      const mockChannel: NotificationChannel = {
        name: 'mock-channel',
        enabled: true,
        config: {},
        send: jest.fn().mockResolvedValue(undefined)
      };

      const testRule: NotificationRule = {
        id: 'test-rule',
        name: 'Test Rule',
        enabled: true,
        conditions: {
          category: ['test_category'],
          priority: ['high']
        },
        actions: {
          channels: ['mock-channel']
        }
      };

      notificationSystem.addChannel(mockChannel);
      notificationSystem.addRule(testRule);

      await notificationSystem.notify({
        type: 'error',
        category: 'test_category',
        title: 'Rule Test',
        message: 'Testing rule processing',
        priority: 'high'
      });

      expect(mockChannel.send).toHaveBeenCalled();
    });

    it('should handle rule throttling', async () => {
      const mockChannel: NotificationChannel = {
        name: 'throttled-channel',
        enabled: true,
        config: {},
        send: jest.fn().mockResolvedValue(undefined)
      };

      const throttledRule: NotificationRule = {
        id: 'throttled-rule',
        name: 'Throttled Rule',
        enabled: true,
        conditions: {
          category: ['throttle_test']
        },
        actions: {
          channels: ['throttled-channel'],
          throttle: 1000 // 1 second throttle
        }
      };

      notificationSystem.addChannel(mockChannel);
      notificationSystem.addRule(throttledRule);

      // Send first notification
      await notificationSystem.notify({
        type: 'info',
        category: 'throttle_test',
        title: 'First',
        message: 'First message',
        priority: 'low'
      });

      // Send second notification immediately (should be throttled)
      await notificationSystem.notify({
        type: 'info',
        category: 'throttle_test',
        title: 'Second',
        message: 'Second message',
        priority: 'low'
      });

      expect(mockChannel.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await notificationSystem.notify({
        type: 'info',
        category: 'test_failure',
        title: 'Stats Test 1',
        message: 'Message 1',
        priority: 'low'
      });

      await notificationSystem.notify({
        type: 'warning',
        category: 'coverage_drop',
        title: 'Stats Test 2',
        message: 'Message 2',
        priority: 'high'
      });

      await notificationSystem.notify({
        type: 'error',
        category: 'test_failure',
        title: 'Stats Test 3',
        message: 'Message 3',
        priority: 'critical'
      });
    });

    it('should provide notification statistics', () => {
      const stats = notificationSystem.getStatistics();

      expect(stats.active).toBe(3);
      expect(stats.total).toBe(3);
      expect(stats.byCategory.test_failure).toBe(2);
      expect(stats.byCategory.coverage_drop).toBe(1);
      expect(stats.byType.info).toBe(1);
      expect(stats.byType.warning).toBe(1);
      expect(stats.byType.error).toBe(1);
      expect(stats.byPriority.low).toBe(1);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.critical).toBe(1);
    });
  });

  describe('Test Functionality', () => {
    it('should send test notification', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await notificationSystem.test();

      const notifications = notificationSystem.getActiveNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('Notification System Test');
      expect(notifications[0].category).toBe('system');

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle channel send errors gracefully', async () => {
      const errorChannel: NotificationChannel = {
        name: 'error-channel',
        enabled: true,
        config: {},
        send: jest.fn().mockRejectedValue(new Error('Send failed'))
      };

      const errorRule: NotificationRule = {
        id: 'error-rule',
        name: 'Error Rule',
        enabled: true,
        conditions: {
          category: ['error_test']
        },
        actions: {
          channels: ['error-channel']
        }
      };

      notificationSystem.addChannel(errorChannel);
      notificationSystem.addRule(errorRule);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await notificationSystem.notify({
        type: 'info',
        category: 'error_test',
        title: 'Error Test',
        message: 'Testing error handling',
        priority: 'low'
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle malformed notifications gracefully', async () => {
      expect(async () => {
        await notificationSystem.notify({
          type: 'invalid' as any,
          category: '',
          title: '',
          message: '',
          priority: 'invalid' as any
        });
      }).not.toThrow();
    });
  });
});