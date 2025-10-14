/**
 * 仪式感触发器测试
 */

import { RitualTrigger } from '../core/RitualTrigger';
import { RitualType, RitualIntensity, UserAction, UserContext, User } from '../types';

describe('RitualTrigger', () => {
  let ritualTrigger: RitualTrigger;
  let mockUser: User;
  let mockContext: UserContext;

  beforeEach(() => {
    ritualTrigger = new RitualTrigger();
    
    mockContext = {
      userId: 'test-user-1',
      sessionDuration: 5 * 60 * 1000, // 5分钟
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
    };

    mockUser = {
      id: 'test-user-1',
      level: 3,
      joinDate: new Date('2024-01-01'),
      lastActiveDate: new Date(),
      preferences: mockContext.preferences,
      context: mockContext
    };
  });

  describe('detectRitualMoment', () => {
    it('should detect welcome ritual for login action', () => {
      const loginAction: UserAction = {
        type: 'user_login',
        timestamp: Date.now(),
        userId: 'test-user-1',
        context: {}
      };

      const result = ritualTrigger.detectRitualMoment(loginAction);
      expect(result).toBe(RitualType.WELCOME);
    });

    it('should detect achievement ritual for task completion', () => {
      const taskAction: UserAction = {
        type: 'task_completed',
        timestamp: Date.now(),
        userId: 'test-user-1',
        context: { taskId: 'task-123' }
      };

      const result = ritualTrigger.detectRitualMoment(taskAction);
      expect(result).toBe(RitualType.ACHIEVEMENT);
    });

    it('should return null for unknown action types', () => {
      const unknownAction: UserAction = {
        type: 'unknown_action',
        timestamp: Date.now(),
        userId: 'test-user-1',
        context: {}
      };

      const result = ritualTrigger.detectRitualMoment(unknownAction);
      expect(result).toBeNull();
    });
  });

  describe('calculateIntensity', () => {
    it('should return moderate intensity for normal user', () => {
      const intensity = ritualTrigger.calculateIntensity(mockContext);
      expect(intensity).toBe(RitualIntensity.MODERATE);
    });

    it('should increase intensity for high-level users', () => {
      mockContext.userLevel = 15;
      const intensity = ritualTrigger.calculateIntensity(mockContext);
      expect(intensity).toBeGreaterThan(RitualIntensity.MODERATE);
    });

    it('should respect user preference limits', () => {
      mockContext.preferences.ritualIntensity = RitualIntensity.SUBTLE;
      mockContext.userLevel = 20; // High level that would normally increase intensity
      
      const intensity = ritualTrigger.calculateIntensity(mockContext);
      expect(intensity).toBeLessThanOrEqual(RitualIntensity.SUBTLE);
    });

    it('should reduce intensity for low-performance devices', () => {
      mockContext.deviceCapabilities.performanceLevel = 'low';
      mockContext.userLevel = 20;
      
      const intensity = ritualTrigger.calculateIntensity(mockContext);
      expect(intensity).toBeLessThanOrEqual(RitualIntensity.MODERATE);
    });
  });

  describe('shouldActivate', () => {
    it('should activate when all conditions are met', () => {
      const loginAction: UserAction = {
        type: 'user_login',
        timestamp: Date.now(),
        userId: 'test-user-1',
        context: {}
      };

      const result = ritualTrigger.shouldActivate(mockUser, loginAction);
      expect(result).toBe(true);
    });

    it('should not activate for disabled ritual types', () => {
      mockUser.preferences.enabledRitualTypes = [RitualType.ACHIEVEMENT]; // 不包含 WELCOME
      
      const loginAction: UserAction = {
        type: 'user_login',
        timestamp: Date.now(),
        userId: 'test-user-1',
        context: {}
      };

      const result = ritualTrigger.shouldActivate(mockUser, loginAction);
      expect(result).toBe(false);
    });

    it('should not activate when animations are disabled and device does not support them', () => {
      mockUser.context.deviceCapabilities.supportsAnimation = false;
      
      const achievementAction: UserAction = {
        type: 'task_completed',
        timestamp: Date.now(),
        userId: 'test-user-1',
        context: {}
      };

      const result = ritualTrigger.shouldActivate(mockUser, achievementAction);
      expect(result).toBe(false);
    });

    it('should respect reduced motion preferences', () => {
      mockUser.preferences.reducedMotion = true;
      
      const achievementAction: UserAction = {
        type: 'task_completed',
        timestamp: Date.now(),
        userId: 'test-user-1',
        context: {}
      };

      const result = ritualTrigger.shouldActivate(mockUser, achievementAction);
      expect(result).toBe(false);
    });
  });

  describe('cooldown management', () => {
    it('should respect cooldown periods', () => {
      const loginAction: UserAction = {
        type: 'user_login',
        timestamp: Date.now(),
        userId: 'test-user-1',
        context: {}
      };

      // First trigger should work
      let result = ritualTrigger.detectRitualMoment(loginAction);
      expect(result).toBe(RitualType.WELCOME);
      
      ritualTrigger.recordTrigger('test-user-1', RitualType.WELCOME);

      // Second trigger immediately should be blocked by cooldown
      result = ritualTrigger.detectRitualMoment(loginAction);
      expect(result).toBeNull();
    });
  });

  describe('custom rules', () => {
    it('should allow adding custom trigger rules', () => {
      ritualTrigger.addTriggerRule({
        actionType: 'custom_action',
        conditions: [],
        ritualType: RitualType.CREATION,
        baseIntensity: RitualIntensity.EPIC
      });

      const customAction: UserAction = {
        type: 'custom_action',
        timestamp: Date.now(),
        userId: 'test-user-1',
        context: {}
      };

      const result = ritualTrigger.detectRitualMoment(customAction);
      expect(result).toBe(RitualType.CREATION);
    });

    it('should allow removing trigger rules', () => {
      // Remove the default login rule
      ritualTrigger.removeTriggerRule('user_login', RitualType.WELCOME);

      const loginAction: UserAction = {
        type: 'user_login',
        timestamp: Date.now(),
        userId: 'test-user-1',
        context: {}
      };

      const result = ritualTrigger.detectRitualMoment(loginAction);
      expect(result).toBeNull();
    });
  });
});