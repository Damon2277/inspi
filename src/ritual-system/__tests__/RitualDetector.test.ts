/**
 * 仪式感检测器测试
 */

import { RitualDetector, RitualDetectionResult } from '../core/RitualDetector';
import { RitualType, RitualIntensity, UserAction, User } from '../types';

describe('RitualDetector', () => {
  let detector: RitualDetector;
  let mockUser: User;

  beforeEach(() => {
    detector = new RitualDetector();
    
    mockUser = {
      id: 'test-user-1',
      level: 3,
      joinDate: new Date('2024-01-01'),
      lastActiveDate: new Date(),
      preferences: {
        ritualIntensity: RitualIntensity.MODERATE,
        enabledRitualTypes: [RitualType.WELCOME, RitualType.ACHIEVEMENT, RitualType.CREATION],
        soundEnabled: true,
        animationEnabled: true,
        reducedMotion: false
      },
      context: {
        userId: 'test-user-1',
        sessionDuration: 5 * 60 * 1000,
        previousActions: [],
        userLevel: 3,
        preferences: {
          ritualIntensity: RitualIntensity.MODERATE,
          enabledRitualTypes: [RitualType.WELCOME, RitualType.ACHIEVEMENT, RitualType.CREATION],
          soundEnabled: true,
          animationEnabled: true,
          reducedMotion: false
        },
        deviceCapabilities: {
          supportsAnimation: true,
          supportsAudio: true,
          supportsHaptics: false,
          performanceLevel: 'medium',
          screenSize: 'medium'
        },
        culturalContext: {
          region: 'CN',
          language: 'zh-CN',
          colorPreferences: ['#FFD700', '#1E3A8A'],
          symbolPreferences: ['star', 'circle']
        }
      }
    };
  });

  describe('detectRitualMoment', () => {
    it('should detect and return ritual for valid action', async () => {
      const loginAction: UserAction = {
        type: 'user_login',
        timestamp: Date.now(),
        userId: 'test-user-1',
        context: {}
      };

      const result = await detector.detectRitualMoment(mockUser, loginAction);
      
      expect(result.shouldTrigger).toBe(true);
      expect(result.ritualType).toBe(RitualType.WELCOME);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.intensity).toBeDefined();
    });

    it('should return no trigger for invalid action', async () => {
      const invalidAction: UserAction = {
        type: 'invalid_action',
        timestamp: Date.now(),
        userId: 'test-user-1',
        context: {}
      };

      const result = await detector.detectRitualMoment(mockUser, invalidAction);
      
      expect(result.shouldTrigger).toBe(false);
      expect(result.ritualType).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should adjust confidence based on user level', async () => {
      const taskAction: UserAction = {
        type: 'task_completed',
        timestamp: Date.now(),
        userId: 'test-user-1',
        context: {}
      };

      // Test with low level user
      mockUser.level = 1;
      mockUser.context.userLevel = 1;
      const lowLevelResult = await detector.detectRitualMoment(mockUser, taskAction);

      // Test with high level user
      mockUser.level = 10;
      mockUser.context.userLevel = 10;
      const highLevelResult = await detector.detectRitualMoment(mockUser, taskAction);

      expect(lowLevelResult.confidence).toBeGreaterThan(highLevelResult.confidence);
    });

    it('should include metadata in result', async () => {
      const taskAction: UserAction = {
        type: 'task_completed',
        timestamp: Date.now(),
        userId: 'test-user-1',
        context: {}
      };

      const result = await detector.detectRitualMoment(mockUser, taskAction);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.sessionDuration).toBe(mockUser.context.sessionDuration);
      expect(result.metadata?.originalIntensity).toBeDefined();
      expect(result.metadata?.adjustedIntensity).toBeDefined();
    });
  });

  describe('behavior pattern analysis', () => {
    it('should track user behavior history', async () => {
      const actions = [
        {
          type: 'task_completed',
          timestamp: Date.now() - 1000,
          userId: 'test-user-1',
          context: {}
        },
        {
          type: 'task_completed',
          timestamp: Date.now(),
          userId: 'test-user-1',
          context: {}
        }
      ];

      // Process multiple actions
      for (const action of actions) {
        await detector.detectRitualMoment(mockUser, action);
      }

      const stats = detector.getUserBehaviorStats('test-user-1');
      expect(stats.totalActions).toBe(2);
      expect(stats.uniqueActionTypes).toBe(1);
    });

    it('should calculate behavior statistics correctly', async () => {
      const actions = [
        { type: 'task_completed', timestamp: Date.now() - 3000, userId: 'test-user-1', context: {} },
        { type: 'project_created', timestamp: Date.now() - 2000, userId: 'test-user-1', context: {} },
        { type: 'task_completed', timestamp: Date.now() - 1000, userId: 'test-user-1', context: {} },
        { type: 'content_shared', timestamp: Date.now(), userId: 'test-user-1', context: {} }
      ];

      for (const action of actions) {
        await detector.detectRitualMoment(mockUser, action);
      }

      const stats = detector.getUserBehaviorStats('test-user-1');
      expect(stats.totalActions).toBe(4);
      expect(stats.uniqueActionTypes).toBe(3);
      expect(stats.mostFrequentAction).toBe('task_completed');
    });
  });

  describe('special context detection', () => {
    it('should detect user anniversary', async () => {
      // Set join date to exactly one year ago
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      mockUser.joinDate = oneYearAgo;

      const loginAction: UserAction = {
        type: 'user_login',
        timestamp: Date.now(),
        userId: 'test-user-1',
        context: {}
      };

      const result = await detector.detectRitualMoment(mockUser, loginAction);
      
      expect(result.metadata?.specialContext).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect milestone days', async () => {
      // Set join date to exactly 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      mockUser.joinDate = thirtyDaysAgo;

      const loginAction: UserAction = {
        type: 'user_login',
        timestamp: Date.now(),
        userId: 'test-user-1',
        context: {}
      };

      const result = await detector.detectRitualMoment(mockUser, loginAction);
      
      expect(result.metadata?.specialContext).toBe(true);
    });
  });

  describe('intensity adjustment', () => {
    it('should reduce intensity for frequent actions', async () => {
      // Simulate many task completions to increase frequency
      const taskAction: UserAction = {
        type: 'task_completed',
        timestamp: Date.now(),
        userId: 'test-user-1',
        context: {}
      };

      // Process many actions to build up frequency
      for (let i = 0; i < 15; i++) {
        await detector.detectRitualMoment(mockUser, {
          ...taskAction,
          timestamp: Date.now() - (i * 1000)
        });
      }

      const result = await detector.detectRitualMoment(mockUser, taskAction);
      
      expect(result.metadata?.actionFrequency).toBeGreaterThan(10);
      expect(result.intensity).toBeLessThanOrEqual(RitualIntensity.MODERATE);
    });

    it('should increase intensity for early session actions', async () => {
      // Set very short session duration
      mockUser.context.sessionDuration = 30 * 1000; // 30 seconds

      const taskAction: UserAction = {
        type: 'task_completed',
        timestamp: Date.now(),
        userId: 'test-user-1',
        context: {}
      };

      const result = await detector.detectRitualMoment(mockUser, taskAction);
      
      expect(result.intensity).toBeGreaterThanOrEqual(RitualIntensity.MODERATE);
    });
  });

  describe('confidence calculation', () => {
    it('should have higher confidence for new users', async () => {
      const taskAction: UserAction = {
        type: 'task_completed',
        timestamp: Date.now(),
        userId: 'test-user-1',
        context: {}
      };

      // Test with new user
      mockUser.level = 1;
      mockUser.context.userLevel = 1;
      const newUserResult = await detector.detectRitualMoment(mockUser, taskAction);

      // Test with experienced user
      mockUser.level = 20;
      mockUser.context.userLevel = 20;
      const experiencedUserResult = await detector.detectRitualMoment(mockUser, taskAction);

      expect(newUserResult.confidence).toBeGreaterThan(experiencedUserResult.confidence);
    });

    it('should adjust confidence based on device capabilities', async () => {
      const taskAction: UserAction = {
        type: 'task_completed',
        timestamp: Date.now(),
        userId: 'test-user-1',
        context: {}
      };

      // Test with high performance device
      mockUser.context.deviceCapabilities.performanceLevel = 'high';
      const highPerfResult = await detector.detectRitualMoment(mockUser, taskAction);

      // Test with low performance device
      mockUser.context.deviceCapabilities.performanceLevel = 'low';
      const lowPerfResult = await detector.detectRitualMoment(mockUser, taskAction);

      expect(highPerfResult.confidence).toBeGreaterThan(lowPerfResult.confidence);
    });
  });
});