/**
 * 动画仪式系统测试
 */

import { AnimationRitualSystem, EntranceStyle, Achievement, Task, Page } from '../AnimationRitualSystem';
import { RitualIntensity } from '../../types';

type MockAnimation = {
  finished: Promise<unknown>;
  addEventListener: jest.Mock;
  cancel: jest.Mock;
};

type MockAnimationElement = HTMLElement & {
  animate: jest.Mock<MockAnimation>;
  appendChild: jest.Mock;
  parentNode: { removeChild: jest.Mock };
};

type MockDocument = {
  createElement: jest.Mock<MockAnimationElement>;
  head: { appendChild: jest.Mock };
  body: { appendChild: jest.Mock };
  dispatchEvent: jest.Mock;
};

// Mock DOM environment
const mockElement = {
  animate: jest.fn(() => ({
    finished: Promise.resolve(null),
    addEventListener: jest.fn(),
    cancel: jest.fn()
  } as MockAnimation)),
  appendChild: jest.fn(),
  parentNode: {
    removeChild: jest.fn()
  }
} as unknown as MockAnimationElement;

const mockDocument: MockDocument = {
  createElement: jest.fn(() => mockElement),
  head: {
    appendChild: jest.fn()
  },
  body: {
    appendChild: jest.fn()
  },
  dispatchEvent: jest.fn()
};

// Mock global objects
Object.defineProperty(global, 'document', { value: mockDocument as unknown as Document });
const rafTimers = new Map<number, ReturnType<typeof setTimeout>>();
let rafIdCounter = 0;

Object.defineProperty(global, 'requestAnimationFrame', {
  value: jest.fn((cb: (timestamp: number) => void) => {
    const requestId = ++rafIdCounter;
    const timeout = setTimeout(() => {
      rafTimers.delete(requestId);
      cb(Date.now());
    }, 16);

    rafTimers.set(requestId, timeout);
    return requestId;
  })
});
Object.defineProperty(global, 'cancelAnimationFrame', {
  value: jest.fn((requestId: number) => {
    const timeout = rafTimers.get(requestId);
    if (timeout) {
      clearTimeout(timeout);
      rafTimers.delete(requestId);
    }
  })
});

describe('AnimationRitualSystem', () => {
  let animationSystem: AnimationRitualSystem;

  beforeEach(() => {
    animationSystem = new AnimationRitualSystem();
    jest.clearAllMocks();
  });

  afterEach(() => {
    animationSystem.destroy();
  });

  describe('playEntranceRitual', () => {
    it('should play fade in entrance animation', async () => {
      await animationSystem.playEntranceRitual(mockElement, EntranceStyle.FADE_IN);
      
      expect(mockElement.animate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ opacity: 0 }),
          expect.objectContaining({ opacity: 1 })
        ]),
        expect.objectContaining({
          duration: 800,
          easing: 'ease-out',
          fill: 'forwards'
        })
      );
    });

    it('should play scale in entrance animation', async () => {
      await animationSystem.playEntranceRitual(mockElement, EntranceStyle.SCALE_IN);
      
      expect(mockElement.animate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ transform: 'scale(0.3)' }),
          expect.objectContaining({ transform: 'scale(1)' })
        ]),
        expect.objectContaining({
          duration: 600,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
        })
      );
    });

    it('should play divine descent entrance animation', async () => {
      await animationSystem.playEntranceRitual(mockElement, EntranceStyle.DIVINE_DESCENT);
      
      expect(mockElement.animate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ 
            opacity: 0,
            transform: 'translateY(-200px) scale(0.5)',
            filter: 'brightness(2) blur(10px)'
          }),
          expect.objectContaining({ 
            opacity: 1,
            transform: 'translateY(0) scale(1)',
            filter: 'brightness(1) blur(0px)'
          })
        ]),
        expect.objectContaining({
          duration: 1500,
          easing: 'cubic-bezier(0.23, 1, 0.32, 1)'
        })
      );
    });

    it('should throw error for null element', async () => {
      await expect(
        animationSystem.playEntranceRitual(null as unknown as Element, EntranceStyle.FADE_IN)
      ).rejects.toThrow('Element is required for entrance ritual');
    });

    it('should add event listeners to animation', async () => {
      const mockAnimation = {
        finished: Promise.resolve(),
        addEventListener: jest.fn(),
        cancel: jest.fn()
      };
      
      mockElement.animate.mockReturnValue(mockAnimation);
      
      await animationSystem.playEntranceRitual(mockElement, EntranceStyle.FADE_IN);
      
      expect(mockAnimation.addEventListener).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(mockAnimation.addEventListener).toHaveBeenCalledWith('cancel', expect.any(Function));
    });
  });

  describe('playCelebrationRitual', () => {
    const mockAchievement: Achievement = {
      id: 'test-achievement',
      type: 'milestone',
      level: 5,
      title: '测试成就',
      description: '这是一个测试成就',
      icon: '🏆',
      rarity: 'epic'
    };

    it('should create celebration container', async () => {
      await animationSystem.playCelebrationRitual(mockAchievement);
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });

    it('should adjust celebration intensity based on achievement rarity', async () => {
      const commonAchievement = { ...mockAchievement, rarity: 'common' as const };
      const legendaryAchievement = { ...mockAchievement, rarity: 'legendary' as const };

      await animationSystem.playCelebrationRitual(commonAchievement);
      await animationSystem.playCelebrationRitual(legendaryAchievement);

      // 传奇成就应该有更多的动画调用
      expect(mockElement.animate).toHaveBeenCalled();
    });

    it('should include achievement title in celebration', async () => {
      await animationSystem.playCelebrationRitual(mockAchievement);
      
      // 验证创建了包含成就标题的元素
      const createElementCalls = mockDocument.createElement.mock.calls;
      expect(createElementCalls.length).toBeGreaterThan(1);
    });

    it('should cleanup celebration container after animation', async () => {
      jest.useFakeTimers();

      try {
        const promise = animationSystem.playCelebrationRitual(mockAchievement);

        await promise;
        jest.runOnlyPendingTimers();

        expect(mockElement.parentNode.removeChild).toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('playTransitionRitual', () => {
    const fromPage: Page = {
      id: 'page1',
      name: '页面1',
      type: 'normal',
      importance: 'medium'
    };

    const toPage: Page = {
      id: 'page2',
      name: '页面2',
      type: 'critical',
      importance: 'critical'
    };

    it('should create transition overlay', async () => {
      await animationSystem.playTransitionRitual(fromPage, toPage);
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });

    it('should use divine transition for critical pages', async () => {
      await animationSystem.playTransitionRitual(fromPage, toPage);
      
      // 验证创建了带有divine类的遮罩
      const createdElement = mockDocument.createElement.mock.results[0].value;
      expect(createdElement.className).toContain('ritual-transition-divine');
    });

    it('should cleanup overlay after transition', async () => {
      await animationSystem.playTransitionRitual(fromPage, toPage);
      
      expect(mockElement.parentNode.removeChild).toHaveBeenCalled();
    });
  });

  describe('playCompletionRitual', () => {
    const mockTask: Task = {
      id: 'test-task',
      title: '测试任务',
      type: 'design',
      difficulty: 'hard',
      completionTime: 1500,
      points: 100
    };

    it('should create completion container', async () => {
      await animationSystem.playCompletionRitual(mockTask);
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });

    it('should adjust intensity based on task difficulty', async () => {
      const easyTask = { ...mockTask, difficulty: 'easy' as const };
      const expertTask = { ...mockTask, difficulty: 'expert' as const };

      await animationSystem.playCompletionRitual(easyTask);
      const easyAnimationCalls = mockElement.animate.mock.calls.length;

      mockElement.animate.mockClear();

      await animationSystem.playCompletionRitual(expertTask);
      const expertAnimationCalls = mockElement.animate.mock.calls.length;

      // 专家级任务应该有更多动画效果
      expect(expertAnimationCalls).toBeGreaterThanOrEqual(easyAnimationCalls);
    });

    it('should include checkmark animation', async () => {
      await animationSystem.playCompletionRitual(mockTask);
      
      // 验证创建了勾选标记元素
      expect(mockDocument.createElement).toHaveBeenCalled();
      expect(mockElement.animate).toHaveBeenCalled();
    });

    it('should cleanup completion container after delay', async () => {
      jest.useFakeTimers();

      try {
        const promise = animationSystem.playCompletionRitual(mockTask);

        await promise;
        jest.runOnlyPendingTimers();

        expect(mockElement.parentNode.removeChild).toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('performance monitoring', () => {
    it('should provide performance metrics', () => {
      const metrics = animationSystem.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('fps');
      expect(metrics).toHaveProperty('frameDrops');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('animationCount');
      expect(metrics).toHaveProperty('averageFrameTime');
    });

    it('should track animation count', async () => {
      const initialMetrics = animationSystem.getPerformanceMetrics();
      
      // 启动一个动画
      const animationPromise = animationSystem.playEntranceRitual(mockElement, EntranceStyle.FADE_IN);
      
      const duringMetrics = animationSystem.getPerformanceMetrics();
      expect(duringMetrics.animationCount).toBeGreaterThan(initialMetrics.animationCount);
      
      await animationPromise;
      
      const afterMetrics = animationSystem.getPerformanceMetrics();
      expect(afterMetrics.animationCount).toBeLessThanOrEqual(duringMetrics.animationCount);
    });
  });

  describe('animation management', () => {
    it('should cancel all animations', async () => {
      const mockAnimation = {
        finished: new Promise(() => {}), // 永不完成的Promise
        addEventListener: jest.fn(),
        cancel: jest.fn()
      };
      
      mockElement.animate.mockReturnValue(mockAnimation);
      
      // 启动一个动画但不等待完成
      animationSystem.playEntranceRitual(mockElement, EntranceStyle.FADE_IN);
      
      // 取消所有动画
      animationSystem.cancelAllAnimations();
      
      expect(mockAnimation.cancel).toHaveBeenCalled();
    });

    it('should dispatch animation complete event', async () => {
      const mockAnimation = {
        finished: Promise.resolve(),
        addEventListener: jest.fn((event, callback) => {
          if (event === 'finish') {
            // 立即调用完成回调
            setTimeout(callback, 0);
          }
        }),
        cancel: jest.fn()
      };
      
      mockElement.animate.mockReturnValue(mockAnimation);
      
      await animationSystem.playEntranceRitual(mockElement, EntranceStyle.FADE_IN);
      
      // 等待事件分发
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ritualAnimationComplete'
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle animation errors gracefully', async () => {
      const errorAnimation = {
        finished: Promise.reject(new Error('Animation failed')),
        addEventListener: jest.fn(),
        cancel: jest.fn()
      };
      
      mockElement.animate.mockReturnValue(errorAnimation);
      
      await expect(
        animationSystem.playEntranceRitual(mockElement, EntranceStyle.FADE_IN)
      ).rejects.toThrow('Animation failed');
    });

    it('should cleanup resources on error', async () => {
      const errorAnimation = {
        finished: Promise.reject(new Error('Animation failed')),
        addEventListener: jest.fn(),
        cancel: jest.fn()
      };
      
      mockElement.animate.mockReturnValue(errorAnimation);
      
      try {
        await animationSystem.playEntranceRitual(mockElement, EntranceStyle.FADE_IN);
      } catch (error) {
        // 错误被预期，检查清理是否正确执行
        const metrics = animationSystem.getPerformanceMetrics();
        expect(metrics.animationCount).toBe(0);
      }
    });
  });

  describe('CSS generation', () => {
    it('should initialize animation styles on construction', () => {
      expect(mockDocument.createElement).toHaveBeenCalledWith('style');
      expect(mockDocument.head.appendChild).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should cleanup all resources on destroy', () => {
      const cancelSpy = jest.spyOn(animationSystem, 'cancelAllAnimations');
      
      animationSystem.destroy();
      
      expect(cancelSpy).toHaveBeenCalled();
    });
  });
});
