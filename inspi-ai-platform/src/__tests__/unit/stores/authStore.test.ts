/**
 * authStore 状态管理单元测试
 */

import { renderHook, act } from '@testing-library/react';

import { useAuthStore } from '@/shared/stores/authStore';

import { createUserFixture, createMockUser } from '@/fixtures';

// Mock zustand persist
jest.mock('zustand/middleware', () => ({
  persist: (fn: any) => fn,
}));

// Mock types
const mockUser = createUserFixture({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  subscription: 'free',
});

const mockSubscription = {
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

describe('authStore', () => {
  beforeEach(() => {
    // 重置store状态
    useAuthStore.setState({
      user: null,
      subscription: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  describe('初始状态', () => {
    test('应该有正确的初始状态', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.subscription).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('login 操作', () => {
    test('应该正确设置登录状态', () => {
      const { result } = renderHook(() => useAuthStore());
      const token = 'test-token-123';

      act(() => {
        result.current.login(token, mockUser, mockSubscription);
      });

      expect(result.current.token).toBe(token);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.subscription).toEqual(mockSubscription);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    test('应该覆盖之前的登录状态', () => {
      const { result } = renderHook(() => useAuthStore());

      // 第一次登录
      act(() => {
        result.current.login('token1', mockUser, mockSubscription);
      });

      // 第二次登录
      const newUser = createUserFixture({
        id: 'user-456',
        email: 'new@example.com',
        name: 'New User',
      });
      const newToken = 'new-token-456';

      act(() => {
        result.current.login(newToken, newUser, mockSubscription);
      });

      expect(result.current.token).toBe(newToken);
      expect(result.current.user).toEqual(newUser);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('logout 操作', () => {
    test('应该清除所有认证状态', () => {
      const { result } = renderHook(() => useAuthStore());

      // 先登录
      act(() => {
        result.current.login('test-token', mockUser, mockSubscription);
      });

      expect(result.current.isAuthenticated).toBe(true);

      // 然后登出
      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.subscription).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    test('应该能够多次调用logout而不出错', () => {
      const { result } = renderHook(() => useAuthStore());

      // 多次调用logout
      act(() => {
        result.current.logout();
        result.current.logout();
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('updateUser 操作', () => {
    test('应该更新用户信息', () => {
      const { result } = renderHook(() => useAuthStore());

      // 先登录
      act(() => {
        result.current.login('test-token', mockUser, mockSubscription);
      });

      // 更新用户信息
      const updates = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      act(() => {
        result.current.updateUser(updates);
      });

      expect(result.current.user).toEqual({
        ...mockUser,
        ...updates,
      });
      expect(result.current.isAuthenticated).toBe(true); // 应该保持登录状态
    });

    test('应该部分更新用户信息', () => {
      const { result } = renderHook(() => useAuthStore());

      // 先登录
      act(() => {
        result.current.login('test-token', mockUser, mockSubscription);
      });

      // 只更新名字
      act(() => {
        result.current.updateUser({ name: 'New Name Only' });
      });

      expect(result.current.user?.name).toBe('New Name Only');
      expect(result.current.user?.email).toBe(mockUser.email); // 其他字段保持不变
    });

    test('当用户未登录时不应该更新', () => {
      const { result } = renderHook(() => useAuthStore());

      // 未登录状态下尝试更新
      act(() => {
        result.current.updateUser({ name: 'Should Not Update' });
      });

      expect(result.current.user).toBeNull();
    });

    test('应该处理空的更新对象', () => {
      const { result } = renderHook(() => useAuthStore());

      // 先登录
      act(() => {
        result.current.login('test-token', mockUser, mockSubscription);
      });

      const originalUser = result.current.user;

      // 空更新
      act(() => {
        result.current.updateUser({});
      });

      expect(result.current.user).toEqual(originalUser);
    });
  });

  describe('updateSubscription 操作', () => {
    test('应该更新订阅信息', () => {
      const { result } = renderHook(() => useAuthStore());

      // 先登录
      act(() => {
        result.current.login('test-token', mockUser, mockSubscription);
      });

      // 更新订阅
      const newSubscription = {
        ...mockSubscription,
        plan: 'pro' as const,
        usage: {
          aiGenerations: 15,
          maxAiGenerations: 100,
          worksCreated: 8,
          maxWorksCreated: 50,
        },
      };

      act(() => {
        result.current.updateSubscription(newSubscription);
      });

      expect(result.current.subscription).toEqual(newSubscription);
      expect(result.current.user).toEqual(mockUser); // 用户信息不变
    });

    test('应该能够在未登录时更新订阅', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.updateSubscription(mockSubscription);
      });

      expect(result.current.subscription).toEqual(mockSubscription);
      expect(result.current.user).toBeNull();
    });
  });

  describe('setLoading 操作', () => {
    test('应该设置加载状态', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    test('应该不影响其他状态', () => {
      const { result } = renderHook(() => useAuthStore());

      // 先登录
      act(() => {
        result.current.login('test-token', mockUser, mockSubscription);
      });

      const originalState = {
        user: result.current.user,
        subscription: result.current.subscription,
        token: result.current.token,
        isAuthenticated: result.current.isAuthenticated,
      };

      // 设置加载状态
      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toEqual(originalState.user);
      expect(result.current.subscription).toEqual(originalState.subscription);
      expect(result.current.token).toBe(originalState.token);
      expect(result.current.isAuthenticated).toBe(originalState.isAuthenticated);
    });
  });

  describe('状态一致性', () => {
    test('登录后isAuthenticated应该与token状态一致', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login('test-token', mockUser, mockSubscription);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBeTruthy();

      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();
    });

    test('应该保持状态的不可变性', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login('test-token', mockUser, mockSubscription);
      });

      const originalUser = result.current.user;

      // 尝试直接修改用户对象（这不应该影响store）
      if (originalUser) {
        (originalUser as any).name = 'Hacked Name';
      }

      // Store中的用户信息应该保持不变
      expect(result.current.user?.name).toBe(mockUser.name);
    });
  });

  describe('边界情况', () => {
    test('应该处理null/undefined值', () => {
      const { result } = renderHook(() => useAuthStore());

      // 使用null值登录
      act(() => {
        result.current.login('', null as any, null as any);
      });

      expect(result.current.token).toBe('');
      expect(result.current.user).toBeNull();
      expect(result.current.subscription).toBeNull();
      expect(result.current.isAuthenticated).toBe(true); // 仍然设置为已认证
    });

    test('应该处理空字符串token', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login('', mockUser, mockSubscription);
      });

      expect(result.current.token).toBe('');
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('并发操作', () => {
    test('应该正确处理快速连续的操作', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setLoading(true);
        result.current.login('token1', mockUser, mockSubscription);
        result.current.updateUser({ name: 'Updated Name' });
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.name).toBe('Updated Name');
    });

    test('应该正确处理登录后立即登出', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login('test-token', mockUser, mockSubscription);
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });
  });
});
