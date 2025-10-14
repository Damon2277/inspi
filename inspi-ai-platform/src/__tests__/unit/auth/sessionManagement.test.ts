/**
 * 会话管理并发测试
 * 测试会话管理的并发场景、竞态条件和状态一致性
 */

import { renderHook, act } from '@testing-library/react';

import { useAuthStore } from '@/shared/stores/authStore';
// Create a simple user fixture function
const createUserFixture = (overrides: any = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatar: null,
  subscription: 'free',
  ...overrides,
});

// Mock zustand persist
jest.mock('zustand/middleware', () => ({
  persist: (fn: any) => fn,
}));

describe('会话管理并发测试', () => {
  let mockUser: any;
  let mockSubscription: any;

  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      subscription: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });

    mockUser = createUserFixture({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    });

    mockSubscription = {
      plan: 'free' as const,
      status: 'active' as const,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      usage: {
        aiGenerations: 5,
        maxAiGenerations: 10,
        worksCreated: 3,
        maxWorksCreated: 5,
      },
    };
  });

  describe('并发登录测试', () => {
    it('应该处理同时多个登录请求', async () => {
      // Arrange
      const { result } = renderHook(() => useAuthStore());
      const tokens = ['token1', 'token2', 'token3'];
      const users = tokens.map((_, index) => ({
        ...mockUser,
        id: `user-${index}`,
        email: `user${index}@example.com`,
      }));

      // Act - 同时执行多个登录
      act(() => {
        tokens.forEach((token, index) => {
          result.current.login(token, users[index], mockSubscription);
        });
      });

      // Assert - 应该保持最后一次登录的状态
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBe('token3');
      expect(result.current(user?.id || (user as any)?._id)).toBe('user-2');
    });

    it('应该处理登录和登出的竞态条件', async () => {
      // Arrange
      const { result } = renderHook(() => useAuthStore());

      // Act - 快速连续的登录和登出
      act(() => {
        result.current.login('token1', mockUser, mockSubscription);
        result.current.logout();
        result.current.login('token2', mockUser, mockSubscription);
        result.current.logout();
        result.current.login('token3', mockUser, mockSubscription);
      });

      // Assert - 应该保持最后一次操作的状态
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBe('token3');
    });

    it('应该处理登录期间的用户信息更新', async () => {
      // Arrange
      const { result } = renderHook(() => useAuthStore());

      // Act - 登录后立即更新用户信息
      act(() => {
        result.current.login('token1', mockUser, mockSubscription);
        result.current.updateUser({ name: 'Updated Name' });
        result.current.updateUser({ email: 'updated@example.com' });
      });

      // Assert
      expect(result.current.user?.name).toBe('Updated Name');
      expect(result.current.user?.email).toBe('updated@example.com');
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('并发状态更新测试', () => {
    it('应该处理多个组件同时更新用户信息', async () => {
      // Arrange
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login('token1', mockUser, mockSubscription);
      });

      // Act - 模拟多个组件同时更新不同字段
      act(() => {
        result.current.updateUser({ name: 'Name from Component 1' });
        result.current.updateUser({ email: 'email@component2.com' });
        result.current.updateUser({ avatar: 'avatar-from-component3.jpg' });
      });

      // Assert - 所有更新都应该被应用
      expect(result.current.user?.name).toBe('Name from Component 1');
      expect(result.current.user?.email).toBe('email@component2.com');
      expect(result.current.user?.avatar).toBe('avatar-from-component3.jpg');
    });

    it('应该处理订阅信息的并发更新', async () => {
      // Arrange
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login('token1', mockUser, mockSubscription);
      });

      // Act - 并发更新订阅信息
      act(() => {
        result.current.updateSubscription({
          ...mockSubscription,
          plan: 'pro',
        });
        result.current.updateSubscription({
          ...mockSubscription,
          plan: 'super',
          usage: {
            aiGenerations: 50,
            maxAiGenerations: 100,
            worksCreated: 25,
            maxWorksCreated: 50,
          },
        });
      });

      // Assert - 应该保持最后一次更新
      expect(result.current.subscription?.plan).toBe('super');
      expect(result.current.subscription?.usage.aiGenerations).toBe(50);
    });

    it('应该处理加载状态的快速切换', async () => {
      // Arrange
      const { result } = renderHook(() => useAuthStore());

      // Act - 快速切换加载状态
      act(() => {
        result.current.setLoading(true);
        result.current.setLoading(false);
        result.current.setLoading(true);
        result.current.setLoading(false);
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('会话持久化测试', () => {
    it('应该处理存储和检索的并发操作', async () => {
      // Arrange
      const { result } = renderHook(() => useAuthStore());
      const operations = [];

      // Act - 模拟多个并发的存储操作
      for (let i = 0; i < 10; i++) {
        operations.push(
          act(() => {
            result.current.login(`token${i}`, {
              ...mockUser,
              id: `user-${i}`,
            }, mockSubscription);
          }),
        );
      }

      await Promise.all(operations);

      // Assert - 应该保持最后一次操作的状态
      expect(result.current.token).toBe('token9');
      expect(result.current.user?.id || (result.current.user as any)?._id).toBe('user-9');
    });

    it('应该处理存储失败的情况', async () => {
      // Arrange
      const { result } = renderHook(() => useAuthStore());

      // Mock localStorage to throw error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      // Act & Assert - 应该不抛出错误
      expect(() => {
        act(() => {
          result.current.login('token1', mockUser, mockSubscription);
        });
      }).not.toThrow();

      // Cleanup
      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('内存泄漏防护测试', () => {
    it('应该处理大量快速的状态更新', async () => {
      // Arrange
      const { result } = renderHook(() => useAuthStore());
      const initialMemory = process.memoryUsage().heapUsed;

      // Act - 执行大量状态更新
      for (let i = 0; i < 1000; i++) {
        act(() => {
          result.current.login(`token${i}`, {
            ...mockUser,
            id: `user-${i}`,
            name: `User ${i}`,
          }, mockSubscription);

          if (i % 2 === 0) {
            result.current.updateUser({ name: `Updated User ${i}` });
          }

          if (i % 3 === 0) {
            result.current.setLoading(true);
            result.current.setLoading(false);
          }
        });
      }

      // Assert - 内存使用应该在合理范围内
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 不应超过50MB
    });

    it('应该正确清理登出后的状态', async () => {
      // Arrange
      const { result } = renderHook(() => useAuthStore());

      // Act - 多次登录和登出
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.login(`token${i}`, {
            ...mockUser,
            id: `user-${i}`,
          }, mockSubscription);
          result.current.logout();
        });
      }

      // Assert - 状态应该被完全清理
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.subscription).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('状态一致性测试', () => {
    it('应该在并发操作中保持状态一致性', async () => {
      // Arrange
      const { result } = renderHook(() => useAuthStore());

      // Act - 复杂的并发操作序列
      act(() => {
        // 初始登录
        result.current.login('token1', mockUser, mockSubscription);

        // 同时进行多种操作
        result.current.setLoading(true);
        result.current.updateUser({ name: 'Concurrent Update' });
        result.current.updateSubscription({
          ...mockSubscription,
          plan: 'pro',
        });
        result.current.setLoading(false);
      });

      // Assert - 所有状态应该保持一致
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.name).toBe('Concurrent Update');
      expect(result.current.subscription?.plan).toBe('pro');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.token).toBe('token1');
    });

    it('应该在错误条件下保持状态一致性', async () => {
      // Arrange
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login('token1', mockUser, mockSubscription);
      });

      // Act - 尝试无效操作
      act(() => {
        result.current.updateUser(null as any);
        result.current.updateSubscription(undefined as any);
        result.current.setLoading(null as any);
      });

      // Assert - 状态应该保持有效
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).not.toBeNull();
      expect(result.current.token).toBe('token1');
    });
  });

  describe('竞态条件测试', () => {
    it('应该处理登录过程中的中断', async () => {
      // Arrange
      const { result } = renderHook(() => useAuthStore());

      // Act - 模拟登录过程中的中断
      act(() => {
        result.current.setLoading(true);
        result.current.login('token1', mockUser, mockSubscription);
        result.current.logout(); // 立即登出
        result.current.setLoading(false);
      });

      // Assert - 应该处于登出状态
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('应该处理多个组件同时检查认证状态', async () => {
      // Arrange
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login('token1', mockUser, mockSubscription);
      });

      // Act - 模拟多个组件同时读取状态
      const authChecks = Array(10).fill(null).map(() => ({
        isAuthenticated: result.current.isAuthenticated,
        user: result.current.user,
        token: result.current.token,
      }));

      // Assert - 所有检查应该返回一致的结果
      authChecks.forEach(check => {
        expect(check.isAuthenticated).toBe(true);
        expect(check(user?.id || (user as any)?._id)).toBe(mockUser.id);
        expect(check.token).toBe('token1');
      });
    });
  });

  describe('异步操作测试', () => {
    it('应该处理异步登录操作', async () => {
      // Arrange
      const { result } = renderHook(() => useAuthStore());

      // Act - 模拟异步登录
      const loginPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          act(() => {
            result.current.login('async-token', mockUser, mockSubscription);
          });
          resolve();
        }, 100);
      });

      act(() => {
        result.current.setLoading(true);
      });

      await loginPromise;

      act(() => {
        result.current.setLoading(false);
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBe('async-token');
      expect(result.current.isLoading).toBe(false);
    });

    it('应该处理异步操作的取消', async () => {
      // Arrange
      const { result } = renderHook(() => useAuthStore());
      let cancelled = false;

      // Act - 启动异步操作然后取消
      const asyncOperation = new Promise<void>((resolve) => {
        setTimeout(() => {
          if (!cancelled) {
            act(() => {
              result.current.login('cancelled-token', mockUser, mockSubscription);
            });
          }
          resolve();
        }, 100);
      });

      act(() => {
        result.current.setLoading(true);
      });

      // 取消操作
      cancelled = true;

      act(() => {
        result.current.logout();
        result.current.setLoading(false);
      });

      await asyncOperation;

      // Assert - 应该保持登出状态
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('边界条件测试', () => {
    it('应该处理极端的并发负载', async () => {
      // Arrange
      const { result } = renderHook(() => useAuthStore());
      const operations = [];

      // Act - 创建大量并发操作
      for (let i = 0; i < 1000; i++) {
        operations.push(
          new Promise<void>((resolve) => {
            setTimeout(() => {
              act(() => {
                if (i % 4 === 0) {
                  result.current.login(`token${i}`, {
                    ...mockUser,
                    id: `user-${i}`,
                  }, mockSubscription);
                } else if (i % 4 === 1) {
                  result.current.updateUser({ name: `User ${i}` });
                } else if (i % 4 === 2) {
                  result.current.setLoading(i % 2 === 0);
                } else {
                  result.current.logout();
                }
              });
              resolve();
            }, Math.random() * 10);
          }),
        );
      }

      await Promise.all(operations);

      // Assert - 状态应该仍然有效
      expect(typeof result.current.isAuthenticated).toBe('boolean');
      expect(typeof result.current.isLoading).toBe('boolean');
    });

    it('应该处理状态快照的一致性', async () => {
      // Arrange
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login('snapshot-token', mockUser, mockSubscription);
      });

      // Act - 获取多个状态快照
      const snapshots = [];
      for (let i = 0; i < 100; i++) {
        snapshots.push({
          isAuthenticated: result.current.isAuthenticated,
          user: result.current.user,
          token: result.current.token,
          timestamp: Date.now(),
        });
      }

      // Assert - 所有快照应该一致
      const firstSnapshot = snapshots[0];
      snapshots.forEach(snapshot => {
        expect(snapshot.isAuthenticated).toBe(firstSnapshot.isAuthenticated);
        expect(snapshot(user?.id || (user as any)?._id)).toBe(firstSnapshot(user?.id || (user as any)?._id));
        expect(snapshot.token).toBe(firstSnapshot.token);
      });
    });
  });
});
